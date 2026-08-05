"""
Tests de reglas de negocio de auth: reset de contraseña, acciones de admin
sobre usuarios (reset password / regenerar PIN), registro de workspace y
utilidades internas del service (PIN único, rate-limiter genérico).

Migrado desde backend/tests/features/auth/test_auth_service.py — convertido de
llamadas directas al service a HTTP real, siguiendo el patrón ya usado en
tests/ (raíz): siempre a través del cliente HTTP, usando `db`/`tenant` de la
fixture solo para leer datos que la API nunca expone (ej. el token de reset
de contraseña, que se envía por email y no viaja en la respuesta HTTP).

Las dos últimas pruebas (PIN único al crear workspace, mecánica de
check_rate_limit) vienen de backend/tests/test_auth_service.py (archivo plano
preexistente) — sin equivalente HTTP razonable, se mantienen como tests de
servicio puro usando la fixture `db` (SQLite en memoria) portada a
tests/conftest.py.

Solo se migran casos que NO estaban ya cubiertos en tests/test_auth_endpoints.py
ni en tests/test_trial_system.py: flujo de forgot/reset-password completo,
reset-password/regenerar-pin de admin sobre otro usuario (incluida la variante
cross-tenant), duplicado de email en register-workspace, password corta, el
estado de trial cuando el usuario no tiene tenant (admin@weldix.dev), el PIN
único al crear un workspace y el rate-limiter genérico.
"""
from datetime import datetime, timedelta, timezone

import pytest

from backend.features.auth import service as auth_service
from backend.features.auth.model import User

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _me(client, token: str):
    return client.get("/auth/me", headers=_auth_header(token)).json()


# ─── Trial status sin tenant (admin@weldix.dev no pertenece a ningún taller) ──


def test_trial_status_without_tenant_returns_not_trial(client):
    # ARRANGE
    token = _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]

    # ACT
    response = client.get("/auth/me/trial-status", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    data = response.json()
    assert data["is_trial"] is False
    assert data["days_left"] is None


# ─── Admin resetea password/PIN de un usuario ─────────────────────────────────


def test_admin_reset_password_rejects_unknown_user(client):
    # ARRANGE
    token = _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]

    # ACT
    response = client.post(
        "/auth/admin/users/999999/reset-password",
        json={"new_password": "NuevaClave123"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 400


def test_admin_reset_password_rejects_targeting_self(client):
    # ARRANGE
    token = _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]
    own_id = _me(client, token)["id"]

    # ACT
    response = client.post(
        f"/auth/admin/users/{own_id}/reset-password",
        json={"new_password": "NuevaClave123"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 400
    assert "contraseña" in response.json()["detail"].lower()


def test_admin_regenerate_pin_returns_new_pin(client):
    # ARRANGE
    token = _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]
    own_id = _me(client, token)["id"]

    # ACT
    response = client.post(
        f"/auth/admin/users/{own_id}/regenerar-pin",
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    pin = response.json()["pin"]
    assert len(pin) == 4 and pin.isdigit()


# ─── Aislamiento por tenant en acciones de admin sobre otros usuarios ─────────


def test_admin_cannot_reset_password_of_user_from_other_tenant(two_tenants_client):
    # ARRANGE — dos talleres distintos, cada uno con su propio admin
    client, token_a, token_b = two_tenants_client
    admin_b_id = _me(client, token_b)["id"]

    # ACT — admin del taller A intenta resetear la contraseña del admin del taller B
    response = client.post(
        f"/auth/admin/users/{admin_b_id}/reset-password",
        json={"new_password": "OtraClave123"},
        headers=_auth_header(token_a),
    )

    # ASSERT — el servicio filtra por tenant, no lo encuentra dentro del de A
    assert response.status_code == 400


def test_admin_cannot_regenerate_pin_of_user_from_other_tenant(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    admin_b_id = _me(client, token_b)["id"]

    # ACT
    response = client.post(
        f"/auth/admin/users/{admin_b_id}/regenerar-pin",
        headers=_auth_header(token_a),
    )

    # ASSERT
    assert response.status_code == 400


# ─── Registro de workspace: casos no cubiertos por test_trial_system.py ──────


def test_register_workspace_creates_tenant_and_returns_usable_token(workspace_client):
    # ARRANGE
    client, _, _, _ = workspace_client

    # ACT
    response = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": "Nuevo Taller",
            "admin_email": "nuevo@taller.com",
            "admin_password": "Secret123",
            "admin_name": "Jefe Nuevo",
            "aceptar_terminos": True,
        },
    )

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "admin"
    assert body["tenant_slug"]
    me = client.get("/auth/me", headers=_auth_header(body["access_token"]))
    assert me.status_code == 200


def test_register_workspace_with_short_password_returns_422(workspace_client):
    # ARRANGE — RegisterWorkspaceRequest exige min_length=8
    client, _, _, _ = workspace_client

    # ACT
    response = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": "Taller Corto",
            "admin_email": "corta@taller.com",
            "admin_password": "corta",
            "aceptar_terminos": True,
        },
    )

    # ASSERT
    assert response.status_code == 422


