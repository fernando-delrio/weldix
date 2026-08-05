"""
Tests HTTP del router de auth: mecánica de login, JWT y protección de endpoints.

Migrado desde backend/tests/features/auth/test_auth_router.py — adaptado al
patrón de fixtures de tests/conftest.py (raíz), que es el que ejecuta CI
(`pytest tests/`). Usa `client`, la fixture que ya monta el auth_router con
un admin de fábrica (admin@weldix.dev / Admin1234!, sin tenant).

Solo se migran casos que NO estaban ya cubiertos en tests/test_auth_endpoints.py:
login con email desconocido, validación 422, ausencia de token, expiración y
manipulación de JWT, contenido de claims, y el límite exacto de intentos
fallidos antes del bloqueo (1 fallo no bloquea).
"""
from datetime import datetime, timedelta, timezone

from jose import jwt

from backend.core.config import settings

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


# ─── Login: casos no cubiertos por test_auth_endpoints.py ────────────────────


def test_login_with_unknown_email_returns_401(client):
    # ACT
    response = _login(client, "no-existe@weldix.dev", "Admin1234!")

    # ASSERT
    assert response.status_code == 401


def test_login_with_missing_password_returns_422(client):
    # ACT — LoginRequest exige password
    response = client.post("/auth/login", json={"email": "admin@weldix.dev"})

    # ASSERT
    assert response.status_code == 422


def test_login_does_not_lock_after_single_failed_attempt(client):
    # ARRANGE — un único intento fallido, por debajo del límite de bloqueo
    wrong = _login(client, "admin@weldix.dev", "ContraseñaMala")
    assert wrong.status_code == 401

    # ACT — la contraseña correcta debe seguir funcionando
    response = _login(client, "admin@weldix.dev", "Admin1234!")

    # ASSERT
    assert response.status_code == 200


# ─── JWT: contenido, expiración y manipulación ────────────────────────────────


def test_login_token_contains_role_and_email_claims(client):
    # ACT
    token = _admin_token(client)
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])

    # ASSERT
    assert payload["role"] == "admin"
    assert payload["email"] == "admin@weldix.dev"


def test_missing_token_returns_401(client):
    # ACT — sin header Authorization
    response = client.get("/auth/me")

    # ASSERT
    assert response.status_code == 401


def test_expired_token_returns_401(client):
    # ARRANGE — token firmado correctamente pero con exp en el pasado
    now = datetime.now(timezone.utc)
    expired_token = jwt.encode(
        {
            "sub": "1",
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    # ACT
    response = client.get("/auth/me", headers=_auth_header(expired_token))

    # ASSERT
    assert response.status_code == 401


def test_token_with_invalid_signature_returns_401(client):
    # ARRANGE — token firmado con una clave distinta a la del servidor
    now = datetime.now(timezone.utc)
    forged_token = jwt.encode(
        {"sub": "1", "exp": int((now + timedelta(hours=1)).timestamp())},
        "clave-falsa-que-no-es-la-del-server",
        algorithm=settings.jwt_algorithm,
    )

    # ACT
    response = client.get("/auth/me", headers=_auth_header(forged_token))

    # ASSERT
    assert response.status_code == 401
