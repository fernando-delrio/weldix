"""
Tests del sistema de trial y acceso por suscripción.

Verifican que:
- Un taller en trial activo puede usar la app.
- Un taller con trial expirado recibe 402 Payment Required.
- Una suscripción Stripe activa siempre da acceso, aunque el trial haya expirado.
- El endpoint /auth/me/trial-status devuelve los datos correctos.
- Registrar un workspace crea un trial de 15 días.

Los tests manipulan trial_expires_at directamente en la BD — no dormimos el proceso.
Las funciones de email se mockean para no hacer llamadas reales.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

# ─── Helpers ──────────────────────────────────────────────────────────────────

_MOCK_EMAIL = "backend.features.auth.dependencies.send_trial_expired_email"
_MOCK_WARNING = "backend.features.auth.dependencies.send_trial_warning_email"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _set_trial(tenant, db, *, days: int | None):
    """
    Cambia trial_expires_at del tenant directamente en la BD.
    days=None → sin restricción de trial (plan activo).
    days>0    → trial vigente con N días restantes.
    days<0    → trial expirado hace N días.
    """
    tenant.trial_expires_at = (
        _now() + timedelta(days=days) if days is not None else None
    )
    db.commit()
    db.refresh(tenant)


def _set_subscription_status(tenant, db, status: str):
    tenant.subscription_status = status
    db.commit()
    db.refresh(tenant)


# ─── Tests de acceso con trial activo ────────────────────────────────────────


def test_active_trial_allows_access(workspace_client):
    """Trial con 10 días restantes → el endpoint protegido devuelve 200."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=10)

    res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 200


def test_trial_expiry_at_exact_boundary(workspace_client):
    """Trial que expira en 1 día → sigue siendo 200 (todavía vigente)."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=1)

    with patch(_MOCK_WARNING):
        res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 200


# ─── Tests de acceso con trial expirado ──────────────────────────────────────


def test_expired_trial_blocks_with_402(workspace_client):
    """Trial expirado hace 1 día → 402 Payment Required."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=-1)

    with patch(_MOCK_EMAIL):
        res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 402
    assert (
        "prueba" in res.json()["detail"].lower()
        or "suscripción" in res.json()["detail"].lower()
    )


def test_expired_trial_blocks_after_many_days(workspace_client):
    """Trial expirado hace 30 días → 402 igualmente."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=-30)

    with patch(_MOCK_EMAIL):
        res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 402


# ─── Tests de suscripción Stripe activa ──────────────────────────────────────


def test_active_stripe_subscription_overrides_expired_trial(workspace_client):
    """
    subscription_status='active' + trial expirado → 200.
    Stripe es la fuente de verdad: si Stripe dice activo, pasa.
    """
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=-5)
    _set_subscription_status(tenant, db, "active")

    res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 200


def test_trialing_stripe_status_overrides_expired_trial(workspace_client):
    """subscription_status='trialing' (gestionado por Stripe) también da acceso."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=-1)
    _set_subscription_status(tenant, db, "trialing")

    res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 200


def test_no_trial_expiry_date_allows_access(workspace_client):
    """trial_expires_at=None → plan sin restricción de fecha → acceso libre."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=None)

    res = client.get("/test/trial-gate", headers=_auth_header(token))

    assert res.status_code == 200


# ─── Tests del endpoint /auth/me/trial-status ────────────────────────────────


def test_trial_status_endpoint_returns_days_left(workspace_client):
    """GET /auth/me/trial-status devuelve is_trial=True y days_left correcto."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=7)

    res = client.get("/auth/me/trial-status", headers=_auth_header(token))

    assert res.status_code == 200
    data = res.json()
    assert data["is_trial"] is True
    assert data["is_expired"] is False
    # delta.days es el floor de los días fraccionarios — microsegundos de ejecución
    # pueden reducir 7.000 días a 6.999 → floor = 6. Aceptamos 6 o 7.
    assert data["days_left"] in (6, 7)


def test_trial_status_endpoint_expired(workspace_client):
    """GET /auth/me/trial-status con trial expirado → is_expired=True, days_left=0."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=-3)

    res = client.get("/auth/me/trial-status", headers=_auth_header(token))

    assert res.status_code == 200
    data = res.json()
    assert data["is_trial"] is True
    assert data["is_expired"] is True
    assert data["days_left"] == 0


def test_trial_status_no_expiry_returns_not_trial(workspace_client):
    """trial_expires_at=None → is_trial=False (plan activo sin restricción)."""
    client, token, tenant, db = workspace_client
    _set_trial(tenant, db, days=None)

    res = client.get("/auth/me/trial-status", headers=_auth_header(token))

    assert res.status_code == 200
    data = res.json()
    assert data["is_trial"] is False
    assert data["is_expired"] is False
    assert data["days_left"] is None


# ─── Test de registro de workspace ────────────────────────────────────────────


def test_register_workspace_creates_15_day_trial(workspace_client):
    """
    POST /auth/register-workspace crea un tenant con trial_expires_at = ahora + 15 días.
    Verificamos que days_left está entre 14 y 15 (margen de segundos de ejecución).
    """
    client, _, _, _ = workspace_client

    res = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": "Nuevo Taller",
            "admin_email": "nuevo@taller.dev",
            "admin_password": "Admin1234!",
            "admin_name": "Admin Nuevo",
            "aceptar_terminos": True,
        },
    )

    assert res.status_code == 201
    token = res.json()["access_token"]

    trial_res = client.get(
        "/auth/me/trial-status",
        headers=_auth_header(token),
    )

    assert trial_res.status_code == 200
    data = trial_res.json()
    assert data["is_trial"] is True
    assert data["is_expired"] is False
    # 15 días → days_left puede ser 14 o 15 dependiendo del momento exacto
    assert 14 <= data["days_left"] <= 15


def test_register_workspace_without_accepting_terms_returns_422(workspace_client):
    """No aceptar términos → 422 antes de crear nada."""
    client, _, _, _ = workspace_client

    res = client.post(
        "/auth/register-workspace",
        json={
            "nombre_taller": "Taller Sin Términos",
            "admin_email": "noterms@taller.dev",
            "admin_password": "Admin1234!",
            "aceptar_terminos": False,
        },
    )

    assert res.status_code == 422
