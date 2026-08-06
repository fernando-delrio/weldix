"""
Tests de `GET /admin/dashboard` — métricas globales y listado de trabajos
del panel admin.

Verifica: acceso admin-only, y que las métricas y el listado de trabajos
están filtrados por tenant (un admin no ve datos de otro taller). Usa
`admin_client` (tests/features/admin/conftest.py) — cada tenant nace con
3 jobs demo (ver `seed_workspace_demo_data`).
"""


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


# ─── Autorización ──────────────────────────────────────────────────────────


def test_admin_dashboard_requires_admin_role(admin_client):
    # ARRANGE
    ctx = admin_client

    # ACT — un operario intenta ver el dashboard admin
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


def test_admin_dashboard_allows_admin(admin_client):
    # ARRANGE
    ctx = admin_client

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 200


# ─── Aislamiento de métricas ────────────────────────────────────────────────


def test_admin_dashboard_metrics_do_not_count_other_tenants_jobs(admin_client):
    # ARRANGE — Taller A crea un trabajo real además de sus 3 demo
    ctx = admin_client
    client = ctx["client"]
    _create_job(client, ctx["token_admin_a"], titulo="Trabajo real de A")

    # ACT — Taller B consulta sus propias métricas
    response = client.get("/admin/dashboard", headers=_auth_header(ctx["token_admin_b"]))

    # ASSERT — B solo ve sus propios 3 jobs demo, no el de A
    assert response.json()["metrics"]["total_jobs"] == 3


def test_admin_dashboard_metrics_total_operarios_isolated_by_tenant(admin_client):
    # ARRANGE / ACT
    ctx = admin_client
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_b"])
    )

    # ASSERT — solo el operario de B, no el de A
    assert response.json()["metrics"]["total_operarios"] == 1


# ─── Aislamiento del listado de trabajos ───────────────────────────────────


def test_admin_dashboard_jobs_list_never_includes_other_tenants_job(admin_client):
    # ARRANGE
    ctx = admin_client
    client = ctx["client"]
    _create_job(client, ctx["token_admin_a"], titulo="Trabajo secreto de A")

    # ACT
    response = client.get("/admin/dashboard", headers=_auth_header(ctx["token_admin_b"]))

    # ASSERT
    titles = [j["titulo"] for j in response.json()["jobs"]]
    assert "Trabajo secreto de A" not in titles


def test_admin_dashboard_users_list_never_includes_other_tenants_operario(admin_client):
    # ARRANGE / ACT
    ctx = admin_client
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_b"])
    )

    # ASSERT
    emails = [u["email"] for u in response.json()["users"]]
    assert "op-a@taller-a.dev" not in emails
