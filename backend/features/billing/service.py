"""
Billing service — integración con Stripe.

Modelo de precios: base fija (49€/mes) + por operario (17€/operario/mes).
El backend cuenta los operarios del tenant en el momento del checkout.

Flujo de vida:
  1. Admin hace POST /billing/checkout → recibe checkout_url
  2. Stripe redirige al admin a su checkout page
  3. Admin paga → Stripe dispara webhook checkout.session.completed
  4. Nosotros activamos el plan en la BD
  5. Si cancela → customer.subscription.deleted → volvemos a trial/locked
"""

from datetime import datetime, timezone

import stripe

from backend.core.config import settings
from backend.core.webhooks import fire_webhook
from backend.features.auth.model import Tenant


def _stripe_client():
    if not settings.stripe_secret_key:
        raise RuntimeError(
            "STRIPE_SECRET_KEY no configurado. Añádelo al .env para usar pagos."
        )
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _get_or_create_customer(tenant: Tenant, admin_email: str) -> str:
    """
    Devuelve el stripe_customer_id del tenant.
    Si no existe, lo crea en Stripe y lo guarda en el tenant.
    No persiste en BD — el caller hace el commit.
    """
    if tenant.stripe_customer_id:
        return tenant.stripe_customer_id

    _stripe_client()
    customer = stripe.Customer.create(
        email=admin_email,
        name=tenant.nombre,
        metadata={"tenant_id": str(tenant.id), "tenant_slug": tenant.slug},
    )
    tenant.stripe_customer_id = customer.id
    return customer.id


def create_checkout_session(
    tenant: Tenant,
    admin_email: str,
    num_seats: int,
    success_url: str,
    cancel_url: str,
    db,
) -> str:
    """
    Crea una sesión de Stripe Checkout con dos line items:
      - Tarifa base (49€/mes × 1)
      - Por operario (17€/mes × num_seats)
    Devuelve la URL a la que redirigir al admin.
    """
    if not settings.stripe_price_base or not settings.stripe_price_per_seat:
        raise RuntimeError(
            "STRIPE_PRICE_BASE y STRIPE_PRICE_PER_SEAT no configurados en .env"
        )

    _stripe_client()
    customer_id = _get_or_create_customer(tenant, admin_email)
    db.commit()  # persistir stripe_customer_id si es nuevo

    # Normalizamos a UTC-aware: en Postgres la columna es TIMESTAMPTZ (aware) y
    # comparar con un datetime naive lanza TypeError → 500 justo en el checkout.
    trial_dt = tenant.trial_expires_at
    if trial_dt is not None and trial_dt.tzinfo is None:
        trial_dt = trial_dt.replace(tzinfo=timezone.utc)
    has_active_trial = trial_dt is not None and trial_dt > datetime.now(timezone.utc)
    subscription_data: dict = {"metadata": {"tenant_id": str(tenant.id)}}
    if has_active_trial and trial_dt is not None:
        subscription_data["trial_end"] = int(trial_dt.timestamp())

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[
            # Tarifa base fija — siempre 1 unidad
            {"price": settings.stripe_price_base, "quantity": 1},
            # Por operario — tantos como tenga el taller ahora mismo
            {"price": settings.stripe_price_per_seat, "quantity": max(1, num_seats)},
        ],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tenant_id": str(tenant.id)},
        subscription_data=subscription_data,
        allow_promotion_codes=True,
    )
    return session.url


def create_portal_session(tenant: Tenant, return_url: str) -> str:
    """
    Crea una sesión del Customer Portal de Stripe.
    El admin puede ver facturas, cambiar método de pago o cancelar desde ahí.
    """
    if not tenant.stripe_customer_id:
        raise ValueError("Este taller aún no tiene una suscripción activa en Stripe.")

    _stripe_client()
    session = stripe.billing_portal.Session.create(
        customer=tenant.stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def handle_webhook(raw_body: bytes, sig_header: str, db) -> dict:
    """
    Procesa un evento de Stripe verificando la firma HMAC del webhook.
    """
    if not settings.stripe_webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET no configurado")

    _stripe_client()
    try:
        event = stripe.Webhook.construct_event(
            raw_body, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise ValueError("Firma del webhook inválida")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _on_checkout_completed(data, db)
    elif event_type in ("customer.subscription.updated", "customer.subscription.created"):
        _on_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        _on_subscription_deleted(data, db)
    elif event_type == "invoice.payment_failed":
        _on_payment_failed(data, db)
    else:
        return {"handled": False, "event_type": event_type}

    return {"handled": True, "event_type": event_type}


def _resolve_tenant(db, customer_id: str | None, tenant_id_meta: str | None) -> Tenant | None:
    from backend.features.auth.model import Tenant as T

    if customer_id:
        tenant = db.query(T).filter(T.stripe_customer_id == customer_id).first()
        if tenant:
            return tenant
    if tenant_id_meta:
        try:
            return db.query(T).filter(T.id == int(tenant_id_meta)).first()
        except (ValueError, TypeError):
            return None
    return None


def _on_checkout_completed(session: dict, db) -> None:
    tenant_id_meta = (session.get("metadata") or {}).get("tenant_id")
    customer_id = session.get("customer")
    tenant = _resolve_tenant(db, customer_id, tenant_id_meta)
    if not tenant:
        return

    if customer_id and not tenant.stripe_customer_id:
        tenant.stripe_customer_id = customer_id

    tenant.plan = "active"
    tenant.subscription_status = "active"
    tenant.trial_expires_at = None
    db.commit()


def _on_subscription_updated(subscription: dict, db) -> None:
    customer_id = subscription.get("customer")
    tenant_id_meta = (subscription.get("metadata") or {}).get("tenant_id")
    tenant = _resolve_tenant(db, customer_id, tenant_id_meta)
    if not tenant:
        return

    stripe_status = subscription.get("status", "")
    tenant.subscription_status = stripe_status

    if stripe_status in {"active", "trialing"}:
        tenant.plan = "active"
        tenant.trial_expires_at = None

    db.commit()


def _on_subscription_deleted(subscription: dict, db) -> None:
    customer_id = subscription.get("customer")
    tenant_id_meta = (subscription.get("metadata") or {}).get("tenant_id")
    tenant = _resolve_tenant(db, customer_id, tenant_id_meta)
    if not tenant:
        return

    tenant.plan = "trial"
    tenant.subscription_status = "canceled"
    db.commit()

    # Aviso interno (Discord vía n8n) -- un cliente que cancela merece un
    # contacto personal, no solo un cambio de estado silencioso en la BD.
    fire_webhook(
        "suscripcion_cancelada",
        {"tenant_id": tenant.id, "tenant_nombre": tenant.nombre},
    )


def _on_payment_failed(invoice: dict, db) -> None:
    customer_id = invoice.get("customer")
    tenant = _resolve_tenant(db, customer_id, None)
    if not tenant:
        return

    tenant.subscription_status = "past_due"
    db.commit()

    fire_webhook(
        "pago_fallido",
        {"tenant_id": tenant.id, "tenant_nombre": tenant.nombre},
    )
