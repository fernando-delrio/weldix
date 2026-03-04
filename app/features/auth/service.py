from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from .model import User


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


def create_user(db: Session, email: str, password: str, full_name: str | None, role: str) -> User:
    normalized_role = role if role in ("admin", "operario") else "operario"

    user = User(
        email=email.lower().strip(),
        full_name=full_name,
        role=normalized_role,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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
