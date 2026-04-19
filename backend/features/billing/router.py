"""
Billing router — endpoints de pago con Stripe.

POST /billing/checkout  → genera URL de Stripe Checkout (admin)
GET  /billing/portal    → genera URL del Customer Portal (admin)
GET  /billing/status    → estado de suscripción del taller (admin)
POST /billing/webhook   → recibe eventos de Stripe (sin auth, firmado con HMAC)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import Tenant, User

from .schemas import (
    BillingStatusResponse,
    CheckoutRequest,
    CheckoutResponse,
    PortalResponse,
)
from .service import create_checkout_session, create_portal_session, handle_webhook

router = APIRouter(prefix="/billing", tags=["billing"])

_PLAN_TO_PRICE = {
    "starter": settings.stripe_price_starter,
    "pro": settings.stripe_price_pro,
}


def _get_tenant(db: Session, user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return tenant


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    Genera una URL de Stripe Checkout para suscribir el taller al plan elegido.
    Solo el admin puede iniciar el proceso de pago.
    El frontend redirige al usuario a checkout_url.
    """
    price_id = _PLAN_TO_PRICE.get(body.plan)
    if not price_id:
        raise HTTPException(
            status_code=400, detail="Plan no válido. Usa 'starter' o 'pro'"
        )

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Pagos no configurados. Contacta con soporte.",
        )

    tenant = _get_tenant(db, current_user)

    success_url = f"{settings.frontend_url}/app?subscription=success"
    cancel_url = f"{settings.frontend_url}/trial-expirado?cancelled=1"

    try:
        url = create_checkout_session(
            tenant=tenant,
            admin_email=current_user.email,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return CheckoutResponse(checkout_url=url)


@router.get("/portal", response_model=PortalResponse)
def billing_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    Genera una URL del Customer Portal de Stripe.
    El admin puede ver facturas, cambiar método de pago o cancelar la suscripción.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Pagos no configurados")

    tenant = _get_tenant(db, current_user)
    return_url = f"{settings.frontend_url}/app/admin"

    try:
        url = create_portal_session(tenant=tenant, return_url=return_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return PortalResponse(portal_url=url)


@router.get("/status", response_model=BillingStatusResponse)
def billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Estado de suscripción del taller — para mostrar en el panel de admin."""
    tenant = _get_tenant(db, current_user)
    return BillingStatusResponse(
        plan=tenant.plan,
        subscription_status=tenant.subscription_status,
        stripe_customer_id=tenant.stripe_customer_id,
        trial_expires_at=(
            tenant.trial_expires_at.isoformat() if tenant.trial_expires_at else None
        ),
    )


@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recibe eventos de Stripe — NO requiere autenticación JWT.
    La seguridad viene de la firma HMAC que Stripe incluye en el header.
    IMPORTANTE: leer el body como bytes RAW para que la verificación de firma funcione.
    Si lees el body como JSON, la firma no coincide y Stripe rechaza el evento.
    """
    raw_body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Falta header stripe-signature")

    try:
        result = handle_webhook(raw_body=raw_body, sig_header=sig_header, db=db)
    except ValueError as exc:
        # Firma inválida → 400 para que Stripe no reintente
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {"received": True, **result}
