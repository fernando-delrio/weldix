"""
Tests de aislamiento multi-tenant.

Verifican que un admin del Taller A no puede ver ni modificar datos del Taller B.
Si alguno de estos tests falla, el SaaS no puede salir al mercado.

Cómo funciona el aislamiento:
- Cada servicio filtra por tenant_id del usuario autenticado.
- Si el recurso no pertenece al tenant → ValueError → 404 (not found).
- 404 es más seguro que 403: no revela que el recurso existe en otro tenant.
"""

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, titulo: str = "Soldadura test") -> dict:
    res = client.post(
        "/trabajos",
        json={"titulo": titulo, "cliente": "Cliente Test"},
        headers=_auth_header(token),
    )
    assert res.status_code == 201, f"No se pudo crear job: {res.json()}"
    return res.json()


# ─── Tests de listado ─────────────────────────────────────────────────────────


def test_admin_only_sees_own_tenant_jobs(two_tenants_client):
    """
    Admin A crea 2 jobs. Admin B crea 1 job.
    GET /trabajos de Admin A devuelve solo los 2 suyos, nunca el de B.
    """
    client, token_a, token_b = two_tenants_client

    _create_job(client, token_a, "Job Taller A - 1")
    _create_job(client, token_a, "Job Taller A - 2")
    _create_job(client, token_b, "Job Taller B - secreto")

    res = client.get("/trabajos", headers=_auth_header(token_a))

    assert res.status_code == 200
    titulos = [j["titulo"] for j in res.json()]
    assert "Job Taller A - 1" in titulos
    assert "Job Taller A - 2" in titulos
    assert "Job Taller B - secreto" not in titulos


def test_admin_b_only_sees_own_tenant_jobs(two_tenants_client):
    """El aislamiento es simétrico: B tampoco ve los jobs de A."""
    client, token_a, token_b = two_tenants_client

    _create_job(client, token_a, "Job exclusivo Taller A")
    _create_job(client, token_b, "Job propio Taller B")

    res = client.get("/trabajos", headers=_auth_header(token_b))

    assert res.status_code == 200
    titulos = [j["titulo"] for j in res.json()]
    assert "Job propio Taller B" in titulos
    assert "Job exclusivo Taller A" not in titulos


# ─── Tests de detalle ─────────────────────────────────────────────────────────


def test_admin_cannot_read_job_from_other_tenant(two_tenants_client):
    """
    Admin A intenta GET /trabajos/{id} de un job creado por Admin B.
    El servicio filtra por tenant_id → el job no existe para A → 404.
    """
    client, token_a, token_b = two_tenants_client

    job_de_b = _create_job(client, token_b, "Job privado de B")
    job_id = job_de_b["id"]

    res = client.get(f"/trabajos/{job_id}", headers=_auth_header(token_a))

    assert res.status_code == 404


def test_admin_can_read_own_job(two_tenants_client):
    """Control: Admin A sí puede leer sus propios jobs."""
    client, token_a, token_b = two_tenants_client

    job_de_a = _create_job(client, token_a, "Job propio de A")
    job_id = job_de_a["id"]

    res = client.get(f"/trabajos/{job_id}", headers=_auth_header(token_a))

    assert res.status_code == 200
    assert res.json()["titulo"] == "Job propio de A"


# ─── Tests de modificación ────────────────────────────────────────────────────


def test_admin_cannot_change_status_of_other_tenant_job(two_tenants_client):
    """
    Admin A intenta PATCH /trabajos/{id}/estado sobre un job de B.
    El servicio no encuentra el job bajo el tenant_id de A → 404.
    """
    client, token_a, token_b = two_tenants_client

    job_de_b = _create_job(client, token_b)
    job_id = job_de_b["id"]

    res = client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso", "progreso": 10},
        headers=_auth_header(token_a),
    )

    assert res.status_code == 404


def test_admin_cannot_delete_job_from_other_tenant(two_tenants_client):
    """
    Admin A intenta DELETE /trabajos/{id} sobre un job de B.
    El servicio filtra por tenant_id → job no encontrado → 404.
    """
    client, token_a, token_b = two_tenants_client

    job_de_b = _create_job(client, token_b)
    job_id = job_de_b["id"]

    res = client.delete(f"/trabajos/{job_id}", headers=_auth_header(token_a))

    assert res.status_code == 404

    # El job sigue existiendo para B
    res_b = client.get(f"/trabajos/{job_id}", headers=_auth_header(token_b))
    assert res_b.status_code == 200


# ─── Tests de usuarios ────────────────────────────────────────────────────────


def test_admin_only_sees_own_tenant_users(two_tenants_client):
    """
    GET /auth/users devuelve solo los usuarios del tenant del admin autenticado.
    Los usuarios del otro taller no aparecen en la lista.
    """
    client, token_a, token_b = two_tenants_client

    res_a = client.get("/auth/users", headers=_auth_header(token_a))
    res_b = client.get("/auth/users", headers=_auth_header(token_b))

    assert res_a.status_code == 200
    assert res_b.status_code == 200

    emails_a = {u["email"] for u in res_a.json()}
    emails_b = {u["email"] for u in res_b.json()}

    # Cada taller solo ve su propio admin
    assert "admin@taller-a.dev" in emails_a
    assert "admin@taller-b.dev" not in emails_a

    assert "admin@taller-b.dev" in emails_b
    assert "admin@taller-a.dev" not in emails_b
