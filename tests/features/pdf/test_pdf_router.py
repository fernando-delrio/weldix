"""
Tests HTTP del router de pdf: GET /trabajos/{job_id}/pdf — genera el parte de
trabajo en PDF (fpdf2). backend/features/pdf/service.py::generate_job_pdf ya
filtra por tenant_id; aquí se confirma con test, no se asume.

Bug corregido (ver ERRORES_APRENDIDOS.md): `_safe()` (líneas 34-49), el
`footer()` de `_WeldixPDF` (línea 153) y `_draw_info_grid` (líneas 251-260)
dejaban pasar el em dash "—" (U+2014) sin sanear hacia fpdf2 con fuentes core
Helvetica (solo soporta latin-1), rompiendo el 100% de las descargas con
`FPDFUnicodeEncodingException`. Los tests de este archivo cubren
deliberadamente el caso "peor escenario" (trabajo sin operario asignado ni
fecha de inicio — el estado por defecto de todo trabajo recién creado, que
antes de la corrección era el más propenso a crashear) además del caso con
datos completos.
"""
import io

from pypdf import PdfReader


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


def _create_operario(client, admin_token: str, email: str, full_name: str = "Operario PDF Test"):
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


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Estructura metalica taller", "cliente": "Cliente Prueba"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


def _extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


# ─── Happy path ────────────────────────────────────────────────────────────────


def test_download_job_pdf_requires_auth(pdf_client):
    # ARRANGE
    token = _admin_token(pdf_client)
    job = _create_job(pdf_client, token).json()

    # ACT — sin cabecera de autorización
    response = pdf_client.get(f"/trabajos/{job['id']}/pdf")

    # ASSERT
    assert response.status_code == 401


def test_download_job_pdf_returns_valid_pdf_bytes_for_job_without_operario_or_dates(pdf_client):
    """Peor escenario: trabajo recién creado, sin operario ni fecha_inicio —
    el estado por defecto de cualquier OT en 'pendiente'. Antes de la
    corrección esto era justo lo que hacía crashear la generación."""
    # ARRANGE
    token = _admin_token(pdf_client)
    job = _create_job(pdf_client, token).json()
    assert job["operario_id"] is None

    # ACT
    response = pdf_client.get(f"/trabajos/{job['id']}/pdf", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:5] == b"%PDF-"
    assert len(response.content) > 500


def test_download_job_pdf_returns_valid_pdf_bytes_with_operario_assigned(pdf_client):
    # ARRANGE
    token = _admin_token(pdf_client)
    operario = _create_operario(pdf_client, token, "operario-pdf@weldix.dev").json()
    job = _create_job(
        pdf_client, token, operario_id=operario["id"], fecha_inicio="2026-01-15"
    ).json()

    # ACT
    response = pdf_client.get(f"/trabajos/{job['id']}/pdf", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert response.content[:5] == b"%PDF-"


def test_download_job_pdf_contains_job_code_and_title(pdf_client):
    # ARRANGE
    token = _admin_token(pdf_client)
    job = _create_job(pdf_client, token, titulo="Deposito industrial inox").json()

    # ACT
    response = pdf_client.get(f"/trabajos/{job['id']}/pdf", headers=_auth_header(token))

    # ASSERT
    text = _extract_text(response.content)
    assert job["code"] in text
    assert "Deposito industrial inox" in text


def test_download_job_pdf_returns_404_when_job_not_found(pdf_client):
    # ARRANGE
    token = _admin_token(pdf_client)

    # ACT
    response = pdf_client.get("/trabajos/999999/pdf", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


# ─── Aislamiento multi-tenant ──────────────────────────────────────────────────


def test_tenant_a_cannot_download_pdf_of_tenant_b_job(two_tenants_pdf_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_pdf_client
    job_b = _create_job(client, token_b, titulo="OT confidencial tenant B").json()

    # ACT — el admin del tenant A intenta descargar el PDF de un trabajo del tenant B
    response = client.get(f"/trabajos/{job_b['id']}/pdf", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404


def test_tenant_b_can_download_pdf_of_its_own_job(two_tenants_pdf_client):
    # ARRANGE
    client, _token_a, token_b = two_tenants_pdf_client
    job_b = _create_job(client, token_b, titulo="OT propia tenant B").json()

    # ACT
    response = client.get(f"/trabajos/{job_b['id']}/pdf", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 200
    assert response.content[:5] == b"%PDF-"