def test_register_workspace_with_duplicate_email_returns_409(workspace_client):
    # ARRANGE — "admin@taller.dev" ya es el admin creado por la fixture workspace_client
    client, _, _, _ = workspace_client

    # ACT
    response = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": "Otro Taller",
            "admin_email": "admin@taller.dev",
            "admin_password": "Secret123",
            "aceptar_terminos": True,
        },
    )

    # ASSERT
    assert response.status_code == 409


# ─── Flujo completo de "olvidé mi contraseña" ────────────────────────────────


def test_forgot_password_with_unknown_email_returns_204(client):
    # ACT — no revela si el email existe o no (misma respuesta que el happy path)
    response = client.post(
        "/auth/forgot-password", json={"email": "no-existe@weldix.dev"}
    )

    # ASSERT
    assert response.status_code == 204


def test_reset_password_flow_allows_login_with_new_password(workspace_client):
    # ARRANGE — el token de reset no viaja en la respuesta HTTP (se envía por email),
    # así que lo leemos directamente de la BD, igual que otros tests de tests/ leen
    # tenant.trial_expires_at para manipular estado que la API no expone.
    client, admin_token, _, db = workspace_client
    client.post("/auth/forgot-password", json={"email": "admin@taller.dev"})
    user = db.query(User).filter(User.email == "admin@taller.dev").first()
    reset_token = user.reset_token
    assert reset_token is not None

    # ACT
    reset_response = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": "ClaveNueva123"},
    )

    # ASSERT
    assert reset_response.status_code == 204
    new_login = _login(client, "admin@taller.dev", "ClaveNueva123")
    assert new_login.status_code == 200
    old_login = _login(client, "admin@taller.dev", "Admin1234!")
    assert old_login.status_code == 401


def test_reset_password_with_invalid_token_returns_400(client):
    # ACT
    response = client.post(
        "/auth/reset-password",
        json={"token": "token-inventado", "new_password": "ClaveNueva123"},
    )

    # ASSERT
    assert response.status_code == 400


def test_reset_password_with_expired_token_returns_400(workspace_client):
    # ARRANGE — token válido pero con expiración ya pasada
    client, _, _, db = workspace_client
    user = db.query(User).filter(User.email == "admin@taller.dev").first()
    user.reset_token = "expired-token-123"
    user.reset_token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()

    # ACT
    response = client.post(
        "/auth/reset-password",
        json={"token": "expired-token-123", "new_password": "ClaveNueva123"},
    )

    # ASSERT
    assert response.status_code == 400


# ─── Utilidades internas del service — sin equivalente HTTP razonable ────────
# Migradas desde backend/tests/test_auth_service.py (archivo plano). Usan la
# fixture `db` (SQLite en memoria pura) portada a tests/conftest.py, porque
# ninguna API pública expone el PIN generado ni la mecánica interna del
# rate-limiter genérico.


def test_generate_unique_pin_format_and_differs_from_existing(db):
    tenant, admin = auth_service.create_workspace(
        db,
        nombre_taller="Taller PIN",
        admin_email="pin@taller.com",
        admin_password="secret123",
        admin_name="Jefe PIN",
    )
    nuevo = auth_service.generate_unique_pin(db, tenant.id)

    assert len(nuevo) == 4 and nuevo.isdigit()
    # no colisiona con el PIN ya asignado al admin al crear el workspace
    assert nuevo != admin.pin


def test_check_rate_limit_allows_max_then_blocks(db):
    key = "test-rl:unique-ip"
    allowed = 0
    with pytest.raises(ValueError):
        for _ in range(50):
            auth_service.check_rate_limit(key, max_hits=3, window_minutes=10)
            allowed += 1
    # permite exactamente 3 y bloquea la 4ª
    assert allowed == 3
