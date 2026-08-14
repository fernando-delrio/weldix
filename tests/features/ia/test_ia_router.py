"""
Tests HTTP del router de ia:
  - POST /ia/consulta       — chat con contexto del taller (requiere auth)
  - POST /ia/landing-chat   — chat público de venta (sin auth)

Mockea SIEMPRE la clase Mistral con monkeypatch — nunca se llama a la IA real.

`ia/service.py` hace `from mistralai import Mistral` a nivel de módulo (no
dentro de una función, a diferencia de stock/service.py), así que hay que
parchear el nombre ya importado en el módulo del servicio
(`backend.features.ia.service.Mistral`), no el atributo de `mistralai`.
"""
import pytest

from backend.core.config import settings
from backend.features.ia import router as ia_router_module

MISTRAL_TARGET = "backend.features.ia.service.Mistral"


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str):
        self.choices = [_FakeChoice(content)]


class _FakeChatNamespace:
    def __init__(self, content: str, capture: list | None):
        self._content = content
        self._capture = capture

    def complete(self, model, messages):  # noqa: ARG002 — firma exigida por el service
        if self._capture is not None:
            self._capture.append(messages)
        return _FakeResponse(self._content)


def _make_fake_mistral(content: str = "Respuesta simulada de la IA", capture: list | None = None):
    class _FakeMistral:
        def __init__(self, api_key):  # noqa: ARG002
            self.chat = _FakeChatNamespace(content, capture)

    return _FakeMistral


# ─── /ia/consulta — guard clauses y errores ───────────────────────────────────


def test_consulta_requires_auth(ia_client):
    # ACT — sin cabecera de autorización
    response = ia_client.post("/ia/consulta", json={"mensaje": "hola"})

    # ASSERT
    assert response.status_code == 401


