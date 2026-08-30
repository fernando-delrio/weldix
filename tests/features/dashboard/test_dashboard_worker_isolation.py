"""
Tests de aislamiento para el dashboard del operario (`GET /dashboard/worker`).

Verifica que un operario solo ve SUS propios trabajos activos/pendientes y
SU propio stock del taller — nunca los de otro operario del mismo tenant,
ni los de otro tenant. Usa `dashboard_client` (tests/features/dashboard/conftest.py).
"""
from backend.features.stock.model import Material


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


def _start_job(client, token: str, job_id: int):
    return client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )


# ─── Trabajo activo propio ────────────────────────────────────────────────


def test_worker_dashboard_shows_own_active_job(dashboard_client):
    # ARRANGE — admin crea un trabajo ya asignado a op1, op1 lo inicia
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Trabajo de op1",
        operario_id=ctx["op1_a_id"],
    ).json()
    _start_job(client, ctx["token_op1_a"], job["id"])

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT
    assert response.status_code == 200
    active_job = response.json()["active_job"]
    assert active_job is not None
    assert active_job["id"] == job["id"]
    # Bug real: ActiveJobSchema no declaraba "code" y Pydantic lo descartaba
    # en silencio -- el operario veia "#152" en vez de "ORD-2026-004".
    assert active_job["code"] == job["code"]


def test_worker_dashboard_has_no_active_job_when_none_assigned(dashboard_client):
    # ARRANGE — op2 no tiene ningún trabajo propio en curso
    ctx = dashboard_client
    client = ctx["client"]

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op2_a"]))

    # ASSERT
    assert response.json()["active_job"] is None


# ─── Aislamiento entre operarios del mismo tenant ─────────────────────────


def test_worker_dashboard_never_shows_other_operarios_active_job(dashboard_client):
    # ARRANGE — el trabajo activo pertenece a op2, no a op1
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Trabajo confidencial de op2",
        operario_id=ctx["op2_a_id"],
    ).json()
    _start_job(client, ctx["token_op2_a"], job["id"])

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT — op1 no ve el trabajo de op2 como activo
    assert response.json()["active_job"] is None


def test_worker_dashboard_metrics_do_not_count_other_operarios_jobs(dashboard_client):
    # ARRANGE — op2 tiene un trabajo en_proceso; op1 no tiene ninguno
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Trabajo de op2",
        operario_id=ctx["op2_a_id"],
    ).json()
    _start_job(client, ctx["token_op2_a"], job["id"])

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT — la métrica "en_proceso" de op1 sigue en 0
    metrics_by_key = {m["key"]: m["value"] for m in response.json()["metrics"]}
    assert metrics_by_key["in_progress"] == 0


def test_worker_dashboard_today_jobs_never_includes_other_operarios_jobs(dashboard_client):
    # ARRANGE — op2 tiene un trabajo pendiente propio
    ctx = dashboard_client
    client = ctx["client"]
    _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Pendiente de op2",
        operario_id=ctx["op2_a_id"],
    )

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT
    titles = [j["title"] for j in response.json()["today_jobs"]]
    assert "Pendiente de op2" not in titles


def test_worker_dashboard_today_jobs_expose_code(dashboard_client):
    """Mismo bug que en active_job: TodayJobSchema tampoco declaraba "code"."""
    # ARRANGE
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Pendiente de op1",
        operario_id=ctx["op1_a_id"],
    ).json()

    # ACT
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT
    today_job = next(j for j in response.json()["today_jobs"] if j["id"] == job["id"])
    assert today_job["code"] == job["code"]


# ─── Flag de urgente tras rechazo ──────────────────────────────────────────


def test_worker_dashboard_shows_urgente_flag_after_rejection(dashboard_client):
    # ARRANGE — admin crea un trabajo para op1, lo lleva hasta 'control' y lo rechaza
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Soldadura con acabado defectuoso",
        operario_id=ctx["op1_a_id"],
    ).json()
    _start_job(client, ctx["token_admin_a"], job["id"])
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "control"},
        headers=_auth_header(ctx["token_admin_a"]),
    )
    client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Falta pulir el cordon de soldadura"},
        headers=_auth_header(ctx["token_admin_a"]),
    )

    # ACT — op1 consulta su propio dashboard
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_a"]))

    # ASSERT — el trabajo vuelve a estar pendiente, ahora marcado como urgente
    today_jobs = response.json()["today_jobs"]
    rejected_job = next(j for j in today_jobs if j["id"] == job["id"])
    assert rejected_job["urgente"] is True
    assert rejected_job["motivo_rechazo"] == "Falta pulir el cordon de soldadura"


# ─── Aislamiento entre tenants ─────────────────────────────────────────────


def test_worker_dashboard_never_shows_other_tenants_active_job(dashboard_client):
    # ARRANGE — trabajo activo en el Taller A, asignado y arrancado por op1_a
    ctx = dashboard_client
    client = ctx["client"]
    job = _create_job(
        client,
        ctx["token_admin_a"],
        titulo="Trabajo secreto de A",
        operario_id=ctx["op1_a_id"],
    ).json()
    _start_job(client, ctx["token_op1_a"], job["id"])

    # ACT — op1 del Taller B consulta su propio dashboard
    response = client.get("/dashboard/worker", headers=_auth_header(ctx["token_op1_b"]))

    # ASSERT
    assert response.json()["active_job"] is None


def test_worker_dashboard_stock_never_includes_other_tenants_materials(dashboard_client):
    # ARRANGE — material exclusivo del Taller A, insertado directamente en BD
    ctx = dashboard_client
    db = ctx["db"]
    db.add(
        Material(
            tenant_id=ctx["tenant_a_id"],
            name="Tornillos especiales A",
            quantity=100,
            minimum=10,
            unit="ud",
        )
    )
    db.commit()

    # ACT — op1 del Taller B consulta su propio dashboard
    response = ctx["client"].get(
        "/dashboard/worker", headers=_auth_header(ctx["token_op1_b"])
    )

    # ASSERT
    stock_names = [item["name"] for item in response.json()["stock"]]
    assert "Tornillos especiales A" not in stock_names
