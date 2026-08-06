"""
Tests de `DELETE /admin/demo-data` — borra los datos de demo (`is_demo=True`)
del tenant del admin que llama.

Verifica: acceso admin-only, que solo borra registros `is_demo=True` del
propio tenant (nunca datos reales, nunca datos demo de otro tenant). Usa
`admin_client` (tests/features/admin/conftest.py) — cada tenant nace con 3
jobs demo, 2 materiales demo y 1 equipo demo (`seed_workspace_demo_data`).
"""
from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.stock.model import Material


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


# ─── Autorización ──────────────────────────────────────────────────────────


def test_delete_demo_data_requires_admin_role(admin_client):
    # ARRANGE
    ctx = admin_client

    # ACT — un operario intenta borrar los datos demo
    response = ctx["client"].delete(
        "/admin/demo-data", headers=_auth_header(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


# ─── Efecto de lado — borra lo que dice que borra ──────────────────────────


def test_delete_demo_data_reports_deleted_counts(admin_client):
    # ARRANGE / ACT
    ctx = admin_client
    response = ctx["client"].delete(
        "/admin/demo-data", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT — coincide con seed_workspace_demo_data (3 jobs, 2 stock, 1 equipo)
    assert response.status_code == 200
    assert response.json()["deleted"] == {"jobs": 3, "stock": 2, "equipos": 1}


def test_delete_demo_data_removes_demo_jobs_from_db(admin_client):
    # ARRANGE
    ctx = admin_client
    db = ctx["db"]

    # ACT
    ctx["client"].delete("/admin/demo-data", headers=_auth_header(ctx["token_admin_a"]))

    # ASSERT — ya no quedan jobs demo del Taller A en la BD
    remaining_demo = (
        db.query(Job)
        .filter(Job.tenant_id == ctx["tenant_a"].id, Job.is_demo.is_(True))
        .count()
    )
    assert remaining_demo == 0


# ─── No borra datos reales ─────────────────────────────────────────────────


def test_delete_demo_data_never_removes_real_job(admin_client):
    # ARRANGE — trabajo real (no demo) creado por el admin
    ctx = admin_client
    client = ctx["client"]
    real_job = _create_job(client, ctx["token_admin_a"], titulo="Trabajo real de A").json()

    # ACT
    client.delete("/admin/demo-data", headers=_auth_header(ctx["token_admin_a"]))

    # ASSERT — el trabajo real sigue accesible
    check = client.get(f"/trabajos/{real_job['id']}", headers=_auth_header(ctx["token_admin_a"]))
    assert check.status_code == 200


def test_delete_demo_data_never_removes_real_stock(admin_client):
    # ARRANGE — material real insertado directamente (is_demo por defecto False)
    ctx = admin_client
    db = ctx["db"]
    db.add(
        Material(
            tenant_id=ctx["tenant_a"].id,
            name="Chapa real de A",
            quantity=50,
            minimum=5,
            unit="kg",
        )
    )
    db.commit()

    # ACT
    ctx["client"].delete("/admin/demo-data", headers=_auth_header(ctx["token_admin_a"]))

    # ASSERT
    remaining_real = (
        db.query(Material)
        .filter(Material.tenant_id == ctx["tenant_a"].id, Material.name == "Chapa real de A")
        .count()
    )
    assert remaining_real == 1


# ─── Aislamiento entre tenants ─────────────────────────────────────────────


def test_delete_demo_data_never_removes_other_tenants_demo_job(admin_client):
    # ARRANGE / ACT — admin de A borra sus propios datos demo
    ctx = admin_client
    ctx["client"].delete("/admin/demo-data", headers=_auth_header(ctx["token_admin_a"]))

    # ASSERT — los 3 jobs demo del Taller B siguen intactos
    db = ctx["db"]
    remaining_demo_b = (
        db.query(Job)
        .filter(Job.tenant_id == ctx["tenant_b"].id, Job.is_demo.is_(True))
        .count()
    )
    assert remaining_demo_b == 3


def test_delete_demo_data_never_removes_other_tenants_demo_equipo(admin_client):
    # ARRANGE / ACT
    ctx = admin_client
    ctx["client"].delete("/admin/demo-data", headers=_auth_header(ctx["token_admin_a"]))

    # ASSERT
    db = ctx["db"]
    remaining_equipo_b = (
        db.query(Equipo)
        .filter(Equipo.tenant_id == ctx["tenant_b"].id, Equipo.is_demo.is_(True))
        .count()
    )
    assert remaining_equipo_b == 1
