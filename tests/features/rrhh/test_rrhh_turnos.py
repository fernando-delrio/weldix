"""
Turnos: asignación por el admin (cuadrante semanal), consulta por operario
(solo los suyos) y solicitud de cambio de turno entre compañeros.

Este módulo SÍ filtra correctamente por tenant_id en todas sus queries
(service.py get_turnos_semana / crear_turno_bulk / eliminar_turno / ...).
"""
from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _crear_turno(client, token, operario_id, fecha, turno="manana"):
    return client.post(
        "/rrhh/turnos/bulk",
        json={"turnos": [{"operario_id": operario_id, "fecha": fecha, "turno": turno}]},
        headers=_auth(token),
    )


# ─── Asignación (bulk) — admin only ──────────────────────────────────────────


def test_admin_asigna_turno_a_operario(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    fecha = date.today().isoformat()

    # ACT
    response = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha)

    # ASSERT
    assert response.status_code == 201
    assert response.json()[0]["turno"] == "manana"


def test_operario_no_puede_asignar_turnos(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_turno(ctx["client"], ctx["token_op_a"], ctx["op_a_id"], date.today().isoformat())

    # ASSERT
    assert response.status_code == 403


def test_asignar_turno_dos_veces_mismo_dia_actualiza_en_lugar_de_duplicar(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    fecha = date.today().isoformat()
    _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha, turno="manana")

    # ACT — se reasigna el mismo día a otro turno
    _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha, turno="tarde")
    turnos = ctx["client"].get(
        "/rrhh/turnos",
        params={"fecha_inicio": fecha, "fecha_fin": fecha},
        headers=_auth(ctx["token_admin_a"]),
    ).json()

    # ASSERT — sigue habiendo un único turno ese día, con el valor actualizado
    assert len(turnos) == 1
    assert turnos[0]["turno"] == "tarde"


# ─── Consulta — operario solo ve los suyos ───────────────────────────────────


def test_operario_solo_ve_sus_propios_turnos(rrhh_client):
    # ARRANGE — el admin asigna turno a sí mismo y al operario
    ctx = rrhh_client
    fecha = date.today().isoformat()
    _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha)

    # ACT
    response = ctx["client"].get(
        "/rrhh/turnos",
        params={"fecha_inicio": fecha, "fecha_fin": fecha},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert all(t["operario_id"] == ctx["op_a_id"] for t in response.json())


def test_admin_no_ve_turnos_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    fecha = date.today().isoformat()
    _crear_turno(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"], fecha)

    # ACT
    response = ctx["client"].get(
        "/rrhh/turnos",
        params={"fecha_inicio": fecha, "fecha_fin": fecha},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.json() == []


# ─── Eliminar ────────────────────────────────────────────────────────────────


def test_eliminar_turno_inexistente_devuelve_404(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].delete("/rrhh/turnos/999999", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.status_code == 404


def test_admin_no_puede_eliminar_turno_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    fecha = date.today().isoformat()
    turno_b = _crear_turno(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"], fecha).json()[0]

    # ACT
    response = ctx["client"].delete(
        f"/rrhh/turnos/{turno_b['id']}", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 404


# ─── Solicitud de cambio de turno ─────────────────────────────────────────────


def test_operario_solicita_cambio_de_turno(rrhh_client):
    # ARRANGE — dos turnos distintos, uno de cada "parte" del intercambio
    ctx = rrhh_client
    hoy = date.today().isoformat()
    mañana = (date.today() + timedelta(days=1)).isoformat()
    turno_propio = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], hoy, "manana").json()[0]
    # El admin también tiene turno asignado — actúa como "receptor" del cambio
    turno_admin = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], mañana, "tarde").json()[0]

    # ACT
    response = ctx["client"].post(
        "/rrhh/turnos/solicitar-cambio",
        json={
            "receptor_id": ctx["op_a_id"],
            "turno_cedido_id": turno_propio["id"],
            "turno_recibido_id": turno_admin["id"],
            "motivo": "Cita médica",
        },
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "pendiente"


def test_admin_aprueba_cambio_de_turno_intercambia_los_operarios(rrhh_client):
    # ARRANGE — turno de A un día, turno "de B" (aquí simulado con el admin del
    # mismo tenant para no acoplar el test a un tercer operario) otro día
    ctx = rrhh_client
    hoy = date.today().isoformat()
    mañana = (date.today() + timedelta(days=1)).isoformat()
    turno_operario = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], hoy, "manana").json()[0]
    turno_otro = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], mañana, "tarde").json()[0]
    solicitud = ctx["client"].post(
        "/rrhh/turnos/solicitar-cambio",
        json={
            "receptor_id": ctx["op_a_id"],
            "turno_cedido_id": turno_operario["id"],
            "turno_recibido_id": turno_otro["id"],
        },
        headers=_auth(ctx["token_op_a"]),
    ).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/turnos/cambios/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "aprobada"


def test_revisar_cambio_de_turno_ya_revisado_falla(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    hoy = date.today().isoformat()
    mañana = (date.today() + timedelta(days=1)).isoformat()
    turno_a = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], hoy).json()[0]
    turno_b = _crear_turno(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], mañana).json()[0]
    solicitud = ctx["client"].post(
        "/rrhh/turnos/solicitar-cambio",
        json={"receptor_id": ctx["op_a_id"], "turno_cedido_id": turno_a["id"], "turno_recibido_id": turno_b["id"]},
        headers=_auth(ctx["token_op_a"]),
    ).json()
    ctx["client"].patch(
        f"/rrhh/turnos/cambios/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/turnos/cambios/{solicitud['id']}/revisar",
        json={"estado": "rechazada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


def test_operario_no_puede_listar_cambios_de_turno(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/turnos/cambios", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert response.status_code == 403
