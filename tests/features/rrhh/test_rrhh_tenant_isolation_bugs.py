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
8. service.py revisar_cambio_turno() (~L960): ahora filtra la solicitud de
   cambio de turno por tenant_id además de por id — antes un admin podía
   aprobar el intercambio de turnos de dos operarios de OTRO taller.
9. service.py actualizar_estado_epi() / eliminar_epi() (~L651, ~L663): ahora
   filtran el EPI por tenant_id — antes un admin podía cambiar el estado o
   borrar el EPI de un operario de otro taller conociendo su id.
10. service.py crear_epi() (~L632, vía _validar_operario_del_tenant): ahora
    valida que operario_id pertenezca al tenant del admin antes de crear el
    registro (mismo guard clause que ya usaba upsert_config, replicado
    también en crear_certificado/crear_reconocimiento/crear_permiso_trabajo).
11. service.py get_resumen_horas() (~L813): ahora filtra el operario por
    tenant_id al construir operario_nombre — antes un admin podía enumerar
    el nombre real de un operario de otro taller pasando su id.

Encontrados en una segunda auditoría (backend-reviewer del saas-toolkit),
mismo patrón que los anteriores — un id secundario del body sin validar:

12. service.py solicitar_cambio_turno() (~L953): ahora valida receptor_id,
    turno_cedido_id y turno_recibido_id contra el tenant del solicitante
    antes de crear la solicitud — antes, un operario podía apuntar a un
    compañero o un turno de otro taller solo adivinando el id, y al
    aprobarse (revisar_cambio_turno intercambia operario_id entre los dos
    turnos) era una escritura cruzada de tenant, no solo lectura.
13. service.py crear_accidente() (~L1025): ahora valida afectado_id contra
    el tenant antes de crear el registro (mismo guard clause que crear_epi)
    — antes cualquier usuario autenticado podía imputar un accidente
    laboral a un empleado de otro taller.
14. service.py crear_turno_bulk() (~L907): ahora valida todos los
    operario_id del lote contra el tenant en una sola query antes de
    crear/actualizar turnos — antes un admin podía asignar un turno a un
    operario de otro taller.
