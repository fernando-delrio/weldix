"""
Tests de aislamiento multi-tenant para fotos.

Verifican que el admin del Taller A nunca puede subir, listar, ver ni borrar
una foto de un trabajo del Taller B (ni viceversa). Usa `two_tenants_client`
(tests/conftest.py raíz), que monta auth + jobs + fotos con dos tenants
reales y devuelve (client, token_a, token_b).

El almacenamiento físico se redirige a un directorio temporal en
tests/features/fotos/conftest.py (fixture autouse `_redirect_media_dir`).
"""

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


def _upload_foto(client, token: str, job_id: int):
    return client.post(
        f"/trabajos/{job_id}/fotos",
        files={"file": ("foto.png", _PNG_BYTES, "image/png")},
        headers=_auth_header(token),
    )


# ─── Subida ──────────────────────────────────────────────────────────────


def test_upload_foto_to_other_tenants_job_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT — B intenta subir una foto al trabajo de A
    response = _upload_foto(client, token_b, job_a["id"])

    # ASSERT
    assert response.status_code == 404


# ─── Listado ─────────────────────────────────────────────────────────────


def test_list_fotos_of_other_tenants_job_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()
    _upload_foto(client, token_a, job_a["id"])

    # ACT — B intenta listar las fotos del trabajo de A
    response = client.get(f"/trabajos/{job_a['id']}/fotos", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


# ─── Servir archivo ──────────────────────────────────────────────────────


def test_get_foto_archivo_of_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()
    foto_a = _upload_foto(client, token_a, job_a["id"]).json()

    # ACT — B intenta descargar la foto de A conociendo su id
    response = client.get(f"/fotos/{foto_a['id']}/archivo", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


# ─── Borrado ─────────────────────────────────────────────────────────────


def test_delete_foto_of_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()
    foto_a = _upload_foto(client, token_a, job_a["id"]).json()

    # ACT — B (también admin, así que pasaría el check de permiso de rol) intenta borrar
    response = client.delete(f"/fotos/{foto_a['id']}", headers=_auth_header(token_b))

    # ASSERT — ni siquiera llega al check de permiso: la foto no existe para B
    assert response.status_code == 404


def test_delete_attempt_from_other_tenant_does_not_remove_the_file(two_tenants_client):
    """Confirma el efecto de lado real: el intento fallido de B no borra el
    archivo físico ni el registro de A."""
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()
    foto_a = _upload_foto(client, token_a, job_a["id"]).json()

    # ACT
    client.delete(f"/fotos/{foto_a['id']}", headers=_auth_header(token_b))
    still_there = client.get(f"/fotos/{foto_a['id']}/archivo", headers=_auth_header(token_a))

    # ASSERT
    assert still_there.status_code == 200
    assert still_there.content == _PNG_BYTES
