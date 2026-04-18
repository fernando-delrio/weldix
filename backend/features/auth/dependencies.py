from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.database import get_db
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
    Bloquea el acceso con 402 si el trial del tenant ha expirado.
    Tenants sin trial_expires_at (plan activo o dev) pasan siempre.
    Usar como dependency en routers cuando Stripe esté integrado.
    """
    from datetime import datetime, timezone

    if user.tenant_id is None:
        return user

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if tenant and tenant.trial_expires_at:
        if datetime.now(timezone.utc) > tenant.trial_expires_at:
            raise HTTPException(
                status_code=402,
                detail="Tu periodo de prueba ha expirado. Activa tu suscripción para continuar.",
            )
    return user
