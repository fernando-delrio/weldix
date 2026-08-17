"""
Configuración laboral, resumen de horas y lookups — permisos y roles.

- POST /rrhh/config es admin-only.
- GET /rrhh/horas-extra/{operario_id}: el operario solo puede consultar las
  suyas; el admin puede consultar las de cualquiera de su taller.
- Los lookups (tipos de ausencia, EPI, certificado, permiso especial) son de
  solo lectura para cualquier usuario autenticado.
"""
from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _proximo_dia_laborable() -> date:
    """La config por defecto es 'LMXJV' (lunes a viernes) -- crear_solicitud
    rechaza un rango sin días laborables. date.today() vale entre semana, pero
    hace que el test falle solo los fines de semana (nos pasó en CI)."""
    hoy = date.today()
    dias_hasta_lunes = {5: 2, 6: 1}  # sábado -> +2, domingo -> +1
    return hoy + timedelta(days=dias_hasta_lunes.get(hoy.weekday(), 0))


# ─── Configuración laboral — admin only ──────────────────────────────────────


def test_admin_crea_configuracion_laboral_de_un_operario(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/config",
        json={
            "operario_id": ctx["op_a_id"],
            "dias_vacaciones_anuales": 25,
            "horas_jornada": 7.5,
            "dias_laborables": "LMXJV",
            "turno": "tarde",
        },
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["dias_vacaciones_anuales"] == 25


def test_operario_no_puede_crear_configuracion_laboral(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/config",
        json={"operario_id": ctx["op_a_id"], "dias_vacaciones_anuales": 25},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 403


def test_config_con_turno_invalido_falla_validacion(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/config",
        json={"operario_id": ctx["op_a_id"], "turno": "turno_inexistente"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 422


def test_reasignar_configuracion_existente_actualiza_en_lugar_de_duplicar(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    ctx["client"].post(
        "/rrhh/config",
        json={"operario_id": ctx["op_a_id"], "dias_vacaciones_anuales": 22},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ACT — se reconfigura al mismo operario con otro valor
    response = ctx["client"].post(
        "/rrhh/config",
        json={"operario_id": ctx["op_a_id"], "dias_vacaciones_anuales": 30},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT — mismo registro, valor actualizado (no se duplica)
    assert response.json()["dias_vacaciones_anuales"] == 30


# ─── Resumen de horas — el operario solo ve las suyas ────────────────────────


def test_operario_consulta_sus_propias_horas(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get(
        f"/rrhh/horas-extra/{ctx['op_a_id']}", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["operario_id"] == ctx["op_a_id"]


def test_operario_no_puede_consultar_horas_de_otro_usuario(rrhh_client):
    """El operario A intenta ver las horas del admin de su propio taller."""
    # ARRANGE — necesitamos el id del admin; lo obtenemos creando una solicitud
    # con su token y leyendo el operario_id de la respuesta.
    ctx = rrhh_client
    inicio = _proximo_dia_laborable().isoformat()
    solicitud_admin = ctx["client"].post(
        "/rrhh/solicitudes",
        json={"tipo": "asuntos_propios", "fecha_inicio": inicio, "fecha_fin": inicio},
        headers=_auth(ctx["token_admin_a"]),
    ).json()
    admin_id = solicitud_admin["operario_id"]

    # ACT
    response = ctx["client"].get(
        f"/rrhh/horas-extra/{admin_id}", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


def test_admin_puede_consultar_horas_de_cualquier_operario_de_su_taller(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get(
        f"/rrhh/horas-extra/{ctx['op_a_id']}", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 200


# ─── Lookups — lectura para cualquier usuario autenticado ────────────────────


def test_tipos_ausencia_disponible_para_cualquier_usuario(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/tipos-ausencia", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert response.status_code == 200
    valores = [t["valor"] for t in response.json()]
    assert "vacaciones" in valores
    assert "baja_medica" in valores


def test_tipos_ausencia_marca_cuales_requieren_justificante(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/tipos-ausencia", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    por_valor = {t["valor"]: t["requiere_justificante"] for t in response.json()}
    assert por_valor["baja_medica"] is True
    assert por_valor["vacaciones"] is False


def test_lookups_sin_autenticar_devuelven_401(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/tipos-epi")

    # ASSERT
    assert response.status_code in (401, 403)


# ─── Festivos ─────────────────────────────────────────────────────────────────


def test_festivos_requiere_autenticacion(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/festivos", params={"year": 2026})

    # ASSERT
    assert response.status_code in (401, 403)
