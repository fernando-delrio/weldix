"""
Billing service — integración con Stripe.

Flujo de vida de una suscripción:
  1. Admin hace POST /billing/checkout → recibe checkout_url
  2. Stripe redirige al admin a su checkout page
  3. Admin paga → Stripe dispara webhook checkout.session.completed
  4. Nosotros activamos el plan en la BD
  5. Si cancela → customer.subscription.deleted → volvemos a trial/locked

El webhook es la fuente de verdad: nunca activar un plan sin confirmación de Stripe.
"""

from datetime import datetime, timezone

import stripe

from backend.core.config import settings
from backend.features.auth.model import Tenant

# Mapa de price_id → nombre de plan interno
_PRICE_TO_PLAN = {
    settings.stripe_price_starter: "starter",
    settings.stripe_price_pro: "pro",
}

# Mapa de subscription_status de Stripe → si el taller puede operar
_ACTIVE_STATUSES = {"active", "trialing"}


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
    Si no existe todavía, lo crea en Stripe y lo guarda en el tenant.
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
    price_id: str,
    success_url: str,
    cancel_url: str,
    db,
) -> str:
    """
    Crea una sesión de Stripe Checkout y devuelve la URL a la que redirigir al admin.
    El admin completa el pago en la página de Stripe — nosotros no tocamos la tarjeta.
    """
    if price_id not in _PRICE_TO_PLAN:
        raise ValueError("Plan no válido")

    _stripe_client()
    customer_id = _get_or_create_customer(tenant, admin_email)
    db.commit()  # persistir stripe_customer_id si es nuevo

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"tenant_id": str(tenant.id)},
        subscription_data={
            "metadata": {"tenant_id": str(tenant.id)},
            # Si tiene trial activo, propagar los días restantes a Stripe
            "trial_end": (
                int(tenant.trial_expires_at.timestamp())
                if tenant.trial_expires_at
                and tenant.trial_expires_at > datetime.now(timezone.utc)
                else "now"
            ),
        },
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
    Procesa un evento de Stripe verificando la firma del webhook.
    Devuelve {"handled": True/False, "event_type": str}.

    Eventos que gestionamos:
      - checkout.session.completed      → suscripción creada, activar plan
      - customer.subscription.updated   → cambio de plan o estado
      - customer.subscription.deleted   → cancelación, degradar a locked
      - invoice.payment_failed          → marcar como past_due
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
    elif event_type in (
        "customer.subscription.updated",
        "customer.subscription.created",
    ):
        _on_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        _on_subscription_deleted(data, db)
    elif event_type == "invoice.payment_failed":
        _on_payment_failed(data, db)
    else:
        return {"handled": False, "event_type": event_type}

    return {"handled": True, "event_type": event_type}


def _resolve_tenant(
    db, customer_id: str | None, tenant_id_meta: str | None
) -> Tenant | None:
    """Busca el tenant por stripe_customer_id o por metadata.tenant_id."""
    from backend.features.auth.model import Tenant

    if customer_id:
        tenant = (
            db.query(Tenant).filter(Tenant.stripe_customer_id == customer_id).first()
        )
        if tenant:
            return tenant

    if tenant_id_meta:
        try:
            return db.query(Tenant).filter(Tenant.id == int(tenant_id_meta)).first()
        except (ValueError, TypeError):
            return None

    return None


def _on_checkout_completed(session: dict, db) -> None:
    tenant_id_meta = (session.get("metadata") or {}).get("tenant_id")
    customer_id = session.get("customer")

    tenant = _resolve_tenant(db, customer_id, tenant_id_meta)
    if not tenant:
        return

    # Asociar customer_id si llegó por metadata
    if customer_id and not tenant.stripe_customer_id:
        tenant.stripe_customer_id = customer_id

    # Activar suscripción — el precio viene en subscription line_items
    price_id = _extract_price_from_session(session)
    tenant.plan = _PRICE_TO_PLAN.get(price_id, "starter")
    tenant.subscription_status = "active"
    tenant.trial_expires_at = None  # plan pagado: sin restricción de trial
    db.commit()


def _on_subscription_updated(subscription: dict, db) -> None:
    customer_id = subscription.get("customer")
    tenant_id_meta = (subscription.get("metadata") or {}).get("tenant_id")

    tenant = _resolve_tenant(db, customer_id, tenant_id_meta)
    if not tenant:
        return

    stripe_status = subscription.get("status", "")
    tenant.subscription_status = stripe_status

    if stripe_status in _ACTIVE_STATUSES:
        # Detectar cambio de plan por los items de la suscripción
        items = subscription.get("items", {}).get("data", [])
        if items:
            price_id = items[0].get("price", {}).get("id")
            tenant.plan = _PRICE_TO_PLAN.get(price_id, tenant.plan)
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
    # No restauramos trial_expires_at — el taller queda bloqueado hasta que vuelva a pagar
    db.commit()


def _on_payment_failed(invoice: dict, db) -> None:
    customer_id = invoice.get("customer")
    tenant = _resolve_tenant(db, customer_id, None)
    if not tenant:
        return

    tenant.subscription_status = "past_due"
    db.commit()


def _extract_price_from_session(session: dict) -> str | None:
    """
    Extrae el price_id de la checkout session.
    La session no incluye line_items directamente — hay que buscarlo en
    session.line_items cuando se expanda, o usar el subscription si ya existe.
    Fallback: devolvemos el price_starter como default.
    """
    # Si ya tenemos subscription_id podemos resolver más tarde vía webhook de subscription
    # Por ahora usamos starter como default si no hay información
    return settings.stripe_price_starter
