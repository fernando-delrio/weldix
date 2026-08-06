"""
Tests de aislamiento multi-tenant para trabajos (OTs).

Verifican que el admin del Taller A nunca ve, busca, modifica, comparte ni
borra un trabajo del Taller B — en ninguna de las operaciones del router.
Usa `two_tenants_client` (tests/conftest.py raíz), que monta auth + jobs (+
fotos) con dos tenants reales y devuelve (client, token_a, token_b).

Nota importante: cada workspace nace con 3 jobs demo propios
(seed_workspace_demo_data, is_demo=True, ver backend/features/demo/service.py)
— por eso los tests de listado/búsqueda comparan pertenencia, no listas
exactas.

Si alguno de estos tests falla, un taller podría ver o alterar los trabajos
de otro — la fuga de aislamiento más grave posible en un SaaS multi-tenant.
"""


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_jobs_never_shows_other_tenants_jobs(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    _create_job(client, token_a, titulo="Trabajo de A")
    _create_job(client, token_b, titulo="Trabajo de B")

    # ACT
    response_a = client.get("/trabajos", headers=_auth_header(token_a))

    # ASSERT — A ve el suyo (+ sus 3 demo), nunca el de B
    titles = [j["titulo"] for j in response_a.json()]
    assert "Trabajo de A" in titles
    assert "Trabajo de B" not in titles


# ─── Creación — el código autogenerado no mezcla contadores entre tenants ────


def test_created_job_codes_are_independent_per_tenant(two_tenants_client):
    # ARRANGE / ACT — cada tenant crea su primer trabajo "real" (no demo)
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()
    job_b = _create_job(client, token_b).json()

    # ASSERT — ambos son el "primero" de su propio taller (mismo sufijo -001);
    # los códigos demo usan el prefijo ORD-DEMO-, no cuentan para la secuencia.
    assert job_a["code"].endswith("-001")
    assert job_b["code"].endswith("-001")
    assert job_a["code"] != "ORD-DEMO-001"


# ─── Obtener uno ───────────────────────────────────────────────────────────


def test_get_job_from_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT
    response = client.get(f"/trabajos/{job_a['id']}", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


# ─── Búsqueda rápida (Ctrl+K) ─────────────────────────────────────────────────


def test_search_quick_never_finds_other_tenants_jobs(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    _create_job(client, token_a, titulo="Soldadura confidencial de A")

    # ACT — B busca un término que solo existe en un trabajo de A
    response = client.get(
        "/trabajos/buscar-rapido",
        params={"q": "confidencial"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.json() == []


# ─── Búsqueda por código OT ───────────────────────────────────────────────────


def test_search_by_code_from_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT — B intenta localizar la OT de A por su código exacto
    response = client.get(
        "/trabajos/buscar", params={"code": job_a["code"]}, headers=_auth_header(token_b)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Cambio de estado ──────────────────────────────────────────────────────


def test_change_estado_of_other_tenants_job_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT — admin de B intenta iniciar el trabajo de A
    response = client.patch(
        f"/trabajos/{job_a['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_change_estado_of_other_tenants_job_does_not_mutate_it(two_tenants_client):
    """Aunque el intento anterior falle con 404, confirmamos explícitamente
    que el trabajo de A sigue intacto — no solo que B no vio confirmación."""
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT
    client.patch(
        f"/trabajos/{job_a['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token_b),
    )
    check = client.get(f"/trabajos/{job_a['id']}", headers=_auth_header(token_a))

    # ASSERT — el estado de A no cambió por la acción de B
    assert check.json()["estado"] == "pendiente"


# ─── Actualización parcial ───────────────────────────────────────────────────


def test_update_job_of_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a, titulo="Original de A").json()

    # ACT
    response = client.patch(
        f"/trabajos/{job_a['id']}",
        json={"titulo": "Hackeado por B"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_update_job_of_other_tenant_does_not_mutate_it(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a, titulo="Original de A").json()

    # ACT
    client.patch(
        f"/trabajos/{job_a['id']}",
        json={"titulo": "Hackeado por B"},
        headers=_auth_header(token_b),
    )
    check = client.get(f"/trabajos/{job_a['id']}", headers=_auth_header(token_a))

    # ASSERT
    assert check.json()["titulo"] == "Original de A"


# ─── Compartir ────────────────────────────────────────────────────────────


def test_share_job_of_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT — admin de B intenta generar/leer el token público del trabajo de A
    response = client.post(
        f"/trabajos/{job_a['id']}/compartir", headers=_auth_header(token_b)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Borrado ──────────────────────────────────────────────────────────────


def test_delete_job_of_other_tenant_returns_404(two_tenants_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT
    response = client.delete(f"/trabajos/{job_a['id']}", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


def test_delete_attempt_from_other_tenant_does_not_remove_it(two_tenants_client):
    """Confirma el efecto de lado real: el intento fallido de B no borra el job de A."""
    # ARRANGE
    client, token_a, token_b = two_tenants_client
    job_a = _create_job(client, token_a).json()

    # ACT
    client.delete(f"/trabajos/{job_a['id']}", headers=_auth_header(token_b))
    still_there = client.get(f"/trabajos/{job_a['id']}", headers=_auth_header(token_a))

    # ASSERT
    assert still_there.status_code == 200
