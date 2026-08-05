"""
Tests de aislamiento multi-tenant para billing.

Verifican que el admin de un taller nunca ve ni afecta el estado de
suscripción de otro taller. El aislamiento se garantiza porque los
endpoints de billing derivan el tenant de `current_user.tenant_id` —
nunca de un parámetro que el cliente pueda manipular — y porque el
webhook resuelve el tenant por `stripe_customer_id` (columna `unique`).

Si alguno de estos tests falla, un taller podría ver o modificar la
facturación de otro. Usa la fixture local `two_tenants_billing_client`
(tests/features/billing/conftest.py) porque `two_tenants_client` del
conftest raíz no monta el billing_router.
"""
import json
from unittest.mock import MagicMock, patch

import stripe as stripe_real

_MOCK_STRIPE = "backend.features.billing.service.stripe"
_MOCK_SERVICE_SETTINGS = "backend.features.billing.service.settings"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _mock_settings() -> MagicMock:
    m = MagicMock()
    m.stripe_secret_key = "sk_test_fake"
    m.stripe_webhook_secret = "whsec_test_secret"
    return m


def _fake_event(event_type: str, data: dict) -> dict:
    return {"type": event_type, "data": {"object": data}}


def _post_webhook(client, event: dict, sig: str = "t=123,v1=fakesig"):
    return client.post(
        "/billing/webhook",
        content=json.dumps(event).encode(),
        headers={"Content-Type": "application/json", "stripe-signature": sig},
    )


# ─── /billing/status está aislado por tenant ─────────────────────────────────


def test_billing_status_is_scoped_to_own_tenant(two_tenants_billing_client):
    """Admin A y Admin B ven planes y estados de suscripción independientes."""
    client, token_a, token_b, tenant_a, tenant_b, db = two_tenants_billing_client
    tenant_a.plan = "active"
    tenant_a.subscription_status = "active"
    tenant_a.stripe_customer_id = "cus_taller_a"
    db.commit()

    response_a = client.get("/billing/status", headers=_auth_header(token_a))
    response_b = client.get("/billing/status", headers=_auth_header(token_b))

    assert response_a.json()["plan"] == "active"
    assert response_a.json()["stripe_customer_id"] == "cus_taller_a"
    assert response_b.json()["plan"] == "trial"
    assert response_b.json()["stripe_customer_id"] is None


# ─── /billing/portal está aislado por tenant ─────────────────────────────────


def test_portal_uses_own_tenant_stripe_customer_not_the_other_tenants(
    two_tenants_billing_client,
):
    """
    El admin de B tiene su propio stripe_customer_id. El portal debe usar el
    de B, nunca el de A, aunque ambos se resuelvan en el mismo request ciclo.
    """
    client, token_a, token_b, tenant_a, tenant_b, db = two_tenants_billing_client
    tenant_a.stripe_customer_id = "cus_taller_a"
    tenant_b.stripe_customer_id = "cus_taller_b"
    db.commit()
    mock_settings = _mock_settings()

    with (
        patch("backend.features.billing.router.settings", mock_settings),
        patch(_MOCK_SERVICE_SETTINGS, mock_settings),
        patch(_MOCK_STRIPE) as mock_stripe,
    ):
        mock_stripe.billing_portal.Session.create.return_value = MagicMock(
            url="https://billing.stripe.com/p/session_b"
        )

        response_b = client.get("/billing/portal", headers=_auth_header(token_b))

    assert response_b.status_code == 200
    called_kwargs = mock_stripe.billing_portal.Session.create.call_args.kwargs
    assert called_kwargs["customer"] == "cus_taller_b"


# ─── El webhook solo toca al tenant cuyo customer_id coincide ────────────────


def test_webhook_for_tenant_a_customer_does_not_touch_tenant_b(
    two_tenants_billing_client,
):
    """
    checkout.session.completed para el customer de A activa el plan de A
    y deja a B intacto, aunque el endpoint de webhook sea el mismo para
    todos los tenants (Stripe no manda el tenant, manda el customer_id).
    """
    client, _token_a, _token_b, tenant_a, tenant_b, db = two_tenants_billing_client
    tenant_a.stripe_customer_id = "cus_taller_a"
    db.commit()

    event = _fake_event(
        "checkout.session.completed",
        {"customer": "cus_taller_a", "metadata": {"tenant_id": str(tenant_a.id)}},
    )
    mock_settings = _mock_settings()

    with patch(_MOCK_SERVICE_SETTINGS, mock_settings), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        response = _post_webhook(client, event)

    assert response.status_code == 200
    db.refresh(tenant_a)
    db.refresh(tenant_b)
    assert tenant_a.subscription_status == "active"
    assert tenant_b.subscription_status is None
    assert tenant_b.plan == "trial"


def test_webhook_subscription_deleted_only_cancels_matching_tenant(
    two_tenants_billing_client,
):
    """customer.subscription.deleted del customer de B no cancela el plan de A."""
    client, _token_a, _token_b, tenant_a, tenant_b, db = two_tenants_billing_client
    tenant_a.stripe_customer_id = "cus_taller_a"
    tenant_a.plan = "active"
    tenant_a.subscription_status = "active"
    tenant_b.stripe_customer_id = "cus_taller_b"
    tenant_b.plan = "active"
    tenant_b.subscription_status = "active"
    db.commit()

    event = _fake_event(
        "customer.subscription.deleted",
        {"customer": "cus_taller_b", "metadata": {}},
    )
    mock_settings = _mock_settings()

    with patch(_MOCK_SERVICE_SETTINGS, mock_settings), patch(_MOCK_STRIPE) as mock_stripe:
        mock_stripe.error.SignatureVerificationError = (
            stripe_real.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.return_value = event

        response = _post_webhook(client, event)

    assert response.status_code == 200
    db.refresh(tenant_a)
    db.refresh(tenant_b)
    assert tenant_a.plan == "active"
    assert tenant_a.subscription_status == "active"
    assert tenant_b.plan == "trial"
    assert tenant_b.subscription_status == "canceled"
