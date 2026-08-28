"""
Tests de `GET /admin/dashboard` — métricas globales y listado de trabajos
del panel admin.

Verifica: acceso admin-only, y que las métricas y el listado de trabajos
están filtrados por tenant (un admin no ve datos de otro taller). Usa
`admin_client` (tests/features/admin/conftest.py) — cada tenant nace con
3 jobs demo (ver `seed_workspace_demo_data`).
"""


from datetime import date, datetime, timedelta, timezone

from backend.features.auth.model import User
from backend.features.fichaje.model import Fichaje
from backend.features.rrhh.model import SolicitudAusencia


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


def test_admin_dashboard_exposes_urgente_and_motivo_rechazo(admin_client):
    """Regresión del bug de 2026-08-05: un campo que el service devuelve
    pero que no está declarado en el response_model se elimina en
    silencio. Ver ERRORES_APRENDIDOS.md."""
    # ARRANGE
    ctx = admin_client
    client = ctx["client"]
    token = ctx["token_admin_a"]
    job = _create_job(client, token).json()
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "control"},
        headers=_auth_header(token),
    )
    client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Falta rematar"},
        headers=_auth_header(token),
    )

    # ACT
    response = client.get("/admin/dashboard", headers=_auth_header(token))

    # ASSERT
    dashboard_job = next(j for j in response.json()["jobs"] if j["id"] == job["id"])
    assert dashboard_job["urgente"] is True
    assert dashboard_job["motivo_rechazo"] == "Falta rematar"


# ─── Tarjeta "quién está en el taller" (Inicio del admin) ──────────────────


def test_admin_dashboard_marks_operario_en_taller_con_fichaje_abierto(admin_client):
    # ARRANGE — el operario de A tiene una jornada abierta (sin fin)
    ctx = admin_client
    ctx["db"].add(
        Fichaje(tenant_id=ctx["tenant_a"].id, operario_id=ctx["op_a_id"], fin=None)
    )
    ctx["db"].commit()

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    user = next(u for u in response.json()["users"] if u["id"] == ctx["op_a_id"])
    assert user["en_taller"] is True
    assert user["ausente_hoy"] is None


def test_admin_dashboard_no_marca_en_taller_si_la_jornada_ya_se_cerro(admin_client):
    # ARRANGE — jornada de ayer, ya finalizada
    ctx = admin_client
    ctx["db"].add(
        Fichaje(
            tenant_id=ctx["tenant_a"].id,
            operario_id=ctx["op_a_id"],
            fin=datetime.now(timezone.utc) - timedelta(days=1),
            horas=8,
        )
    )
    ctx["db"].commit()

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    user = next(u for u in response.json()["users"] if u["id"] == ctx["op_a_id"])
    assert user["en_taller"] is False


def test_admin_dashboard_marca_ausente_hoy_con_solicitud_aprobada(admin_client):
    # ARRANGE — vacaciones aprobadas que cubren hoy
    ctx = admin_client
    hoy = date.today()
    ctx["db"].add(
        SolicitudAusencia(
            tenant_id=ctx["tenant_a"].id,
            operario_id=ctx["op_a_id"],
            tipo="vacaciones",
            fecha_inicio=hoy - timedelta(days=1),
            fecha_fin=hoy + timedelta(days=1),
            dias_solicitados=3,
            estado="aprobada",
        )
    )
    ctx["db"].commit()

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    user = next(u for u in response.json()["users"] if u["id"] == ctx["op_a_id"])
    assert user["ausente_hoy"] == "Vacaciones"
    assert user["en_taller"] is False


def test_admin_dashboard_ignora_solicitud_pendiente_de_aprobar(admin_client):
    # ARRANGE — vacaciones que cubren hoy pero SIN aprobar todavía
    ctx = admin_client
    hoy = date.today()
    ctx["db"].add(
        SolicitudAusencia(
            tenant_id=ctx["tenant_a"].id,
            operario_id=ctx["op_a_id"],
            tipo="vacaciones",
            fecha_inicio=hoy,
            fecha_fin=hoy,
            dias_solicitados=1,
            estado="pendiente",
        )
    )
    ctx["db"].commit()

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT — una solicitud pendiente no debe marcar al operario como ausente
    user = next(u for u in response.json()["users"] if u["id"] == ctx["op_a_id"])
    assert user["ausente_hoy"] is None


def test_admin_dashboard_exposes_pin_del_operario(admin_client):
    """Regresión: AdminUserItem no declaraba `pin`, así que Pydantic lo
    descartaba en silencio aunque el service ya lo calculaba (_user_item).
    Mismo patrón de bug que urgente/motivo_rechazo, ver ERRORES_APRENDIDOS.md."""
    # ARRANGE
    ctx = admin_client
    operario = ctx["db"].query(User).filter_by(id=ctx["op_a_id"]).first()
    operario.pin = "4321"
    ctx["db"].commit()

    # ACT
    response = ctx["client"].get(
        "/admin/dashboard", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    user = next(u for u in response.json()["users"] if u["id"] == ctx["op_a_id"])
    assert user["pin"] == "4321"
