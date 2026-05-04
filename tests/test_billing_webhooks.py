"""
Tests de billing y webhooks de Stripe.

Verifican que:
- Los webhooks sin firma o con firma inválida son rechazados (400).
- checkout.session.completed activa el plan del tenant.
- customer.subscription.deleted cancela el plan.
- invoice.payment_failed marca el tenant como past_due.
- customer.subscription.updated actualiza el status.
- Los endpoints de billing requieren rol admin.
- /billing/status devuelve el estado correcto del tenant.

Stripe se mockea en todos los tests — no se hacen llamadas reales a la API.
Mock target: backend.features.billing.service.stripe
"""

import json
from unittest.mock import MagicMock, patch

import stripe as stripe_real

# ─── Constantes de mock ────────────────────────────────────────────────────────

_MOCK_STRIPE = "backend.features.billing.service.stripe"
_MOCK_SETTINGS = "backend.features.billing.service.settings"
_MOCK_ROUTER_SETTINGS = "backend.features.billing.router.settings"

_FAKE_CUSTOMER_ID = "cus_test_weldix_123"
_FAKE_WEBHOOK_SECRET = "whsec_test_secret"
_FAKE_PRICE_STARTER = "price_starter_test"
_FAKE_PRICE_PRO = "price_pro_test"


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _set_stripe_customer(tenant, db, customer_id: str = _FAKE_CUSTOMER_ID):
    """Asigna un stripe_customer_id al tenant para los tests de webhook."""
    tenant.stripe_customer_id = customer_id
    db.commit()
    db.refresh(tenant)


def _mock_settings():
    """Settings mockeados con los valores necesarios para billing."""
    m = MagicMock()
    m.stripe_webhook_secret = _FAKE_WEBHOOK_SECRET
    m.stripe_price_starter = _FAKE_PRICE_STARTER
    m.stripe_price_pro = _FAKE_PRICE_PRO
    m.stripe_secret_key = "sk_test_fake"
    m.frontend_url = "http://localhost:5174"
    return m


def _fake_event(event_type: str, data: dict) -> dict:
    """Construye un evento de Stripe falso para retornar desde el mock."""
    return {"type": event_type, "data": {"object": data}}


def _post_webhook(client, event: dict, sig: str = "t=123,v1=fakesig") -> object:
    """Llama al endpoint de webhook con el evento y la firma dada."""
    return client.post(
        "/billing/webhook",
        content=json.dumps(event).encode(),
        headers={
            "Content-Type": "application/json",
            "stripe-signature": sig,
        },
    )


# ─── Tests de seguridad del webhook ──────────────────────────────────────────


def test_webhook_without_signature_header_returns_400(workspace_client):
    """POST /billing/webhook sin header stripe-signature → 400."""
    client, _, _, _ = workspace_client

    res = client.post(
        "/billing/webhook",
        content=b'{"type": "test"}',
        headers={"Content-Type": "application/json"},
    )

    assert res.status_code == 400
    assert "stripe-signature" in res.json()["detail"].lower()


def test_webhook_with_invalid_signature_returns_400(workspace_client):
    """
    Stripe.Webhook.construct_event lanza SignatureVerificationError
    cuando la firma es inválida → el endpoint devuelve 400.
    """
    client, _, _, _ = workspace_client

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.side_effect = (
            stripe_real.error.SignatureVerificationError("bad sig", "sig_header")
        )

        res = _post_webhook(client, {"type": "test.event"})

    assert res.status_code == 400


def test_webhook_without_stripe_secret_configured_returns_503(workspace_client):
    """STRIPE_WEBHOOK_SECRET no configurado → 503 antes de intentar verificar."""
    client, _, _, _ = workspace_client

    broken_settings = _mock_settings()
    broken_settings.stripe_webhook_secret = None

    with patch(_MOCK_SETTINGS, broken_settings):
        res = _post_webhook(client, {"type": "test.event"})

    assert res.status_code == 503


# ─── Tests de eventos de Stripe ──────────────────────────────────────────────


def test_checkout_completed_activates_plan(workspace_client):
    """
    checkout.session.completed con customer_id del tenant
    → tenant.plan = 'starter', subscription_status = 'active'.
    """
    client, token, tenant, db = workspace_client
    _set_stripe_customer(tenant, db)

    event = _fake_event(
        "checkout.session.completed",
        {
            "customer": _FAKE_CUSTOMER_ID,
            "metadata": {"tenant_id": str(tenant.id)},
        },
    )

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        res = _post_webhook(client, event)

    assert res.status_code == 200
    assert res.json()["handled"] is True

    db.refresh(tenant)
    assert tenant.subscription_status == "active"
    assert tenant.trial_expires_at is None


def test_subscription_deleted_cancels_plan(workspace_client):
    """
    customer.subscription.deleted → tenant.plan = 'trial', subscription_status = 'canceled'.
    El taller queda bloqueado hasta que vuelva a pagar.
    """
    client, token, tenant, db = workspace_client
    _set_stripe_customer(tenant, db)
    tenant.plan = "starter"
    tenant.subscription_status = "active"
    db.commit()

    event = _fake_event(
        "customer.subscription.deleted",
        {"customer": _FAKE_CUSTOMER_ID, "metadata": {}},
    )

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        res = _post_webhook(client, event)

    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.plan == "trial"
    assert tenant.subscription_status == "canceled"


