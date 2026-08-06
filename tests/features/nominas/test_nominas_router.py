"""
Tests HTTP del router de nominas: subida de PDF, análisis con IA, listado,
descarga y borrado.

`extraer_importes_nomina` (backend/features/nominas/service.py) hace
`from mistralai import Mistral` DENTRO de la función (import local, no de
módulo), así que — a diferencia de ia/service.py — aquí sí funciona
monkeypatchear el atributo `mistralai.Mistral` directamente (mismo patrón que
tests/features/stock/test_stock_router.py).
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


def _upload(client, token: str, pdf_bytes: bytes, operario_id: int, year: int = 2026, month: int = 3, content_type: str = "application/pdf"):
    return client.post(
        "/nominas/upload",
        data={"operario_id": operario_id, "year": year, "month": month},
        files={"file": ("nomina.pdf", pdf_bytes, content_type)},
        headers=_auth_header(token),
    )


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


_IMPORTES_JSON = json.dumps({"importe_bruto": 2000.0, "importe_neto": 1650.5})


# ─── Subida — POST /nominas/upload ────────────────────────────────────────────


def test_upload_nomina_requires_admin_role(nominas_client, sample_pdf_bytes):
    # ARRANGE
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario1@weldix.dev").json()

    operario_token = _login(nominas_client, "operario1@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = _upload(nominas_client, operario_token, sample_pdf_bytes, operario["id"])

    # ASSERT
    assert response.status_code == 403


def test_upload_nomina_rejects_non_pdf_content_type(nominas_client, sample_pdf_bytes):
    # ARRANGE
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario2@weldix.dev").json()

    # ACT — content-type declarado como texto plano
    response = _upload(
        nominas_client, admin_token, sample_pdf_bytes, operario["id"], content_type="text/plain"
    )

    # ASSERT
    assert response.status_code == 400


def test_upload_nomina_rejects_invalid_pdf_magic_bytes(nominas_client):
    # ARRANGE — content-type correcto pero el contenido no empieza por %PDF
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario3@weldix.dev").json()
    fake_pdf = b"esto no es un PDF de verdad, solo texto plano"

    # ACT
    response = _upload(nominas_client, admin_token, fake_pdf, operario["id"])

    # ASSERT
    assert response.status_code == 400


def test_upload_nomina_invalid_month_returns_400(nominas_client, sample_pdf_bytes):
    # ARRANGE
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario4@weldix.dev").json()

    # ACT
    response = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"], month=13)

    # ASSERT
    assert response.status_code == 400


def test_upload_nomina_without_mistral_key_still_succeeds_without_importes(
    nominas_client, sample_pdf_bytes, monkeypatch
):
    """extraer_importes_nomina es best-effort: sin API key, la subida no se rompe."""
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario5@weldix.dev").json()

    # ACT
    response = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"])

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["importe_bruto"] is None
    assert body["importe_neto"] is None


def test_upload_nomina_happy_path_extracts_importes_with_ia(
    nominas_client, sample_pdf_bytes, monkeypatch
):
    """Mockea la clase Mistral — NUNCA se llama a la IA real en tests."""
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    monkeypatch.setattr("mistralai.Mistral", _make_fake_mistral(_IMPORTES_JSON))
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario6@weldix.dev").json()

    # ACT
    response = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"])

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["importe_bruto"] == 2000.0
    assert body["importe_neto"] == 1650.5
    assert body["operario_id"] == operario["id"]


def test_upload_nomina_replaces_existing_for_same_operario_month(
    nominas_client, sample_pdf_bytes, monkeypatch
):
    """Subir dos veces para el mismo operario/año/mes reemplaza, no duplica."""
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "operario7@weldix.dev").json()
    _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"], year=2026, month=5)

    # ACT — se sube de nuevo para el mismo operario/año/mes
    second = _upload(
        nominas_client, admin_token, sample_pdf_bytes, operario["id"], year=2026, month=5
    )

    # ASSERT — solo hay una nómina para ese operario/mes
    assert second.status_code == 201
    listing = nominas_client.get("/nominas", headers=_auth_header(admin_token))
    matching = [n for n in listing.json() if n["operario_id"] == operario["id"] and n["month"] == 5]
    assert len(matching) == 1


# ─── Listado — admin ve todas, operario ve solo las suyas ────────────────────


def test_list_nominas_requires_admin_role(nominas_client, sample_pdf_bytes):
    # ARRANGE
    admin_token = _admin_token(nominas_client)
    _create_operario(nominas_client, admin_token, "operario8@weldix.dev")
    operario_token = _login(nominas_client, "operario8@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = nominas_client.get("/nominas", headers=_auth_header(operario_token))

    # ASSERT
    assert response.status_code == 403


def test_list_nominas_admin_returns_all_in_tenant(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    op_a = _create_operario(nominas_client, admin_token, "opA@weldix.dev").json()
    op_b = _create_operario(nominas_client, admin_token, "opB@weldix.dev").json()
    _upload(nominas_client, admin_token, sample_pdf_bytes, op_a["id"], month=1)
    _upload(nominas_client, admin_token, sample_pdf_bytes, op_b["id"], month=2)

    # ACT
    response = nominas_client.get("/nominas", headers=_auth_header(admin_token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_mis_nominas_returns_only_own(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    op_a = _create_operario(nominas_client, admin_token, "opA2@weldix.dev").json()
    op_b = _create_operario(nominas_client, admin_token, "opB2@weldix.dev").json()
    _upload(nominas_client, admin_token, sample_pdf_bytes, op_a["id"], month=1)
    _upload(nominas_client, admin_token, sample_pdf_bytes, op_b["id"], month=2)
    token_a = _login(nominas_client, "opA2@weldix.dev", "Operario123!").json()["access_token"]

    # ACT
    response = nominas_client.get("/nominas/mias", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["operario_id"] == op_a["id"]


# ─── Re-análisis — POST /{id}/analizar ────────────────────────────────────────


def test_reanalizar_nomina_updates_importes(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE — se sube sin IA (importes null) y luego se reanaliza con IA mockeada
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "opreanaliza@weldix.dev").json()
    nomina = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"]).json()
    assert nomina["importe_neto"] is None

    monkeypatch.setattr(settings, "mistral_api_key", "fake-key-for-test")
    monkeypatch.setattr("mistralai.Mistral", _make_fake_mistral(_IMPORTES_JSON))

    # ACT
    response = nominas_client.post(
        f"/nominas/{nomina['id']}/analizar", headers=_auth_header(admin_token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["importe_neto"] == 1650.5


def test_reanalizar_nomina_not_found_returns_404(nominas_client):
    # ARRANGE
    admin_token = _admin_token(nominas_client)

    # ACT
    response = nominas_client.post("/nominas/999999/analizar", headers=_auth_header(admin_token))

    # ASSERT
    assert response.status_code == 404


# ─── Borrado — DELETE /{id} ───────────────────────────────────────────────────


def test_delete_nomina_removes_record_and_file(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "opdelete@weldix.dev").json()
    nomina = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"]).json()

    # ACT
    delete_response = nominas_client.delete(
        f"/nominas/{nomina['id']}", headers=_auth_header(admin_token)
    )
    listing = nominas_client.get("/nominas", headers=_auth_header(admin_token))

    # ASSERT
    assert delete_response.status_code == 204
    assert listing.json() == []


def test_delete_nomina_not_found_returns_404(nominas_client):
    # ARRANGE
    admin_token = _admin_token(nominas_client)

    # ACT
    response = nominas_client.delete("/nominas/999999", headers=_auth_header(admin_token))

    # ASSERT
    assert response.status_code == 404


# ─── Descarga — GET /{id}/descargar ───────────────────────────────────────────


def test_descargar_nomina_admin_can_download_any(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "opdownload@weldix.dev").json()
    nomina = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"]).json()

    # ACT
    response = nominas_client.get(
        f"/nominas/{nomina['id']}/descargar", headers=_auth_header(admin_token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == sample_pdf_bytes


def test_descargar_nomina_operario_can_download_own(nominas_client, sample_pdf_bytes, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    operario = _create_operario(nominas_client, admin_token, "opdownloadself@weldix.dev").json()
    nomina = _upload(nominas_client, admin_token, sample_pdf_bytes, operario["id"]).json()
    operario_token = _login(
        nominas_client, "opdownloadself@weldix.dev", "Operario123!"
    ).json()["access_token"]

    # ACT
    response = nominas_client.get(
        f"/nominas/{nomina['id']}/descargar", headers=_auth_header(operario_token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.content == sample_pdf_bytes


def test_descargar_nomina_operario_cannot_download_others_returns_403(
    nominas_client, sample_pdf_bytes, monkeypatch
):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    admin_token = _admin_token(nominas_client)
    victim = _create_operario(nominas_client, admin_token, "victima@weldix.dev").json()
    nomina = _upload(nominas_client, admin_token, sample_pdf_bytes, victim["id"]).json()
    _create_operario(nominas_client, admin_token, "intruso@weldix.dev")
    intruso_token = _login(nominas_client, "intruso@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = nominas_client.get(
        f"/nominas/{nomina['id']}/descargar", headers=_auth_header(intruso_token)
    )

    # ASSERT
    assert response.status_code == 403


# ─── Aislamiento multi-tenant ──────────────────────────────────────────────────


def _operario_id_for_tenant(client, admin_token, email):
    return _create_operario(client, admin_token, email).json()["id"]


def test_tenant_a_list_does_not_include_tenant_b_nominas(
    two_tenants_nominas_client, sample_pdf_bytes, monkeypatch
):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    client, token_a, token_b = two_tenants_nominas_client
    op_a = _operario_id_for_tenant(client, token_a, "opA-t1@weldix.dev")
    op_b = _operario_id_for_tenant(client, token_b, "opB-t1@weldix.dev")
    _upload(client, token_a, sample_pdf_bytes, op_a, month=1)
    _upload(client, token_b, sample_pdf_bytes, op_b, month=2)

    # ACT
    response = client.get("/nominas", headers=_auth_header(token_a))

    # ASSERT — el admin del tenant A solo ve la nómina de su propio taller
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["operario_id"] == op_a


def test_tenant_a_cannot_download_tenant_b_nomina_returns_404(
    two_tenants_nominas_client, sample_pdf_bytes, monkeypatch
):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    client, token_a, token_b = two_tenants_nominas_client
    op_b = _operario_id_for_tenant(client, token_b, "opB-t2@weldix.dev")
    nomina_b = _upload(client, token_b, sample_pdf_bytes, op_b, month=3).json()

    # ACT — el admin del tenant A intenta descargar la nómina del tenant B por id
    response = client.get(f"/nominas/{nomina_b['id']}/descargar", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404


def test_tenant_a_cannot_reanalizar_tenant_b_nomina_returns_404(
    two_tenants_nominas_client, sample_pdf_bytes, monkeypatch
):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    client, token_a, token_b = two_tenants_nominas_client
    op_b = _operario_id_for_tenant(client, token_b, "opB-t3@weldix.dev")
    nomina_b = _upload(client, token_b, sample_pdf_bytes, op_b, month=4).json()

    # ACT
    response = client.post(f"/nominas/{nomina_b['id']}/analizar", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404


def test_tenant_a_cannot_delete_tenant_b_nomina_returns_404(
    two_tenants_nominas_client, sample_pdf_bytes, monkeypatch
):
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    client, token_a, token_b = two_tenants_nominas_client
    op_b = _operario_id_for_tenant(client, token_b, "opB-t4@weldix.dev")
    nomina_b = _upload(client, token_b, sample_pdf_bytes, op_b, month=5).json()

    # ACT
    response = client.delete(f"/nominas/{nomina_b['id']}", headers=_auth_header(token_a))
    still_there = client.get(f"/nominas/{nomina_b['id']}/descargar", headers=_auth_header(token_b))

    # ASSERT — 404 al intentar borrarla desde el tenant equivocado, y sigue existiendo para B
    assert response.status_code == 404
    assert still_there.status_code == 200


# ─── HALLAZGO: operario_id no se valida contra el tenant del admin ───────────


def test_upload_nomina_rejects_operario_id_from_another_tenant(
    two_tenants_nominas_client, sample_pdf_bytes, monkeypatch
):
    """
    Regresión del bug de aislamiento corregido en
    backend/features/nominas/service.py::subir_nomina (guard clause con
    `OperarioNotFoundError`) y backend/features/nominas/router.py::upload_nomina
    (captura `OperarioNotFoundError` antes de `ValueError` -> 404). Un admin del
    tenant A ya NO puede adjuntar un `operario_id` real de otro tenant (B).
    """
    # ARRANGE
    monkeypatch.setattr(settings, "mistral_api_key", None)
    client, token_a, token_b = two_tenants_nominas_client
    victim_b = _create_operario(client, token_b, "victima-cross-tenant@weldix.dev").json()

    # ACT — el admin de A intenta subir una nómina "para" un operario de B
    response = _upload(client, token_a, sample_pdf_bytes, victim_b["id"], month=6)

    # ASSERT — rechazado con 404, y no se crea ningún registro
    assert response.status_code == 404
    listing = client.get("/nominas", headers=_auth_header(token_a))
    assert listing.json() == []
