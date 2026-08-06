"""
Accidentes laborales: cualquier usuario autenticado puede reportar, solo el
admin lista/actualiza/consulta índices, el operario solo ve los suyos.
Incluye el aislamiento por tenant (SÍ está bien filtrado en este módulo).

BUG real encontrado (ver test_mis_accidentes_endpoint_crashes_with_nameerror):
GET /rrhh/accidentes/mios usa `AccidenteLaboral` sin importarlo en
backend/features/rrhh/router.py -> NameError en cada llamada.
"""
from datetime import datetime, timedelta, timezone


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _crear_accidente(client, token, **overrides):
    payload = {
        "afectado_id": overrides.pop("afectado_id"),
        "fecha_hora": datetime.now(timezone.utc).isoformat(),
        "tipo": "incidente",
        "descripcion": "Descripción de prueba con más de 10 caracteres",
    }
    payload.update(overrides)
    return client.post("/rrhh/accidentes", json=payload, headers=_auth(token))


# ─── Reportar — cualquier usuario autenticado ────────────────────────────────


def test_operario_puede_reportar_su_propio_accidente(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_accidente(
        ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"]
    )

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "abierto"


def test_crear_accidente_con_descripcion_muy_corta_falla_validacion(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].post(
        "/rrhh/accidentes",
        json={
            "afectado_id": ctx["op_a_id"],
            "fecha_hora": datetime.now(timezone.utc).isoformat(),
            "tipo": "incidente",
            "descripcion": "corta",
        },
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 422


# ─── Roles — solo admin lista todos ──────────────────────────────────────────


def test_operario_no_puede_listar_todos_los_accidentes(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get("/rrhh/accidentes", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert response.status_code == 403


def test_admin_puede_listar_todos_los_accidentes_de_su_taller(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_accidente(ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"])

    # ACT
    response = ctx["client"].get("/rrhh/accidentes", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 1


# ─── Aislamiento por tenant (SÍ filtrado correctamente) ─────────────────────


def test_admin_no_ve_accidentes_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_accidente(ctx["client"], ctx["token_op_b"], afectado_id=ctx["op_b_id"])

    # ACT
    response = ctx["client"].get("/rrhh/accidentes", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.json() == []


def test_admin_no_puede_actualizar_accidente_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    accidente_b = _crear_accidente(
        ctx["client"], ctx["token_op_b"], afectado_id=ctx["op_b_id"]
    ).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/accidentes/{accidente_b['id']}",
        json={"estado": "cerrado"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


# ─── Actualizar — admin only + validación de estado ──────────────────────────


def test_admin_actualiza_estado_del_accidente(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    accidente = _crear_accidente(
        ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"]
    ).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/accidentes/{accidente['id']}",
        json={"estado": "en_investigacion", "causa_raiz": "Falta de EPI"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "en_investigacion"
    assert response.json()["causa_raiz"] == "Falta de EPI"


def test_actualizar_accidente_con_estado_invalido_falla(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    accidente = _crear_accidente(
        ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"]
    ).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/accidentes/{accidente['id']}",
        json={"estado": "no_existe"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


def test_operario_no_puede_actualizar_accidentes(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    accidente = _crear_accidente(
        ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"]
    ).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/accidentes/{accidente['id']}",
        json={"estado": "cerrado"},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 403


# ─── Índices de siniestralidad — solo admin ──────────────────────────────────


def test_operario_no_puede_consultar_indices_siniestralidad(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get(
        "/rrhh/accidentes/indices", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


def test_indices_siniestralidad_sin_accidentes_da_ceros(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].get(
        "/rrhh/accidentes/indices", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    data = response.json()
    assert data["total_accidentes"] == 0
    assert data["indice_frecuencia"] == 0.0
    assert data["indice_gravedad"] == 0.0


# ─── Regresión: /accidentes/mios ya no crashea con NameError ───────────────


def test_mis_accidentes_devuelve_solo_los_propios_del_operario(rrhh_client):
    """
    Regresión del bug real que hubo en backend/features/rrhh/router.py,
    función `mis_accidentes`: usaba `AccidenteLaboral` sin importarlo,
    lanzando NameError en cada llamada. Ya se corrigió el import (ver
    ERRORES_APRENDIDOS.md) — este test confirma que el endpoint responde
    con éxito y devuelve solo los accidentes en los que el operario figura
    como afectado.
    """
    # ARRANGE
    ctx = rrhh_client
    _crear_accidente(ctx["client"], ctx["token_op_a"], afectado_id=ctx["op_a_id"])
    _crear_accidente(ctx["client"], ctx["token_admin_a"], afectado_id=ctx["op_a_id"])

    # ACT
    response = ctx["client"].get("/rrhh/accidentes/mios", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert all(a["afectado_id"] == ctx["op_a_id"] for a in response.json())
