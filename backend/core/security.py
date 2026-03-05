from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from .config import settings


# Use pbkdf2 to avoid bcrypt/passlib runtime incompatibilities in this env.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(subject: str, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload: Dict[str, Any] = {"sub": subject, "iat": int(now.timestamp()), "exp": int(expire.timestamp())}
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Token inválido") from exc
