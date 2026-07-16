"""Tests del núcleo de auth: workspace, login, PIN y rate limiting."""
import pytest

from backend.features.auth import service as auth_service


def _make_workspace(db, email="jefe@taller.com"):
    return auth_service.create_workspace(
        db,
        nombre_taller="Taller Test",
        admin_email=email,
        admin_password="secret123",
        admin_name="Jefe Test",
    )


def test_create_workspace_creates_tenant_and_admin(db):
    tenant, admin = _make_workspace(db)
    assert tenant.id is not None
    assert admin.role == "admin"
    assert admin.tenant_id == tenant.id
    # el admin recibe un PIN de 4 dígitos
    assert admin.pin is not None
    assert len(admin.pin) == 4 and admin.pin.isdigit()


def test_create_workspace_rejects_duplicate_email(db):
    _make_workspace(db, email="dup@taller.com")
    with pytest.raises(ValueError):
        _make_workspace(db, email="dup@taller.com")


def test_authenticate_user_valid_credentials(db):
    _make_workspace(db, email="login@taller.com")
    data = auth_service.authenticate_user(
        db, email="login@taller.com", password="secret123"
    )
    assert data["access_token"]
    assert data["role"] == "admin"
    assert data["email"] == "login@taller.com"


def test_authenticate_user_invalid_password(db):
    _make_workspace(db, email="bad@taller.com")
    with pytest.raises(ValueError):
        auth_service.authenticate_user(db, email="bad@taller.com", password="wrong")


def test_generate_unique_pin_format_and_differs_from_existing(db):
    tenant, admin = _make_workspace(db, email="pin@taller.com")
    nuevo = auth_service.generate_unique_pin(db, tenant.id)
    assert len(nuevo) == 4 and nuevo.isdigit()
    # no colisiona con el PIN ya asignado al admin
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