def test_consulta_without_mistral_key_returns_503(ia_client, monkeypatch):
    # ARRANGE — guard clause de service.py::consultar sin API key
    monkeypatch.setattr(settings, "mistral_api_key", None)
    token = _admin_token(ia_client)

    # ACT
    response = ia_client.post(
        "/ia/consulta", json={"mensaje": "hola"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 503


def test_consulta_ia_error_returns_502(ia_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    token = _admin_token(ia_client)

    class _BrokenMistral:
        def __init__(self, api_key):  # noqa: ARG002
            raise RuntimeError("Timeout de red simulado")

    monkeypatch.setattr(MISTRAL_TARGET, _BrokenMistral)

    # ACT
    response = ia_client.post(
        "/ia/consulta", json={"mensaje": "hola"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 502


def test_consulta_happy_path_returns_respuesta(ia_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral("Usa electrodo E7018"))
    token = _admin_token(ia_client)

    # ACT
    response = ia_client.post(
        "/ia/consulta",
        json={"mensaje": "¿qué electrodo uso para acero al carbono?"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["respuesta"] == "Usa electrodo E7018"


# ─── /ia/consulta — aislamiento del contexto por tenant ───────────────────────


def test_consulta_context_includes_own_tenant_job(two_tenants_ia_client, monkeypatch):
    """El system prompt enviado a la IA debe incluir los trabajos del propio tenant."""
    # ARRANGE
    client, token_a, _token_b = two_tenants_ia_client
    client.post(
        "/trabajos",
        json={"titulo": "OT EXCLUSIVA TENANT A", "cliente": "Cliente A"},
        headers=_auth_header(token_a),
    )
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    captured: list = []
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral(capture=captured))

    # ACT
    response = client.post(
        "/ia/consulta", json={"mensaje": "resume mis trabajos"}, headers=_auth_header(token_a)
    )

    # ASSERT
    assert response.status_code == 200
    system_content = captured[0][0]["content"]
    assert "OT EXCLUSIVA TENANT A" in system_content


def test_consulta_context_excludes_other_tenant_job(two_tenants_ia_client, monkeypatch):
    """El system prompt de un tenant NUNCA debe incluir trabajos de otro tenant."""
    # ARRANGE
    client, token_a, token_b = two_tenants_ia_client
    client.post(
        "/trabajos",
        json={"titulo": "OT EXCLUSIVA TENANT A", "cliente": "Cliente A"},
        headers=_auth_header(token_a),
    )
    client.post(
        "/trabajos",
        json={"titulo": "OT EXCLUSIVA TENANT B", "cliente": "Cliente B"},
        headers=_auth_header(token_b),
    )
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    captured: list = []
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral(capture=captured))

    # ACT — pregunta el admin del tenant A
    response = client.post(
        "/ia/consulta", json={"mensaje": "resume mis trabajos"}, headers=_auth_header(token_a)
    )

    # ASSERT — el prompt de A no debe mencionar la OT de B
    assert response.status_code == 200
    system_content = captured[0][0]["content"]
    assert "OT EXCLUSIVA TENANT B" not in system_content


def test_consulta_context_excludes_other_tenant_stock(two_tenants_ia_client, monkeypatch):
    """El contexto de stock que se pasa a la IA está filtrado por tenant."""
    # ARRANGE
    client, token_a, token_b = two_tenants_ia_client
    client.post(
        "/stock",
        json={"name": "MATERIAL EXCLUSIVO TENANT A", "quantity": 5, "minimum": 2, "unit": "kg"},
        headers=_auth_header(token_a),
    )
    client.post(
        "/stock",
        json={"name": "MATERIAL EXCLUSIVO TENANT B", "quantity": 5, "minimum": 2, "unit": "kg"},
        headers=_auth_header(token_b),
    )
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    captured: list = []
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral(capture=captured))

    # ACT
    response = client.post(
        "/ia/consulta", json={"mensaje": "¿cómo va el stock?"}, headers=_auth_header(token_a)
    )

    # ASSERT
    assert response.status_code == 200
    system_content = captured[0][0]["content"]
    assert "MATERIAL EXCLUSIVO TENANT A" in system_content
    assert "MATERIAL EXCLUSIVO TENANT B" not in system_content


# ─── /ia/landing-chat — público, sin auth, sin datos de taller ───────────────


def test_landing_chat_does_not_require_auth(ia_client, monkeypatch):
    # ARRANGE — sin login, sin Authorization header
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral("Hola, soy el asistente de Weldix"))

    # ACT
    response = ia_client.post("/ia/landing-chat", json={"mensaje": "¿cuánto cuesta Weldix?"})

    # ASSERT
    assert response.status_code == 200
    assert response.json()["respuesta"] == "Hola, soy el asistente de Weldix"


def test_landing_chat_without_mistral_key_returns_503(ia_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)

    # ACT
    response = ia_client.post("/ia/landing-chat", json={"mensaje": "hola"})

    # ASSERT
    assert response.status_code == 503


def test_landing_chat_never_sends_tenant_data_to_ia(two_tenants_ia_client, monkeypatch):
    """
    El chat del landing es público y de venta: no debe tener visibilidad de OTs
    ni stock de ningún taller. Su system prompt es fijo (_LANDING_PROMPT) y no
    depende de ningún dato dinámico del tenant, a diferencia de /ia/consulta.
    """
    # ARRANGE — hay datos reales de un taller en la BD
    client, token_a, _token_b = two_tenants_ia_client
    client.post(
        "/trabajos",
        json={"titulo": "OT SECRETA DEL TALLER", "cliente": "Cliente confidencial"},
        headers=_auth_header(token_a),
    )
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    captured: list = []
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral(capture=captured))

    # ACT — se llama SIN token, como lo haría un visitante de la landing
    response = client.post("/ia/landing-chat", json={"mensaje": "¿qué hace Weldix?"})

    # ASSERT — el prompt no contiene ningún dato del taller
    assert response.status_code == 200
    system_content = captured[0][0]["content"]
    assert "OT SECRETA DEL TALLER" not in system_content
    assert "Cliente confidencial" not in system_content


def test_landing_chat_rejects_empty_message_returns_422(ia_client):
    # ACT — LandingChatRequest exige min_length=1
    response = ia_client.post("/ia/landing-chat", json={"mensaje": ""})

    # ASSERT
    assert response.status_code == 422


def test_landing_chat_blocks_after_rate_limit_exceeded(ia_client, monkeypatch):
    """
    HALLAZGO (no es un bug de aislamiento): el endpoint SÍ tiene rate limiting
    propio — 20 peticiones / 10 min por IP, en memoria (`_landing_hits` en
    backend/features/ia/router.py). Este test confirma que el límite se aplica.
    """
    # ARRANGE — resetea el estado en memoria para no heredar hits de otros tests
    monkeypatch.setattr(ia_router_module, "_landing_hits", {})
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    monkeypatch.setattr(MISTRAL_TARGET, _make_fake_mistral("ok"))

    # ACT — agota las 20 peticiones permitidas
    responses = [
        ia_client.post("/ia/landing-chat", json={"mensaje": f"pregunta {i}"})
        for i in range(20)
    ]
    blocked = ia_client.post("/ia/landing-chat", json={"mensaje": "pregunta 21"})

    # ASSERT
    assert all(r.status_code == 200 for r in responses)
    assert blocked.status_code == 429
