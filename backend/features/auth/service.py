import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security import create_access_token, hash_password, verify_password
from backend.features.demo import seed_workspace_demo_data

from .model import Tenant, User

# { email: (attempts, locked_until_utc) }
_login_state: Dict[str, Tuple[int, datetime | None]] = {}

# Rate limiter genérico en memoria: { key: [timestamps recientes] }
# NOTA: por-proceso y se resetea al reiniciar. Suficiente para un worker;
# migrar a Redis cuando haya varios workers (mismo caso que _login_state y ws_manager).
_rate_state: Dict[str, list[datetime]] = {}


def _now():
    return datetime.now(timezone.utc)


def check_rate_limit(key: str, max_hits: int, window_minutes: int) -> None:
    """Lanza ValueError si `key` supera `max_hits` en la ventana dada."""
    now = _now()
    window_start = now - timedelta(minutes=window_minutes)
    hits = [t for t in _rate_state.get(key, []) if t > window_start]
    if len(hits) >= max_hits:
        raise ValueError("Demasiadas solicitudes. Inténtalo de nuevo más tarde.")
    hits.append(now)
    _rate_state[key] = hits


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
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "taller"


def _unique_slug(db: Session, base: str) -> str:
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
    safe_email = admin_email.lower().strip()

    if db.query(User).filter(User.email == safe_email).first():
        raise ValueError("Este email ya tiene una cuenta en Weldix")

    base_slug = _slugify(nombre_taller)
    slug = _unique_slug(db, base_slug)
    tenant = Tenant(
        nombre=nombre_taller.strip(),
        slug=slug,
        plan="trial",
        trial_expires_at=_now() + timedelta(days=15),
    )
    db.add(tenant)
    db.flush()

    admin = User(
        tenant_id=tenant.id,
        email=safe_email,
        full_name=(admin_name or "").strip() or None,
        role="admin",
        password_hash=hash_password(admin_password),
        pin=generate_unique_pin(db, tenant.id),
    )
    db.add(admin)
    seed_workspace_demo_data(db, tenant.id)  # type: ignore[arg-type]
    db.commit()
    db.refresh(tenant)
    db.refresh(admin)
    return tenant, admin


DEMO_TENANT_SLUG = "demo"
DEMO_ADMIN_EMAIL = "demo@weldix.es"
DEMO_OPERARIO_EMAIL = "demo-operario@weldix.es"


def _get_or_create_demo_user(
    db: Session,
    tenant_id: int,
    email: str,
    full_name: str,
    role: str,
    worker_number: int | None = None,
) -> User:
    user = (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.email == email)
        .first()
    )
    if user is None:
        user = User(
            tenant_id=tenant_id,
            email=email,
            full_name=full_name,
            role=role,
            worker_number=worker_number,
            password_hash=hash_password(secrets.token_urlsafe(24)),
            pin=generate_unique_pin(db, tenant_id),
            onboarding_done=True,
        )
        db.add(user)
        db.flush()
    return user


def start_demo_session(db: Session, role: str = "admin") -> dict:
    """Acceso de invitado: crea o reutiliza el taller demo (con un usuario jefe y uno
    operario), resetea sus datos de ejemplo y devuelve un token para el rol pedido.
    """
    # Import local para evitar cualquier ciclo de importación con el módulo admin.
    from backend.features.admin.demo_cleanup import clear_demo_data

    tenant = db.query(Tenant).filter(Tenant.slug == DEMO_TENANT_SLUG).first()
    if tenant is None:
        tenant = Tenant(
            nombre="Taller Demo",
            slug=DEMO_TENANT_SLUG,
            plan="trial",
            # Trial largo: la demo nunca debe chocar con el muro de pago.
            trial_expires_at=_now() + timedelta(days=3650),
        )
        db.add(tenant)
        db.flush()

    admin = _get_or_create_demo_user(
        db, tenant.id, DEMO_ADMIN_EMAIL, "Invitado (Jefe)", "admin"  # type: ignore[arg-type]
    )
    operario = _get_or_create_demo_user(
        db, tenant.id, DEMO_OPERARIO_EMAIL, "Invitado (Operario)", "operario", worker_number=1  # type: ignore[arg-type]
    )

    # Cada visita arranca con los datos demo frescos (evita que se acumule basura).
    clear_demo_data(db, tenant.id)  # type: ignore[arg-type]
    seed_workspace_demo_data(db, tenant.id)  # type: ignore[arg-type]
    db.commit()

    user = operario if role == "operario" else admin
    db.refresh(user)

    return {
        "access_token": create_access_token(
            subject=str(user.id),
            extra={"role": user.role, "email": user.email},
        ),
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "email": user.email,
    }


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
        pin=generate_unique_pin(db, tenant_id) if tenant_id is not None else None,
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
        raise ValueError("Contrasena actual incorrecta")
    user.password_hash = hash_password(new_password)
    db.commit()


