from jose import jwt

from backend.core.config import settings

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    """El admin está creado en conftest.py — devuelve su token."""
    login = _login(client, "admin@weldix.dev", "Admin1234!")
    return login.json()["access_token"]


def _create_worker(client, email: str, password: str = "Password123"):
    """Solo el admin puede crear cuentas — registro público cerrado."""
    token = _admin_token(client)
    return client.post(
        "/auth/admin/signup",
        json={"email": email, "password": password, "full_name": "Test Worker"},
        headers={"Authorization": f"Bearer {token}"},
    )


# ─── Tests ────────────────────────────────────────────────────────────────────


def test_public_signup_is_closed(client):
    """El registro público está desactivado — solo admin puede crear cuentas."""
    response = client.post(
        "/auth/signup",
        json={
            "email": "attacker@example.com",
            "password": "Password123",
            "full_name": "Hacker",
        },
    )
    assert response.status_code == 403


def test_admin_creates_worker_and_worker_can_login(client):
    """Flujo completo: admin crea operario → operario hace login → /me devuelve datos."""
    created = _create_worker(client, "worker@example.com")
    assert created.status_code == 200
    assert created.json()["email"] == "worker@example.com"
    assert created.json()["role"] == "operario"

    login = _login(client, "worker@example.com", "Password123")
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "worker@example.com"
    assert me.json()["role"] == "operario"


def test_duplicate_email_returns_409(client):
    """Crear dos usuarios con el mismo email devuelve 409."""
    first = _create_worker(client, "duplicate@example.com")
    second = _create_worker(client, "duplicate@example.com")

    assert first.status_code == 200
    assert second.status_code == 409


def test_me_with_malformed_token_returns_401(client):
    """Un token con sub no numérico es rechazado."""
    bad_token = jwt.encode(
        {"sub": "not-an-int"},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "No autenticado"


def test_list_users_requires_admin_role(client):
    """Un operario no puede listar usuarios — solo admin."""
    _create_worker(client, "operario@example.com")
    login = _login(client, "operario@example.com", "Password123")
    token = login.json()["access_token"]

    response = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["detail"] == "No autorizado"


def test_admin_can_list_all_users(client):
    """El admin ve todos los usuarios en la lista."""
    _create_worker(client, "other@example.com")
    token = _admin_token(client)

    response = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    emails = {item["email"] for item in response.json()}
    assert "admin@weldix.dev" in emails
    assert "other@example.com" in emails


def test_login_is_locked_after_failed_attempts(client):
    """Después de N intentos fallidos, la cuenta se bloquea temporalmente."""
    _create_worker(client, "lock@example.com")

    for _ in range(settings.login_max_attempts):
        wrong = _login(client, "lock@example.com", "WrongPass123")
        assert wrong.status_code == 401

    locked = _login(client, "lock@example.com", "Password123")
    assert locked.status_code == 401
    assert "bloqueada" in locked.json()["detail"].lower()


def test_admin_signup_creates_admin_role(client):
    """El admin puede crear otro admin pasando role='admin'."""
    token = _admin_token(client)
    response = client.post(
        "/auth/admin/signup",
        json={
            "email": "new-admin@example.com",
            "password": "Password123",
            "full_name": "New Admin",
            "role": "admin",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_operario_cannot_use_admin_signup(client):
    """Un operario no puede usar el endpoint admin/signup."""
    _create_worker(client, "operario2@example.com")
    login = _login(client, "operario2@example.com", "Password123")
    operario_token = login.json()["access_token"]

    denied = client.post(
        "/auth/admin/signup",
        json={
            "email": "new@example.com",
            "password": "Password123",
            "full_name": "Test",
        },
        headers={"Authorization": f"Bearer {operario_token}"},
    )
    assert denied.status_code == 403
    assert denied.json()["detail"] == "No autorizado"
