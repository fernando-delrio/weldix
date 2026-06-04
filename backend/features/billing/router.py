"""
Billing router — endpoints de pago con Stripe.

POST /billing/checkout  → genera URL de Stripe Checkout (admin)
GET  /billing/portal    → genera URL del Customer Portal (admin)
GET  /billing/status    → estado de suscripción + precio calculado (admin)
POST /billing/webhook   → recibe eventos de Stripe (sin auth, firmado con HMAC)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import Tenant, User

from .schemas import (
    PRECIO_BASE,
    PRECIO_POR_OPERARIO,
    BillingStatusResponse,
    CheckoutResponse,
    PortalResponse,
)
from .service import create_checkout_session, create_portal_session, handle_webhook

router = APIRouter(prefix="/billing", tags=["billing"])


def _get_tenant(db: Session, user: User) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return tenant


def _count_operarios(db: Session, tenant_id: int) -> int:
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role == "operario")
        .count()
    )


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    Genera una URL de Stripe Checkout para el taller.
    El precio se calcula automáticamente: base fija + (operarios × precio/operario).
    El admin no elige plan — el sistema lo calcula solo.
    """
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Pagos no configurados. Contacta con soporte.",
        )

    tenant = _get_tenant(db, current_user)
    num_seats = _count_operarios(db, current_user.tenant_id)

    success_url = f"{settings.frontend_url}/app?subscription=success"
    cancel_url = f"{settings.frontend_url}/trial-expirado?cancelled=1"

    try:
        url = create_checkout_session(
            tenant=tenant,
            admin_email=current_user.email,
            num_seats=num_seats,
            success_url=success_url,
            cancel_url=cancel_url,
            db=db,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    precio_total = PRECIO_BASE + (num_seats * PRECIO_POR_OPERARIO)
    return CheckoutResponse(
        checkout_url=url,
        num_seats=num_seats,
        precio_total=precio_total,
    )


@router.get("/portal", response_model=PortalResponse)
def billing_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    Genera una URL del Customer Portal de Stripe.
    El admin puede ver facturas, cambiar método de pago o cancelar.
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
    """Estado de suscripción + precio calculado para el número actual de operarios."""
    tenant = _get_tenant(db, current_user)
    num_seats = _count_operarios(db, current_user.tenant_id)
    precio_total = PRECIO_BASE + (num_seats * PRECIO_POR_OPERARIO)

    return BillingStatusResponse(
        plan=tenant.plan,
        subscription_status=tenant.subscription_status,
        stripe_customer_id=tenant.stripe_customer_id,
        trial_expires_at=(
            tenant.trial_expires_at.isoformat() if tenant.trial_expires_at else None
        ),
        num_seats=num_seats,
        precio_base=PRECIO_BASE,
        precio_por_operario=PRECIO_POR_OPERARIO,
        precio_total=precio_total,
    )


@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recibe eventos de Stripe — NO requiere autenticación JWT.
    La seguridad viene de la firma HMAC en el header stripe-signature.
    IMPORTANTE: leer el body como bytes RAW — si se parsea como JSON la firma no coincide.
    """
    raw_body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Falta header stripe-signature")

    try:
        result = handle_webhook(raw_body=raw_body, sig_header=sig_header, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {"received": True, **result}
