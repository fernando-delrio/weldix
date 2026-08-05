"""
Tests HTTP del router de billing — casos NO cubiertos por tests/test_billing_webhooks.py.

tests/test_billing_webhooks.py ya cubre: firma de webhook (ausente/inválida/sin
secret), los 4 eventos de Stripe que mutan el tenant, evento desconocido,
/billing/status básico, checkout sin admin/sin stripe key/sin price ids, y
portal sin stripe_customer_id.

Este archivo llena los huecos: camino feliz de checkout y portal (con Stripe
mockeado), autenticación ausente (401) en los tres endpoints protegidos,
protección de rol admin en /status y /portal (solo se probaba en /checkout),
efectos de lado del checkout (customer_id persistido en el tenant) y el caso
en que un webhook válido no puede resolver ningún tenant.

Mock target: backend.features.billing.service.stripe / .settings
             backend.features.billing.router.settings
"""
import json
from unittest.mock import MagicMock, patch

import stripe as stripe_real

# ─── Constantes de mock ────────────────────────────────────────────────────────

_MOCK_STRIPE = "backend.features.billing.service.stripe"
_MOCK_SERVICE_SETTINGS = "backend.features.billing.service.settings"
_MOCK_ROUTER_SETTINGS = "backend.features.billing.router.settings"


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _mock_settings(**overrides) -> MagicMock:
    """Settings de Stripe completos y válidos — se pisan campos puntuales con overrides."""
    m = MagicMock()
    m.stripe_secret_key = "sk_test_fake"
    m.stripe_webhook_secret = "whsec_test_secret"
    m.stripe_price_base = "price_base_test"
    m.stripe_price_per_seat = "price_seat_test"
    m.frontend_url = "http://localhost:5174"
    for key, value in overrides.items():
        setattr(m, key, value)
    return m


def _create_operario(client, admin_token: str, email: str) -> None:
    res = client.post(
        "/auth/admin/signup",
        json={"email": email, "password": "Admin1234!", "full_name": "Operario"},
        headers=_auth_header(admin_token),
    )
    assert res.status_code == 200, f"No se pudo crear operario: {res.json()}"


def _fake_event(event_type: str, data: dict) -> dict:
    return {"type": event_type, "data": {"object": data}}


def _post_webhook(client, event: dict, sig: str = "t=123,v1=fakesig"):
    return client.post(
        "/billing/webhook",
        content=json.dumps(event).encode(),
        headers={"Content-Type": "application/json", "stripe-signature": sig},
    )


# ─── Checkout: camino feliz ───────────────────────────────────────────────────