"""


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── 1 y 2 — listado de solicitudes ya no cruza tenants ──────────────────────


def test_admin_no_ve_solicitudes_de_otro_tenant(rrhh_client):
    # ARRANGE — el operario de B pide una ausencia claramente identificable
    ctx = rrhh_client
    from datetime import date, timedelta
    # Ventana de 7 días: contiene al menos un día laborable sea cual sea
    # el día de la semana en que corra el test (evita flakiness de fin de semana).
    inicio = (date.today() + timedelta(days=10)).isoformat()
    fin = (date.today() + timedelta(days=17)).isoformat()
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
    # Ventana de 7 días: contiene al menos un día laborable sea cual sea
    # el día de la semana en que corra el test (evita flakiness de fin de semana).
    inicio = (date.today() + timedelta(days=10)).isoformat()
    fin = (date.today() + timedelta(days=17)).isoformat()
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
    # Ventana de 7 días: contiene al menos un día laborable sea cual sea
    # el día de la semana en que corra el test (evita flakiness de fin de semana).
    inicio = (hoy + timedelta(days=3)).isoformat()
    fin = (hoy + timedelta(days=10)).isoformat()
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


# ─── 8 — un admin ya no puede aprobar un cambio de turno de otro taller ────


def test_admin_no_puede_revisar_cambio_de_turno_de_otro_tenant(rrhh_client):
    # ARRANGE — dos turnos de B y una solicitud de cambio entre ellos
    from backend.features.rrhh.model import SolicitudCambioTurno, TurnoAsignado
    from datetime import date, timedelta

    ctx = rrhh_client
    db = ctx["db"]
    fecha_cedida = date.today() + timedelta(days=5)
    fecha_recibida = date.today() + timedelta(days=6)

    turno_cedido = TurnoAsignado(
        tenant_id=ctx["tenant_b"].id,
        operario_id=ctx["op_b_id"],
        fecha=fecha_cedida,
        turno="manana",
    )
    turno_recibido = TurnoAsignado(
        tenant_id=ctx["tenant_b"].id,
        operario_id=ctx["op_b_id"],
        fecha=fecha_recibida,
        turno="tarde",
    )
    db.add_all([turno_cedido, turno_recibido])
    db.flush()
    solicitud = SolicitudCambioTurno(
        tenant_id=ctx["tenant_b"].id,
        solicitante_id=ctx["op_b_id"],
        receptor_id=ctx["op_b_id"],
        turno_cedido_id=turno_cedido.id,
        turno_recibido_id=turno_recibido.id,
        estado="pendiente",
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    operario_original_cedido = turno_cedido.operario_id

    # ACT — el admin de A (otro taller) intenta aprobar el cambio de B
    response = ctx["client"].patch(
        f"/rrhh/turnos/cambios/{solicitud.id}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT — filtrada por tenant, la solicitud "no existe" para A
    assert response.status_code == 400

    # Confirma el efecto de lado real: los turnos de B no se intercambiaron
    db.refresh(turno_cedido)
    assert turno_cedido.operario_id == operario_original_cedido
    db.refresh(solicitud)
    assert solicitud.estado == "pendiente"


# ─── 9 — un admin ya no puede modificar/borrar el EPI de otro taller ───────


def test_admin_no_puede_cambiar_estado_de_epi_de_otro_tenant(rrhh_client):
    # ARRANGE — EPI real del operario de B
    ctx = rrhh_client
    epi = ctx["client"].post(
        "/rrhh/epis",
        json={
            "operario_id": ctx["op_b_id"],
            "tipo_epi": "casco",
            "fecha_entrega": "2026-01-01",
        },
        headers=_auth(ctx["token_admin_b"]),
    ).json()

    # ACT — el admin de A intenta darlo de baja
    response = ctx["client"].patch(
        f"/rrhh/epis/{epi['id']}/estado",
        params={"estado": "baja"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400
    epis_de_b = ctx["client"].get(
        "/rrhh/epis", headers=_auth(ctx["token_admin_b"])
    ).json()
    assert epis_de_b[0]["estado"] == "activo"


def test_admin_no_puede_eliminar_epi_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    epi = ctx["client"].post(
        "/rrhh/epis",
        json={
            "operario_id": ctx["op_b_id"],
            "tipo_epi": "guantes",
            "fecha_entrega": "2026-01-01",
        },
        headers=_auth(ctx["token_admin_b"]),
    ).json()

    # ACT — el admin de A intenta borrarlo
    response = ctx["client"].delete(
        f"/rrhh/epis/{epi['id']}", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 404
    epis_de_b = ctx["client"].get(
        "/rrhh/epis", headers=_auth(ctx["token_admin_b"])
    ).json()
    assert len(epis_de_b) == 1


# ─── 10 — un admin ya no puede crear un EPI para un operario de otro taller ─


def test_admin_no_puede_crear_epi_para_operario_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT — el admin de A intenta registrar un EPI a nombre de B
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/epis",
        json={
            "operario_id": ctx["op_b_id"],
            "tipo_epi": "botas",
            "fecha_entrega": "2026-01-01",
        },
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


# ─── 11 — el resumen de horas ya no expone el nombre de otro tenant ────────


def test_resumen_horas_no_expone_nombre_de_operario_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT — el admin de A consulta las horas extra del operario de B
    ctx = rrhh_client
    response = ctx["client"].get(
        f"/rrhh/horas-extra/{ctx['op_b_id']}", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT — no se filtra el nombre real de un empleado de otro taller
    assert response.status_code == 200
    assert response.json()["operario_nombre"] == "—"


# ─── 12 — solicitar cambio de turno con un receptor de otro tenant ─────────


def test_operario_no_puede_solicitar_cambio_con_receptor_de_otro_tenant(rrhh_client):
    # ARRANGE — el operario de A tiene un turno real que podría ceder
    from backend.features.rrhh.model import TurnoAsignado
    from datetime import date, timedelta

    ctx = rrhh_client
    db = ctx["db"]
    turno_a = TurnoAsignado(
        tenant_id=ctx["tenant_a"].id,
        operario_id=ctx["op_a_id"],
        fecha=date.today() + timedelta(days=5),
        turno="manana",
    )
    db.add(turno_a)
    db.commit()
    db.refresh(turno_a)

    # ACT — pide el cambio apuntando a un receptor del OTRO taller
    response = ctx["client"].post(
        "/rrhh/turnos/solicitar-cambio",
        json={
            "receptor_id": ctx["op_b_id"],
            "turno_cedido_id": turno_a.id,
            "turno_recibido_id": turno_a.id,  # no llega a usarse, falla antes
        },
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT — receptor_id no pertenece al tenant del solicitante
    assert response.status_code == 400

    # Confirma el efecto de lado real: no se creó ninguna solicitud
    solicitudes_a = ctx["client"].get(
        "/rrhh/turnos/cambios", headers=_auth(ctx["token_admin_a"])
    ).json()
    assert solicitudes_a == []


# ─── 13 — reportar un accidente a nombre de un operario de otro tenant ─────


def test_no_puede_crear_accidente_para_afectado_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT — el admin de A reporta un accidente sobre el operario de B
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/accidentes",
        json={
            "afectado_id": ctx["op_b_id"],
            "fecha_hora": "2026-01-01T09:00:00",
            "tipo": "incidente",
            "descripcion": "Corte superficial en la mano izquierda",
        },
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400

    # Confirma el efecto de lado real: no se creó ningún accidente
    accidentes_b = ctx["client"].get(
        "/rrhh/accidentes", headers=_auth(ctx["token_admin_b"])
    ).json()
    assert accidentes_b == []


# ─── 14 — asignar un turno en bloque a un operario de otro tenant ──────────


def test_no_puede_crear_turno_bulk_para_operario_de_otro_tenant(rrhh_client):
    # ARRANGE / ACT — el admin de A asigna un turno al operario de B
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/turnos/bulk",
        json={
            "turnos": [
                {"operario_id": ctx["op_b_id"], "fecha": "2026-02-01", "turno": "manana"},
            ]
        },
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400

    # Confirma el efecto de lado real: no se creó ningún turno
    turnos_b = ctx["client"].get(
        "/rrhh/turnos",
        params={"fecha_inicio": "2026-02-01", "fecha_fin": "2026-02-01"},
        headers=_auth(ctx["token_admin_b"]),
    ).json()
    assert turnos_b == []
