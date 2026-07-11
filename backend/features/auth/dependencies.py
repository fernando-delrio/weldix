from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.email import send_trial_expired_email, send_trial_warning_email
from backend.core.security import decode_token

from .model import Tenant, User

bearer = HTTPBearer()


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="No autenticado")


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_token(creds.credentials)
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise ValueError("Token invalido")
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise _unauthorized()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise _unauthorized()

    return user


def require_role(*roles: str):
    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="No autorizado")
        return user

    return _guard


def require_active_trial(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Bloquea con 402 si el taller no tiene acceso activo.
    Lógica:
      1. Sin tenant_id (dev/superadmin) → pasa siempre
      2. subscription_status == 'active' o 'trialing' → pasa siempre (Stripe confirma)
      3. subscription_status negativo (canceled/past_due/unpaid) → BLOQUEA (402)
      4. trial_expires_at == None → plan sin restricción → pasa
      5. trial_expires_at > now → trial vigente → pasa
      6. trial_expires_at < now → bloqueado → 402
    """
    from datetime import datetime, timezone

    if user.tenant_id is None:
        return user

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        return user

    # Suscripción Stripe activa — fuente de verdad principal
    if tenant.subscription_status in ("active", "trialing"):
        return user

    # Estado de pago negativo: bloquea SIEMPRE, aunque trial_expires_at sea None.
    # Tras un pago exitoso trial_expires_at queda en None; sin este guard, cuando
    # la suscripción se cancela o falla el pago el taller seguiría con acceso total
    # (el paso 4 lo dejaría pasar). Este es el candado que revoca el acceso al churn.
    if tenant.subscription_status in ("canceled", "past_due", "unpaid", "incomplete_expired"):
        raise HTTPException(
            status_code=402,
            detail="Tu suscripción no está activa. Actualiza tu método de pago para continuar.",
        )

    # Sin restricción de trial (plan legacy o dev)
    if tenant.trial_expires_at is None:
        return user

    # SQLite devuelve datetimes sin tzinfo; PostgreSQL los devuelve con tzinfo.
    # Normalizamos a UTC para que la comparación funcione en ambos entornos.
    trial_expires = tenant.trial_expires_at
    if trial_expires.tzinfo is None:
        trial_expires = trial_expires.replace(tzinfo=timezone.utc)

    # Trial vigente — avisar si quedan 3 días o menos
    now = datetime.now(timezone.utc)
    if now <= trial_expires:
        days_left = (trial_expires - now).days
        if days_left <= 3:
            send_trial_warning_email(
                to=user.email,
                admin_name=user.full_name or "",
                tenant_nombre=tenant.nombre,
                days_left=days_left,
                tenant_id=tenant.id,
            )
        return user

    # Trial expirado
    send_trial_expired_email(
        to=user.email,
        admin_name=user.full_name or "",
        tenant_nombre=tenant.nombre,
        tenant_id=tenant.id,
    )
    raise HTTPException(
        status_code=402,
        detail="Tu periodo de prueba ha expirado. Activa tu suscripción para continuar.",
    )