def test_checkout_happy_path_returns_stripe_checkout_url(workspace_client):
    """Con Stripe y precios configurados, checkout devuelve la URL real de Stripe."""
    client, token, _tenant, _db = workspace_client
    mock_settings = _mock_settings()

    with (
        patch(_MOCK_ROUTER_SETTINGS, mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_new_taller")
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/session_test"
        )

        response = client.post("/billing/checkout", headers=_auth_header(token))

    assert response.status_code == 200
    assert response.json()["checkout_url"] == "https://checkout.stripe.com/session_test"


def test_checkout_creates_stripe_customer_and_persists_id(workspace_client):
    """Efecto de lado: el customer_id que devuelve Stripe se guarda en el tenant."""
    client, token, tenant, db = workspace_client
    assert tenant.stripe_customer_id is None
    mock_settings = _mock_settings()

    with (
        patch(_MOCK_ROUTER_SETTINGS, mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_new_taller")
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/session_test"
        )

        response = client.post("/billing/checkout", headers=_auth_header(token))

    assert response.status_code == 200
    db.refresh(tenant)
    assert tenant.stripe_customer_id == "cus_new_taller"


def test_checkout_reuses_existing_stripe_customer(workspace_client):
    """Si el tenant ya tiene stripe_customer_id, no se crea un customer nuevo."""
    client, token, tenant, db = workspace_client
    tenant.stripe_customer_id = "cus_ya_existe"
    db.commit()
    mock_settings = _mock_settings()

    with (
        patch(_MOCK_ROUTER_SETTINGS, mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/session_test"
        )

        response = client.post("/billing/checkout", headers=_auth_header(token))

    assert response.status_code == 200
    mock_stripe.Customer.create.assert_not_called()


def test_checkout_price_reflects_operario_count(workspace_client):
    """precio_total = base (49) + operarios × 17. Con 2 operarios → 49 + 34 = 83."""
    client, token, _tenant, _db = workspace_client
    _create_operario(client, token, "op1@taller.dev")
    _create_operario(client, token, "op2@taller.dev")
    mock_settings = _mock_settings()

    with (
        patch(_MOCK_ROUTER_SETTINGS, mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_new_taller")
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/session_test"
        )

        response = client.post("/billing/checkout", headers=_auth_header(token))

    data = response.json()
    assert data["num_seats"] == 2
    assert data["precio_total"] == 49 + 2 * 17


# ─── Portal: camino feliz ─────────────────────────────────────────────────────


def test_portal_happy_path_returns_stripe_portal_url(workspace_client):
    """Con stripe_customer_id ya asignado, el portal devuelve la URL real de Stripe."""
    client, token, tenant, db = workspace_client
    tenant.stripe_customer_id = "cus_existente"
    db.commit()
    mock_settings = _mock_settings()

    with (
        patch(_MOCK_ROUTER_SETTINGS, mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.billing_portal.Session.create.return_value = MagicMock(
            url="https://billing.stripe.com/p/session_test"
        )

        response = client.get("/billing/portal", headers=_auth_header(token))

    assert response.status_code == 200
    assert response.json()["portal_url"] == "https://billing.stripe.com/p/session_test"


# ─── Autenticación ausente (401) ──────────────────────────────────────────────


def test_checkout_without_token_returns_401(workspace_client):
    client, _token, _tenant, _db = workspace_client

    response = client.post("/billing/checkout")

    assert response.status_code == 401


def test_portal_without_token_returns_401(workspace_client):
    client, _token, _tenant, _db = workspace_client

    response = client.get("/billing/portal")

    assert response.status_code == 401


def test_status_without_token_returns_401(workspace_client):
    client, _token, _tenant, _db = workspace_client

    response = client.get("/billing/status")

    assert response.status_code == 401


# ─── Rol requerido (403) — checkout ya se prueba en test_billing_webhooks.py ──


def test_status_requires_admin_role(workspace_client):
    """Un operario no puede consultar el estado de suscripción del taller."""
    client, admin_token, _tenant, _db = workspace_client
    _create_operario(client, admin_token, "operario-status@taller.dev")
    operario_token = client.post(
        "/auth/login",
        json={"email": "operario-status@taller.dev", "password": "Admin1234!"},
    ).json()["access_token"]

    response = client.get("/billing/status", headers=_auth_header(operario_token))

    assert response.status_code == 403


def test_portal_requires_admin_role(workspace_client):
    """Un operario no puede abrir el Customer Portal del taller."""
    client, admin_token, _tenant, _db = workspace_client
    _create_operario(client, admin_token, "operario-portal@taller.dev")
    operario_token = client.post(
        "/auth/login",
        json={"email": "operario-portal@taller.dev", "password": "Admin1234!"},
    ).json()["access_token"]

    response = client.get("/billing/portal", headers=_auth_header(operario_token))

    assert response.status_code == 403


# ─── Webhook: tenant no resoluble ─────────────────────────────────────────────


def test_webhook_valid_signature_but_unresolvable_tenant_does_not_crash(workspace_client):
    """
    Un evento válido cuyo customer_id no pertenece a ningún tenant conocido
    (y sin metadata.tenant_id) no debe reventar el endpoint — solo no hace nada.
    """
    client, _token, _tenant, _db = workspace_client
    event = _fake_event(
        "checkout.session.completed",
        {"customer": "cus_no_existe_en_ningun_tenant", "metadata": {}},
    )
    mock_settings = _mock_settings()

    with patch(_MOCK_SERVICE_SETTINGS, mock_settings), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        response = _post_webhook(client, event)

    assert response.status_code == 200
    assert response.json()["handled"] is True