def get_trial_status(db: Session, tenant_id: int | None) -> dict:
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
    trial_dt = tenant.trial_expires_at
    if trial_dt.tzinfo is None:
        trial_dt = trial_dt.replace(tzinfo=timezone.utc)
    delta = trial_dt - now
    days_left = max(0, delta.days)
    is_expired = now > trial_dt

    return {
        "is_trial": True,
        "is_expired": is_expired,
        "days_left": days_left,
        "trial_expires_at": tenant.trial_expires_at,
    }


def request_password_reset(db: Session, email: str) -> str | None:
    """
    Genera un token de reset de un solo uso con TTL de 1 hora.
    Devuelve el token o None si el email no existe.
    El llamador NO debe revelar si el email existe — siempre responder 204.
    """
    safe_email = email.lower().strip()
    user = db.query(User).filter(User.email == safe_email).first()
    if not user:
        return None
    user.reset_token = secrets.token_urlsafe(32)  # type: ignore[assignment]
    user.reset_token_expires_at = _now() + timedelta(hours=1)  # type: ignore[assignment]
    db.commit()
    return str(user.reset_token)


def do_reset_password(db: Session, token: str, new_password: str) -> None:
    """Valida el token, actualiza la contraseña y borra el token (uso único)."""
    user = db.query(User).filter(User.reset_token == token).first()  # type: ignore[arg-type]
    if not user:
        raise ValueError("Enlace de recuperación no válido")

    expires_at = user.reset_token_expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at is None or _now() > expires_at:  # type: ignore[operator]
        user.reset_token = None  # type: ignore[assignment]
        user.reset_token_expires_at = None  # type: ignore[assignment]
        db.commit()
        raise ValueError("El enlace ha expirado. Solicita uno nuevo.")

    user.password_hash = hash_password(new_password)  # type: ignore[assignment]
    user.reset_token = None  # type: ignore[assignment]
    user.reset_token_expires_at = None  # type: ignore[assignment]
    db.commit()


def generate_unique_pin(db: Session, tenant_id: int | None) -> str:
    """
    Genera un PIN de 4 dígitos único DENTRO del taller.
    La unicidad es por tenant: dos talleres distintos pueden repetir PIN sin cruzarse
    porque el kiosko resuelve el tenant por su token antes de buscar el PIN.
    """
    for _ in range(200):
        pin = f"{secrets.randbelow(10000):04d}"
        exists = (
            db.query(User)
            .filter(User.tenant_id == tenant_id, User.pin == pin)
            .first()
        )
        if not exists:
            return pin
    raise ValueError("No se pudo generar un PIN libre en el taller")


def regenerate_pin(db: Session, admin: User, target_user_id: int) -> str:
    """Admin: genera un PIN nuevo (único en su taller) para un usuario suyo."""
    target = (
        db.query(User)
        .filter(User.id == target_user_id, User.tenant_id == admin.tenant_id)
        .first()
    )
    if not target:
        raise ValueError("Usuario no encontrado en tu taller")
    target.pin = generate_unique_pin(db, admin.tenant_id)  # type: ignore[assignment]
    db.commit()
    db.refresh(target)
    return str(target.pin)


def admin_reset_user_password(
    db: Session, admin: User, target_user_id: int, new_password: str
) -> User:
    """
    El admin fija una nueva contraseña para un usuario de SU taller.
    Pensado para operarios que no tienen email o no pueden usar el flujo de reset.
    - Scoping por tenant: no puede tocar usuarios de otro taller.
    - No puede resetearse a sí mismo (para eso usa 'cambiar contraseña').
    """
    if target_user_id == admin.id:
        raise ValueError("Para tu propia cuenta usa 'cambiar contraseña'")

    target = (
        db.query(User)
        .filter(User.id == target_user_id, User.tenant_id == admin.tenant_id)
        .first()
    )
    if not target:
        raise ValueError("Usuario no encontrado en tu taller")

    target.password_hash = hash_password(new_password)
    # Invalida cualquier token de reset por email que estuviera pendiente
    target.reset_token = None
    target.reset_token_expires_at = None
    db.commit()
    db.refresh(target)
    return target


def authenticate_user(db: Session, email: str, password: str) -> dict:
    safe_email = email.lower().strip()

    if _is_locked(safe_email):
        raise ValueError("Cuenta bloqueada temporalmente por intentos fallidos")

    # Busca todos los usuarios con ese email (puede existir en varios talleres)
    candidates = db.query(User).filter(User.email == safe_email).all()
    user = next((u for u in candidates if verify_password(password, str(u.password_hash))), None)
    if not user:
        _register_failed_attempt(safe_email)
        raise ValueError("Credenciales invalidas")

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
