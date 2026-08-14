"""
Tests HTTP del router de stock (materiales): CRUD, consumo/reabastecimiento,
generador de variantes y parseo de albarán con IA.

Usa `stock_client` (admin sin tenant) para los casos CRUD, de autorización
y de negocio (consumo/reabastecimiento). Aislamiento multi-tenant completo
vive en test_stock_isolation.py.
"""
import json

import pytest

from backend.core.config import settings


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


def _create_operario(client, admin_token: str, email: str, full_name: str = "Operario Test"):
    return client.post(
        "/auth/admin/signup",
        json={
            "email": email,
            "password": "Operario123!",
            "full_name": full_name,
            "role": "operario",
        },
        headers=_auth_header(admin_token),
    )


def _create_material(client, token: str, **overrides):
    payload = {"name": "Varilla soldadura 3.2mm", "quantity": 10, "minimum": 5, "unit": "kg"}
    payload.update(overrides)
    return client.post("/stock", json=payload, headers=_auth_header(token))


# ─── Creación ──────────────────────────────────────────────────────────────


def test_create_material_requires_admin_role(stock_client):
    # ARRANGE
    admin_token = _admin_token(stock_client)
    _create_operario(stock_client, admin_token, "operario1@weldix.dev")
    operario_token = _login(stock_client, "operario1@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = _create_material(stock_client, operario_token)

    # ASSERT
    assert response.status_code == 403


def test_create_material_happy_path_computes_level_and_tone(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = _create_material(stock_client, token, quantity=10, minimum=20)

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Varilla soldadura 3.2mm"
    # 10/20 = 50% -> tone "warning" (entre 30 y 70)
    assert body["level"] == 50
    assert body["tone"] == "warning"


def test_create_material_without_token_returns_401(stock_client):
    # ACT
    response = stock_client.post("/stock", json={"name": "Chapa"})

    # ASSERT
    assert response.status_code == 401


def test_create_material_with_invalid_category_returns_422(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = _create_material(stock_client, token, category="categoria_inexistente")

    # ASSERT
    assert response.status_code == 422


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_stock_returns_all_materials(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    _create_material(stock_client, token, name="Material 1")
    _create_material(stock_client, token, name="Material 2")

    # ACT
    response = stock_client.get("/stock", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 2


# ─── Actualización parcial — PATCH /{id} ──────────────────────────────────────


def test_update_material_partial_changes_only_sent_fields(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, name="Original", quantity=10).json()

    # ACT
    response = stock_client.patch(
        f"/stock/{material['id']}", json={"name": "Renombrado"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renombrado"
    assert body["quantity"] == 10


def test_update_material_requires_admin_role(stock_client):
    # ARRANGE
    admin_token = _admin_token(stock_client)
    material = _create_material(stock_client, admin_token).json()
    _create_operario(stock_client, admin_token, "updater@weldix.dev")
    operario_token = _login(stock_client, "updater@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = stock_client.patch(
        f"/stock/{material['id']}",
        json={"name": "Intento no autorizado"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_update_material_returns_404_when_not_found(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = stock_client.patch(
        "/stock/999999", json={"name": "X"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Borrado — DELETE /{id} ────────────────────────────────────────────────────


def test_delete_material_removes_it(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token).json()

    # ACT
    delete_response = stock_client.delete(f"/stock/{material['id']}", headers=_auth_header(token))
    list_response = stock_client.get("/stock", headers=_auth_header(token))

    # ASSERT
    assert delete_response.status_code == 204
    assert list_response.json() == []


def test_delete_material_requires_admin_role(stock_client):
    # ARRANGE
    admin_token = _admin_token(stock_client)
    material = _create_material(stock_client, admin_token).json()
    _create_operario(stock_client, admin_token, "deleter@weldix.dev")
    operario_token = _login(stock_client, "deleter@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = stock_client.delete(
        f"/stock/{material['id']}", headers=_auth_header(operario_token)
    )

    # ASSERT
    assert response.status_code == 403


def test_delete_material_returns_404_when_not_found(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = stock_client.delete("/stock/999999", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


# ─── Consumo — POST /{id}/consume ─────────────────────────────────────────────


def test_consume_material_reduces_quantity(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, quantity=10).json()

    # ACT
    response = stock_client.post(
        f"/stock/{material['id']}/consume", json={"consumed": 4}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["quantity"] == 6


def test_consume_more_than_available_is_blocked_not_negative(stock_client):
    """El servicio rechaza el consumo si excede el stock disponible — no lo
    deja en negativo (backend/features/stock/service.py::consume_material)."""
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, quantity=10).json()

    # ACT
    response = stock_client.post(
        f"/stock/{material['id']}/consume", json={"consumed": 15}, headers=_auth_header(token)
    )

    # ASSERT — bloqueado con 400, y la cantidad no se tocó
    assert response.status_code == 400
    check = stock_client.get("/stock", headers=_auth_header(token))
    assert check.json()[0]["quantity"] == 10


def test_consume_exact_available_quantity_leaves_zero(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, quantity=10).json()

    # ACT
    response = stock_client.post(
        f"/stock/{material['id']}/consume", json={"consumed": 10}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["quantity"] == 0


def test_consume_of_nonexistent_material_returns_404(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = stock_client.post(
        "/stock/999999/consume", json={"consumed": 1}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


def test_consume_negative_amount_returns_422(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, quantity=10).json()

    # ACT — ConsumeMaterialRequest exige consumed > 0
    response = stock_client.post(
        f"/stock/{material['id']}/consume", json={"consumed": -5}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 422


# ─── Reabastecimiento — POST /{id}/restock ────────────────────────────────────


def test_restock_material_increases_quantity(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, quantity=10).json()

    # ACT
    response = stock_client.post(
        f"/stock/{material['id']}/restock", json={"cantidad": 5}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["quantity"] == 15


def test_restock_of_nonexistent_material_returns_404(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT
    response = stock_client.post(
        "/stock/999999/restock", json={"cantidad": 5}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Generador de variantes — POST /generar-variantes ─────────────────────────


def test_generar_variantes_requires_admin_role(stock_client):
    # ARRANGE
    admin_token = _admin_token(stock_client)
    _create_operario(stock_client, admin_token, "variantes@weldix.dev")
    operario_token = _login(stock_client, "variantes@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = stock_client.post(
        "/stock/generar-variantes",
        json={"category": "tornilleria", "attribute_values": {"metrica": ["M6", "M8"]}},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_generar_variantes_creates_one_material_per_combination(stock_client):
    # ARRANGE
    token = _admin_token(stock_client)

    # ACT — 2 métricas x 2 longitudes = 4 combinaciones
    response = stock_client.post(
        "/stock/generar-variantes",
        json={
            "category": "tornilleria",
            "attribute_values": {"metrica": ["M6", "M8"], "longitud_mm": [20, 30]},
        },
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["creadas"] == 4
    assert body["omitidas"] == 0
    assert len(body["materiales"]) == 4


def test_generar_variantes_skips_ones_that_already_exist(stock_client):
    """Repetir la misma generación no duplica — 'omitidas' cuenta los que ya
    existen con el mismo display_name (backend/features/stock/service.py)."""
    # ARRANGE
    token = _admin_token(stock_client)
    payload = {"category": "tornilleria", "attribute_values": {"metrica": ["M6", "M8"]}}
    stock_client.post("/stock/generar-variantes", json=payload, headers=_auth_header(token))

    # ACT — se repite la misma generación
    response = stock_client.post(
        "/stock/generar-variantes", json=payload, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["creadas"] == 0
    assert body["omitidas"] == 2


# ─── Parseo de albarán con IA — POST /parse-albaran ───────────────────────────


def test_parse_albaran_without_mistral_key_returns_400(stock_client, monkeypatch):
    # ARRANGE — guard clause de service.py::parse_albaran_with_ia sin API key
    monkeypatch.setattr(settings, "mistral_api_key", None)
    token = _admin_token(stock_client)

    # ACT
    response = stock_client.post(
        "/stock/parse-albaran",
        json={"texto": "Albaran de prueba con materiales varios"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 400


def test_parse_albaran_requires_admin_role(stock_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    admin_token = _admin_token(stock_client)
    _create_operario(stock_client, admin_token, "albaran@weldix.dev")
    operario_token = _login(stock_client, "albaran@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = stock_client.post(
        "/stock/parse-albaran",
        json={"texto": "Albaran de prueba con materiales varios"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


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
    def __init__(self, content: str):
        self._content = content

    def complete(self, model, messages):  # noqa: ARG002 — firma exigida por el service
        return _FakeResponse(self._content)


def _make_fake_mistral(content: str):
    class _FakeMistral:
        def __init__(self, api_key):  # noqa: ARG002
            self.chat = _FakeChatNamespace(content)

    return _FakeMistral


def test_parse_albaran_happy_path_returns_matched_materials(stock_client, monkeypatch):
    """Mockea la clase Mistral — NUNCA se llama a la IA real en tests."""
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    token = _admin_token(stock_client)
    material = _create_material(stock_client, token, name="Varilla 3.2mm").json()

    fake_response = json.dumps(
        [
            {
                "material_id": material["id"],
                "name": material["name"],
                "cantidad": 25,
                "linea_albaran": "Varilla soldadura 3.2mm x 25",
                "confianza": "alta",
            }
        ]
    )
    monkeypatch.setattr("mistralai.Mistral", _make_fake_mistral(fake_response))

    # ACT
    response = stock_client.post(
        "/stock/parse-albaran",
        json={"texto": "Varilla soldadura 3.2mm x 25 unidades recibidas"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["material_id"] == material["id"]
    assert body[0]["cantidad"] == 25


def test_parse_albaran_with_empty_catalog_returns_empty_list(stock_client, monkeypatch):
    """Guard clause: sin materiales en el tenant, ni siquiera llama a la IA."""
    # ARRANGE — no se crea ningún material
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    token = _admin_token(stock_client)

    def _boom(*args, **kwargs):
        raise AssertionError("No debería llamarse a Mistral con catálogo vacío")

    monkeypatch.setattr("mistralai.Mistral", _boom)

    # ACT
    response = stock_client.post(
        "/stock/parse-albaran",
        json={"texto": "Un albaran cualquiera con texto suficientemente largo"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json() == []


def test_parse_albaran_ia_error_returns_502(stock_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    token = _admin_token(stock_client)
    _create_material(stock_client, token, name="Varilla 3.2mm")

    class _BrokenMistral:
        def __init__(self, api_key):  # noqa: ARG002
            raise RuntimeError("Timeout de red simulado")

    monkeypatch.setattr("mistralai.Mistral", _BrokenMistral)

    # ACT
    response = stock_client.post(
        "/stock/parse-albaran",
        json={"texto": "Albaran de prueba con materiales varios"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 502