def test_payment_failed_marks_past_due(workspace_client):
    """invoice.payment_failed → subscription_status = 'past_due'."""
    client, token, tenant, db = workspace_client
    _set_stripe_customer(tenant, db)
    tenant.subscription_status = "active"
    db.commit()

    event = _fake_event(
        "invoice.payment_failed",
        {"customer": _FAKE_CUSTOMER_ID},
    )

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        res = _post_webhook(client, event)

    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.subscription_status == "past_due"


def test_subscription_updated_to_active(workspace_client):
    """customer.subscription.updated con status='active' → actualiza el tenant."""
    client, token, tenant, db = workspace_client
    _set_stripe_customer(tenant, db)
    tenant.subscription_status = "past_due"
    db.commit()

    event = _fake_event(
        "customer.subscription.updated",
        {
            "customer": _FAKE_CUSTOMER_ID,
            "status": "active",
            "metadata": {"tenant_id": str(tenant.id)},
            "items": {"data": [{"price": {"id": _FAKE_PRICE_STARTER}}]},
        },
    )

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        res = _post_webhook(client, event)

    assert res.status_code == 200

    db.refresh(tenant)
    assert tenant.subscription_status == "active"


def test_unknown_event_type_returns_handled_false(workspace_client):
    """Eventos de Stripe que no manejamos → {"handled": false} sin error."""
    client, _, _, _ = workspace_client

    event = _fake_event("some.unknown.event", {})

    with patch(_MOCK_SETTINGS, _mock_settings()), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        res = _post_webhook(client, event)

    assert res.status_code == 200
    assert res.json()["handled"] is False


# ─── Tests de endpoints de billing ───────────────────────────────────────────


def test_billing_status_returns_tenant_data(workspace_client):
    """GET /billing/status devuelve plan, subscription_status y trial_expires_at."""
    client, token, tenant, db = workspace_client

    res = client.get("/billing/status", headers=_auth_header(token))

    assert res.status_code == 200
    data = res.json()
    assert data["plan"] == "trial"
    assert "subscription_status" in data
    assert "trial_expires_at" in data


def test_billing_checkout_requires_admin_role(workspace_client):
    """Un operario no puede iniciar el proceso de pago — solo admin."""
    client, admin_token, _, _ = workspace_client

    # Crear operario en el mismo taller
    client.post(
        "/auth/admin/signup",
        json={
            "email": "operario@taller.dev",
            "password": "Admin1234!",
            "full_name": "Op",
        },
        headers=_auth_header(admin_token),
    )
    login = client.post(
        "/auth/login",
        json={"email": "operario@taller.dev", "password": "Admin1234!"},
    )
    operario_token = login.json()["access_token"]

    res = client.post(
        "/billing/checkout",
        json={"plan": "starter"},
        headers=_auth_header(operario_token),
    )

    assert res.status_code == 403


def test_billing_checkout_without_stripe_key_returns_503(workspace_client):
    """
    STRIPE_SECRET_KEY no configurado → 503 antes de llamar a Stripe.

    _PLAN_TO_PRICE se construye al importar el módulo con los valores reales del .env
    (vacíos en CI). Si "starter" mapea a None/vacío, el router devuelve 400 por plan
    inválido antes de llegar al check de stripe_secret_key. Por eso también patcheamos
    _PLAN_TO_PRICE para que el plan pase la validación y lleguemos al check de la key.
    """
    client, token, _, _ = workspace_client

    broken_settings = _mock_settings()
    broken_settings.stripe_secret_key = None

    with patch(
        "backend.features.billing.router._PLAN_TO_PRICE",
        {"starter": "price_test", "pro": "price_pro_test"},
    ), patch(_MOCK_ROUTER_SETTINGS, broken_settings):
        res = client.post(
            "/billing/checkout",
            json={"plan": "starter"},
            headers=_auth_header(token),
        )

    assert res.status_code == 503


def test_billing_checkout_with_invalid_plan_returns_400(workspace_client):
    """Plan no válido ('enterprise' no existe) → 400 antes de llamar a Stripe."""
    client, token, _, _ = workspace_client

    mock_s = _mock_settings()

    with patch(_MOCK_ROUTER_SETTINGS, mock_s), patch(_MOCK_SETTINGS, mock_s):
        res = client.post(
            "/billing/checkout",
            json={"plan": "enterprise"},
            headers=_auth_header(token),
        )

    assert res.status_code == 400


def test_billing_portal_without_stripe_customer_returns_400(workspace_client):
    """
    GET /billing/portal sin stripe_customer_id en el tenant → 400.
    El taller nunca ha hecho checkout, no tiene customer en Stripe todavía.
    """
    client, token, tenant, db = workspace_client
    assert tenant.stripe_customer_id is None

    mock_s = _mock_settings()

    with patch(_MOCK_ROUTER_SETTINGS, mock_s), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.billing_portal.Session.create.side_effect = ValueError(
            "Este taller aún no tiene una suscripción activa en Stripe."
        )

        res = client.get("/billing/portal", headers=_auth_header(token))

    assert res.status_code == 400
