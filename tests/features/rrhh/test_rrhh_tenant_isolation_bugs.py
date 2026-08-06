"""
Regresión de las fugas de aislamiento multi-tenant que existían en
backend/features/rrhh/ y que ya se han corregido (ver ERRORES_APRENDIDOS.md
y doc/modulos/rrhh.md para el detalle de cada fix).

Cada test aquí reproduce EXACTAMENTE el escenario del bug original y ahora
verifica el comportamiento correcto en verde. Si alguno de estos tests
volviera a fallar, significaría que alguien reintrodujo la fuga de
aislamiento correspondiente.

Bugs corregidos (archivo:línea, backend/features/rrhh/):

1. service.py crear_solicitud() (~L267): ahora guarda `tenant_id` al crear
   la `SolicitudAusencia`.
2. service.py get_todas_solicitudes() (~L292) y router.py
   todas_las_solicitudes (~L237): ahora filtran por tenant_id.
3. service.py revisar_solicitud() (~L309): ahora filtra la solicitud por
   tenant_id además de por id — si la solicitud es de otro taller, no se
   encuentra y el router devuelve 400 "Solicitud no encontrada" (mismo
   ValueError que ya usaba el endpoint para "solicitud inexistente").
4. service.py get_saldo_vacaciones() (~L166) y router.py saldo_operario
   (~L120): ahora validan que el operario pertenezca al tenant del admin
   antes de calcular el saldo; si no, 404.
5. service.py upsert_config() (~L140) y router.py upsert_config (~L96):
   ahora validan que `data.operario_id` pertenezca al tenant del admin
   antes de escribir; si no, 404.
6. service.py get_informe_mensual() (~L484): ahora filtra los operarios
   por tenant_id antes de construir el informe mensual.
7. service.py get_calendario() (~L426): ahora filtra las ausencias
   aprobadas del "equipo" por tenant_id.
"""


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── 1 y 2 — listado de solicitudes ya no cruza tenants ──────────────────────


def test_admin_no_ve_solicitudes_de_otro_tenant(rrhh_client):
    # ARRANGE — el operario de B pide una ausencia claramente identificable
    ctx = rrhh_client
    from datetime import date, timedelta
    inicio = (date.today() + timedelta(days=10)).isoformat()
    fin = (date.today() + timedelta(days=12)).isoformat()
    ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin, "motivo": "SOLO-B"},
        headers=_auth(ctx["token_op_b"]),
    )

    # ACT — el admin de A lista todas las solicitudes
    response = ctx["client"].get("/rrhh/solicitudes", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    motivos = [s.get("motivo") for s in response.json()]
    assert "SOLO-B" not in motivos


# ─── 3 — un admin ya no puede revisar la solicitud de otro taller ──────────


def test_admin_no_puede_revisar_solicitud_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    from datetime import date, timedelta
    inicio = (date.today() + timedelta(days=10)).isoformat()
    fin = (date.today() + timedelta(days=12)).isoformat()
    solicitud_b = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_b"]),
    ).json()

    # ACT — el admin de A (otro taller) intenta aprobar la solicitud de B
    response = ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud_b['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT — filtrada por tenant, la solicitud "no existe" para A (400,
    # mismo código que usa este endpoint para "solicitud inexistente")
    assert response.status_code == 400

    # Confirma el efecto de lado real: la solicitud de B sigue pendiente,
    # no quedó aprobada por el intento de A.
    solicitudes_b = ctx["client"].get(
        "/rrhh/solicitudes/mis-solicitudes", headers=_auth(ctx["token_op_b"])
    ).json()
    assert solicitudes_b[0]["estado"] == "pendiente"


# ─── 4 — saldo de vacaciones de operario de otro tenant ─────────────────────


def test_admin_no_ve_saldo_de_operario_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT — el admin de A consulta el saldo del operario de B
    ctx = rrhh_client
    response = ctx["client"].get(
        f"/rrhh/saldo/{ctx['op_b_id']}", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 404


# ─── 5 — un admin ya no puede reconfigurar a un operario de otro taller ────


def test_admin_no_puede_configurar_operario_de_otro_tenant(rrhh_client):
    # ARRANGE — el admin de A intenta cambiar la config laboral del operario de B
    ctx = rrhh_client

    # ACT
    response = ctx["client"].post(
        "/rrhh/config",
        json={
            "operario_id": ctx["op_b_id"],
            "dias_vacaciones_anuales": 30,
            "horas_jornada": 8.0,
            "dias_laborables": "LMXJV",
            "turno": "manana",
        },
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 404


# ─── 6 — informe mensual ya no mezcla operarios de todos los talleres ──────


def test_informe_mensual_no_incluye_operarios_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/informe", headers=_auth(ctx["token_admin_a"]))

    # ASSERT — el informe del admin de A no lista al operario de B
    ids = [op["operario_id"] for op in response.json()["operarios"]]
    assert ctx["op_b_id"] not in ids


# ─── 7 — calendario de ausencias del equipo ya no cruza tenants ────────────


def test_calendario_no_muestra_ausencias_aprobadas_de_otro_tenant(rrhh_client):
    # ARRANGE — solicitud de B, aprobada por el admin de B
    ctx = rrhh_client
    from datetime import date, timedelta
    hoy = date.today()
    inicio = (hoy + timedelta(days=3)).isoformat()
    fin = (hoy + timedelta(days=4)).isoformat()
    solicitud_b = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_b"]),
    ).json()
    ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud_b['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_b"]),
    )

    # ACT — el operario de A consulta el calendario del mismo mes
    response = ctx["client"].get(
        "/rrhh/calendario",
        params={"year": hoy.year, "month": hoy.month},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT — el calendario de A no trae la ausencia de B
    operarios_en_calendario = [
        e.get("operario_id") for e in response.json() if e["tipo"] == "ausencia"
    ]
    assert ctx["op_b_id"] not in operarios_en_calendario
