"""
Flujo de negocio completo de solicitudes de ausencia (vacaciones, baja médica...):

  operario solicita -> admin aprueba (saldo se actualiza)
                     -> admin rechaza (saldo NO cambia)
  operario cancela su propia solicitud pendiente
  operario NO puede cancelar la solicitud de otro
  operario NO puede aprobar/rechazar ninguna solicitud (endpoint admin-only)

Usa la fixture local `rrhh_client` (tests/features/rrhh/conftest.py):
1 taller = 1 admin + 1 operario, con auth + rrhh montados.
"""
from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _future_dates(dias_desde_hoy: int, duracion: int) -> tuple[str, str]:
    inicio = date.today() + timedelta(days=dias_desde_hoy)
    fin = inicio + timedelta(days=duracion)
    return inicio.isoformat(), fin.isoformat()


# ─── Crear solicitud ──────────────────────────────────────────────────────────


def test_operario_crea_solicitud_y_aparece_en_mis_solicitudes(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)

    # ACT
    response = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    )
    mias = ctx["client"].get(
        "/rrhh/solicitudes/mis-solicitudes", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "pendiente"
    assert len(mias.json()) == 1


def test_solicitud_con_fecha_pasada_es_rechazada(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    ayer = (date.today() - timedelta(days=1)).isoformat()

    # ACT
    response = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": ayer, "fecha_fin": ayer},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 400


def test_solicitud_de_vacaciones_que_supera_saldo_disponible_es_rechazada(rrhh_client):
    # ARRANGE — el convenio por defecto da 22 días/año; pedimos 30 días laborables
    ctx = rrhh_client
    inicio, fin = _future_dates(5, 45)  # ventana amplia para acumular > 22 laborables

    # ACT
    response = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 400
    assert "suficientes días" in response.json()["detail"]


def test_solicitud_solapada_con_otra_activa_es_rechazada(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    )

    # ACT — segunda solicitud que se solapa con la primera
    response = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "asuntos_propios", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 400


# ─── Aprobación — efecto de lado en el saldo ─────────────────────────────────


def test_aprobar_solicitud_de_vacaciones_mueve_dias_de_pendientes_a_aprobados(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 4)  # 5 días naturales -> algunos laborables
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()
    saldo_antes = ctx["client"].get(
        "/rrhh/saldo/mio", headers=_auth(ctx["token_op_a"])
    ).json()

    # ACT
    ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )
    saldo_despues = ctx["client"].get(
        "/rrhh/saldo/mio", headers=_auth(ctx["token_op_a"])
    ).json()

    # ASSERT — antes: días pendientes. Después: los mismos días, pero aprobados.
    dias = solicitud["dias_solicitados"]
    assert saldo_antes["dias_pendientes"] == dias
    assert saldo_antes["dias_aprobados"] == 0
    assert saldo_despues["dias_pendientes"] == 0
    assert saldo_despues["dias_aprobados"] == dias
    # El total disponible no cambia entre "pendiente" y "aprobada" — ya se
    # reservaba desde que estaba pendiente.
    assert saldo_antes["dias_disponibles"] == saldo_despues["dias_disponibles"]


def test_rechazar_solicitud_no_descuenta_del_saldo_disponible(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 4)
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()

    # ACT
    ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "rechazada", "comentario_admin": "Sin cobertura ese mes"},
        headers=_auth(ctx["token_admin_a"]),
    )
    saldo = ctx["client"].get(
        "/rrhh/saldo/mio", headers=_auth(ctx["token_op_a"])
    ).json()

    # ASSERT — la solicitud rechazada no resta nada: ni pendiente ni aprobado
    assert saldo["dias_pendientes"] == 0
    assert saldo["dias_aprobados"] == 0
    assert saldo["dias_disponibles"] == saldo["dias_totales"]


def test_revisar_solicitud_ya_revisada_falla(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()
    ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ACT — se intenta revisar otra vez
    response = ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "rechazada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


# ─── Roles — el operario nunca puede revisar solicitudes ─────────────────────


def test_operario_no_puede_aprobar_ninguna_solicitud(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()

    # ACT — el propio solicitante intenta aprobar su solicitud
    response = ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT — bloqueado por rol, ni siquiera llega a evaluar que es la suya
    assert response.status_code == 403


def test_operario_no_puede_listar_todas_las_solicitudes(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get(
        "/rrhh/solicitudes", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


# ─── Cancelación ──────────────────────────────────────────────────────────────


def test_operario_cancela_su_propia_solicitud_pendiente(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()

    # ACT
    response = ctx["client"].delete(
        f"/rrhh/solicitudes/{solicitud['id']}", headers=_auth(ctx["token_op_a"])
    )
    mias = ctx["client"].get(
        "/rrhh/solicitudes/mis-solicitudes", headers=_auth(ctx["token_op_a"])
    ).json()

    # ASSERT
    assert response.status_code == 204
    assert mias[0]["estado"] == "cancelada"


def test_operario_no_puede_cancelar_solicitud_de_otro_operario(rrhh_client):
    # ARRANGE — el admin (otro usuario del mismo taller) crea su propia solicitud
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    solicitud_del_admin = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_admin_a"]),
    ).json()

    # ACT — el operario intenta cancelar la solicitud del admin
    response = ctx["client"].delete(
        f"/rrhh/solicitudes/{solicitud_del_admin['id']}", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


def test_cancelar_solicitud_ya_aprobada_falla(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    inicio, fin = _future_dates(10, 2)
    solicitud = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "vacaciones", "fecha_inicio": inicio, "fecha_fin": fin},
        headers=_auth(ctx["token_op_a"]),
    ).json()
    ctx["client"].patch(
        f"/rrhh/solicitudes/{solicitud['id']}/revisar",
        json={"estado": "aprobada"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ACT
    response = ctx["client"].delete(
        f"/rrhh/solicitudes/{solicitud['id']}", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 400


def test_cancelar_solicitud_inexistente_devuelve_400(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].delete(
        "/rrhh/solicitudes/999999", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 400
