import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security import create_access_token, hash_password, verify_password

from .model import Tenant, User

# { email: (attempts, locked_until_utc) }
_login_state: Dict[str, Tuple[int, datetime | None]] = {}


def _now():
    return datetime.now(timezone.utc)


def _is_locked(email: str) -> bool:
    attempts, locked_until = _login_state.get(email, (0, None))
    if not locked_until:
        return False
    return _now() < locked_until


def _register_failed_attempt(email: str):
    attempts, locked_until = _login_state.get(email, (0, None))
    attempts = attempts + 1

    if attempts >= settings.login_max_attempts:
        locked_until = _now() + timedelta(minutes=settings.login_lock_minutes)

    _login_state[email] = (attempts, locked_until)


def _reset_attempts(email: str):
    if email in _login_state:
        _login_state[email] = (0, None)


def _slugify(name: str) -> str:
    """Convierte "Talleres García S.L." en "talleres-garcia-sl" para usar como slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "taller"


def _unique_slug(db: Session, base: str) -> str:
    """Si el slug ya existe, añade un sufijo numérico hasta encontrar uno libre."""
    slug = base
    counter = 2
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def create_workspace(
    db: Session,
    nombre_taller: str,
    admin_email: str,
    admin_password: str,
    admin_name: str | None,
) -> tuple[Tenant, User]:
    """
    Registro público: crea un Tenant (taller) y su primer usuario admin.
    Este es el punto de entrada para nuevos clientes de Weldix.
    """
    safe_email = admin_email.lower().strip()

    # Guard: email ya registrado
    if db.query(User).filter(User.email == safe_email).first():
        raise ValueError("Este email ya tiene una cuenta en Weldix")

    # Crear tenant con trial de 15 días
    base_slug = _slugify(nombre_taller)
    slug = _unique_slug(db, base_slug)
    tenant = Tenant(
        nombre=nombre_taller.strip(),
        slug=slug,
        plan="trial",
        trial_expires_at=_now() + timedelta(days=15),
    )
    db.add(tenant)
    db.flush()  # obtenemos tenant.id antes de crear el usuario

    # Crear admin del taller
    admin = User(
        tenant_id=tenant.id,
        email=safe_email,
        full_name=(admin_name or "").strip() or None,
        role="admin",
        password_hash=hash_password(admin_password),
    )
    db.add(admin)
    db.commit()
    db.refresh(tenant)
    db.refresh(admin)
    return tenant, admin


def create_user(
    db: Session,
    email: str,
    password: str,
    full_name: str | None,
    role: str,
    tenant_id: int | None = None,
) -> User:
    normalized_role = role if role in ("admin", "operario") else "operario"
    worker_number: int | None = None

    if normalized_role == "operario" and tenant_id is not None:
        last_number_row = (
            db.query(User.worker_number)
            .filter(
                User.tenant_id == tenant_id,
                User.role == "operario",
                User.worker_number.isnot(None),
            )
            .order_by(User.worker_number.desc())
            .first()
        )
        worker_number = (
            last_number_row[0] if last_number_row and last_number_row[0] else 0
        ) + 1

    user = User(
        tenant_id=tenant_id,
        worker_number=worker_number,
        email=email.lower().strip(),
        full_name=full_name,
        role=normalized_role,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_profile(db: Session, user: User, full_name: str) -> User:
    user.full_name = full_name.strip()
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session, user: User, current_password: str, new_password: str
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise ValueError("Contraseña actual incorrecta")
    user.password_hash = hash_password(new_password)
    db.commit()


def get_trial_status(db: Session, tenant_id: int | None) -> dict:
    """
    Devuelve el estado del trial del tenant del usuario.
    - trial_expires_at = None → plan activo, sin restricción
    - trial_expires_at < now → expirado
    - trial_expires_at > now → days_left calculados
    """
    if tenant_id is None:
        return {
            "is_trial": False,
            "is_expired": False,
            "days_left": None,
            "trial_expires_at": None,
        }

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant or tenant.trial_expires_at is None:
        return {
            "is_trial": False,
            "is_expired": False,
            "days_left": None,
            "trial_expires_at": None,
        }

    now = _now()
    delta = tenant.trial_expires_at - now
    days_left = max(0, delta.days)
    is_expired = now > tenant.trial_expires_at

    return {
        "is_trial": True,
        "is_expired": is_expired,
        "days_left": days_left,
        "trial_expires_at": tenant.trial_expires_at,
    }


def authenticate_user(db: Session, email: str, password: str) -> dict:
    safe_email = email.lower().strip()

    if _is_locked(safe_email):
        raise ValueError("Cuenta bloqueada temporalmente por intentos fallidos")

    user = db.query(User).filter(User.email == safe_email).first()
    if not user or not verify_password(password, user.password_hash):
        _register_failed_attempt(safe_email)
        raise ValueError("Credenciales inválidas")

    _reset_attempts(safe_email)

    token = create_access_token(
        subject=str(user.id),
        extra={"role": user.role, "email": user.email},
    )

    return {
        "access_token": token,
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
    }
