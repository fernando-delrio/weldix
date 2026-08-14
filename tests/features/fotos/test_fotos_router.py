"""
Tests HTTP del router de fotos: subida (multipart), listado, servir el
archivo físico y borrado.

Usa `two_tenants_client` (tests/conftest.py raíz), que monta auth + jobs +
fotos con dos tenants reales — se usa el tenant A para los casos de
CRUD/autorización de este archivo. Aislamiento multi-tenant completo vive en
test_fotos_isolation.py.

El almacenamiento físico se redirige a un directorio temporal en
tests/features/fotos/conftest.py (fixture autouse `_redirect_media_dir`).
"""

# PNG mínimo: basta con la firma de 8 bytes que detecta
# backend/features/fotos/service.py::_detect_image_type + relleno.
_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
_JPG_BYTES = b"\xff\xd8\xff" + b"\x00" * 24


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


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


def _upload_foto(client, token: str, job_id: int, filename="foto.png", content=_PNG_BYTES,
                  content_type="image/png", etiqueta=None):
    data = {"etiqueta": etiqueta} if etiqueta is not None else {}
    return client.post(
        f"/trabajos/{job_id}/fotos",
        files={"file": (filename, content, content_type)},
        data=data,
        headers=_auth_header(token),
    )


# ─── Subida — POST /trabajos/{job_id}/fotos ────────────────────────────────


def test_upload_foto_happy_path(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT
    response = _upload_foto(client, token_a, job["id"])

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["job_id"] == job["id"]
    assert body["etiqueta"] == "durante"
    assert body["url"].endswith(f"/fotos/{body['id']}/archivo")


def test_upload_foto_with_custom_etiqueta(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT
    response = _upload_foto(client, token_a, job["id"], etiqueta="antes")

    # ASSERT
    assert response.status_code == 201
    assert response.json()["etiqueta"] == "antes"


def test_upload_foto_with_invalid_extension_returns_400(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT
    response = _upload_foto(
        client, token_a, job["id"], filename="documento.txt", content=b"no es una imagen",
        content_type="text/plain",
    )

    # ASSERT
    assert response.status_code == 400


def test_upload_foto_with_content_not_matching_declared_mime_returns_400(two_tenants_client):
    """El archivo tiene extensión .png pero los bytes son de un JPG — el
    guard clause de contenido real (no solo extensión) debe rechazarlo."""
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT — extensión .png, pero contenido real es JPG y content_type declarado es png
    response = _upload_foto(
        client, token_a, job["id"], filename="foto.png", content=_JPG_BYTES,
        content_type="image/png",
    )

    # ASSERT
    assert response.status_code == 400


def test_upload_foto_to_nonexistent_job_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client

    # ACT
    response = _upload_foto(client, token_a, 999999)

    # ASSERT
    assert response.status_code == 404


def test_upload_foto_without_token_returns_401(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT — sin header Authorization
    response = client.post(
        f"/trabajos/{job['id']}/fotos",
        files={"file": ("foto.png", _PNG_BYTES, "image/png")},
    )

    # ASSERT
    assert response.status_code == 401


# ─── Listado — GET /trabajos/{job_id}/fotos ────────────────────────────────


def test_list_fotos_for_job_returns_uploaded_photos(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    _upload_foto(client, token_a, job["id"], etiqueta="antes")
    _upload_foto(client, token_a, job["id"], etiqueta="despues")

    # ACT
    response = client.get(f"/trabajos/{job['id']}/fotos", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 200
    fotos = response.json()
    assert len(fotos) == 2
    assert {f["etiqueta"] for f in fotos} == {"antes", "despues"}


def test_list_fotos_for_nonexistent_job_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client

    # ACT
    response = client.get("/trabajos/999999/fotos", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404


def test_list_fotos_for_job_without_photos_returns_empty_list(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()

    # ACT
    response = client.get(f"/trabajos/{job['id']}/fotos", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 200
    assert response.json() == []


# ─── Servir archivo — GET /fotos/{foto_id}/archivo ─────────────────────────


def test_get_foto_archivo_returns_uploaded_bytes(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    foto = _upload_foto(client, token_a, job["id"]).json()

    # ACT
    response = client.get(f"/fotos/{foto['id']}/archivo", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 200
    assert response.content == _PNG_BYTES


def test_get_foto_archivo_of_nonexistent_foto_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client

    # ACT
    response = client.get("/fotos/999999/archivo", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404


# ─── Borrado — DELETE /fotos/{foto_id} ─────────────────────────────────────


def test_delete_foto_by_uploader_removes_it(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    foto = _upload_foto(client, token_a, job["id"]).json()

    # ACT
    delete_response = client.delete(f"/fotos/{foto['id']}", headers=_auth_header(token_a))
    get_response = client.get(f"/fotos/{foto['id']}/archivo", headers=_auth_header(token_a))

    # ASSERT
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_delete_foto_removes_it_from_job_listing(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    foto = _upload_foto(client, token_a, job["id"]).json()

    # ACT
    client.delete(f"/fotos/{foto['id']}", headers=_auth_header(token_a))
    listing = client.get(f"/trabajos/{job['id']}/fotos", headers=_auth_header(token_a))

    # ASSERT
    assert listing.json() == []


def test_delete_foto_by_admin_allowed_even_if_not_uploader(two_tenants_client):
    """El admin puede borrar cualquier foto del tenant, aunque no la haya
    subido él (backend/features/fotos/service.py::delete_foto)."""
    # ARRANGE — un operario sube la foto, el admin la borra
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    _create_operario(client, token_a, "uploader@taller-a.dev")
    uploader_token = client.post(
        "/auth/login", json={"email": "uploader@taller-a.dev", "password": "Operario123!"}
    ).json()["access_token"]
    foto = _upload_foto(client, uploader_token, job["id"]).json()

    # ACT
    response = client.delete(f"/fotos/{foto['id']}", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 204


def test_delete_foto_by_other_operario_not_uploader_returns_403(two_tenants_client):
    """Un operario que no subió la foto no puede borrarla —
    backend/features/fotos/service.py::delete_foto lanza PermissionError."""
    # ARRANGE — dos operarios del mismo taller; uno sube, el otro intenta borrar
    client, token_a, _ = two_tenants_client
    job = _create_job(client, token_a).json()
    _create_operario(client, token_a, "uploader2@taller-a.dev")
    _create_operario(client, token_a, "meddler@taller-a.dev")
    uploader_token = client.post(
        "/auth/login", json={"email": "uploader2@taller-a.dev", "password": "Operario123!"}
    ).json()["access_token"]
    meddler_token = client.post(
        "/auth/login", json={"email": "meddler@taller-a.dev", "password": "Operario123!"}
    ).json()["access_token"]
    foto = _upload_foto(client, uploader_token, job["id"]).json()

    # ACT
    response = client.delete(f"/fotos/{foto['id']}", headers=_auth_header(meddler_token))

    # ASSERT
    assert response.status_code == 403
    # el archivo sigue accesible: el intento fallido no borró nada
    still_there = client.get(f"/fotos/{foto['id']}/archivo", headers=_auth_header(token_a))
    assert still_there.status_code == 200


def test_delete_nonexistent_foto_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, _ = two_tenants_client

    # ACT
    response = client.delete("/fotos/999999", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 404
