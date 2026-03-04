from jose import jwt

from app.core.config import settings


def _signup(client, email: str, password: str = "Password123"):
    return client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User",
        },
    )


def _signup_admin(client, email: str, token: str, password: str = "Password123"):
    return client.post(
        "/auth/admin/signup",
        json={
            "email": email,
            "password": password,
            "full_name": "Admin User",
        },
        headers={"Authorization": f"Bearer {token}"},
    )


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_signup_login_and_me_flow(client):
    signup = _signup(client, "worker@example.com")
    assert signup.status_code == 200
    assert signup.json()["email"] == "worker@example.com"

    login = _login(client, "worker@example.com", "Password123")
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "worker@example.com"
    assert me.json()["role"] == "operario"


def test_signup_duplicate_email_returns_409(client):
    first = _signup(client, "duplicate@example.com")
    second = _signup(client, "duplicate@example.com")

    assert first.status_code == 200
    assert second.status_code == 409


def test_me_with_malformed_sub_returns_401(client):
    bad_token = jwt.encode(
        {"sub": "not-an-int"},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "No autenticado"


def test_users_requires_admin_role(client):
    _signup(client, "operario@example.com")
    login = _login(client, "operario@example.com", "Password123")
    token = login.json()["access_token"]

    response = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["detail"] == "No autorizado"


def test_users_admin_can_list_users(client):
    _signup(client, "other@example.com")
    login = _login(client, "admin@weldix.dev", "Admin1234!")
    token = login.json()["access_token"]

    response = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    emails = {item["email"] for item in response.json()}
    assert "admin@weldix.dev" in emails
    assert "other@example.com" in emails


def test_login_is_locked_after_failed_attempts(client):
    _signup(client, "lock@example.com")

    for _ in range(settings.login_max_attempts):
        wrong = _login(client, "lock@example.com", "WrongPass123")
        assert wrong.status_code == 401

    locked = _login(client, "lock@example.com", "Password123")
    assert locked.status_code == 401
    assert "bloqueada" in locked.json()["detail"].lower()


def test_signup_never_creates_admin_role(client):
    signup = client.post(
        "/auth/signup",
        json={
            "email": "attempt-admin@example.com",
            "password": "Password123",
            "full_name": "Attempt Admin",
            "role": "admin",
        },
    )

    assert signup.status_code == 200
    assert signup.json()["role"] == "operario"


def test_admin_signup_requires_admin_role(client):
    _signup(client, "operario2@example.com")
    operario_login = _login(client, "operario2@example.com", "Password123")
    operario_token = operario_login.json()["access_token"]

    denied = _signup_admin(client, "new-admin-denied@example.com", operario_token)
    assert denied.status_code == 403
    assert denied.json()["detail"] == "No autorizado"

    admin_login = _login(client, "admin@weldix.dev", "Admin1234!")
    admin_token = admin_login.json()["access_token"]

    created = _signup_admin(client, "new-admin-ok@example.com", admin_token)
    assert created.status_code == 200
    assert created.json()["role"] == "admin"
