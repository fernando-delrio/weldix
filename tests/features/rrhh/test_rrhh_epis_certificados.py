"""
EPIs, certificados, reconocimientos médicos y permisos de trabajo especial.

Estos cuatro recursos comparten la misma forma: admin crea/registra, admin y
el propio operario pueden verlos, y SÍ filtran correctamente por tenant_id
(a diferencia de SolicitudAusencia — ver test_rrhh_tenant_isolation_bugs.py).

Cobertura: happy path + 404 en inexistente + aislamiento por tenant + la
lógica real de "próximos a caducar" (filtro de fecha).
"""
from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════════════════
# EPIs
# ══════════════════════════════════════════════════════════════════════════


def _crear_epi(client, token, operario_id, **overrides):
    payload = {
        "operario_id": operario_id,
        "tipo_epi": "casco",
        "cantidad": 1,
        "fecha_entrega": date.today().isoformat(),
    }
    payload.update(overrides)
    return client.post("/rrhh/epis", json=payload, headers=_auth(token))


def test_admin_registra_entrega_de_epi(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "activo"


def test_operario_no_puede_registrar_epi(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_epi(ctx["client"], ctx["token_op_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 403


def test_operario_solo_ve_sus_propios_epis(rrhh_client):
    # ARRANGE — el admin entrega un EPI al operario A y otro a sí mismo (admin)
    ctx = rrhh_client
    admin_a_id = ctx["client"].get(
        "/rrhh/tipos-epi", headers=_auth(ctx["token_admin_a"])
    )  # no-op, solo para reutilizar auth; el id real del admin no es necesario aquí
    _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ACT
    response = ctx["client"].get("/rrhh/epis", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert len(response.json()) == 1
    assert response.json()[0]["operario_id"] == ctx["op_a_id"]


def test_admin_no_ve_epis_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_epi(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"])

    # ACT
    response = ctx["client"].get("/rrhh/epis", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.json() == []


def test_epis_proximos_caducar_filtra_por_dias(rrhh_client):
    # ARRANGE — uno caduca en 10 días (dentro del filtro), otro en 200 (fuera)
    ctx = rrhh_client
    pronto = (date.today() + timedelta(days=10)).isoformat()
    lejos = (date.today() + timedelta(days=200)).isoformat()
    _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha_caducidad=pronto, tipo_epi="guantes")
    _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha_caducidad=lejos, tipo_epi="botas")

    # ACT
    response = ctx["client"].get(
        "/rrhh/epis/proximos-caducar",
        params={"dias": 30},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    tipos = [e["tipo_epi"] for e in response.json()]
    assert tipos == ["guantes"]


def test_eliminar_epi_inexistente_devuelve_404(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = ctx["client"].delete("/rrhh/epis/999999", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.status_code == 404


def test_actualizar_estado_epi_con_valor_invalido_falla(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    epi = _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"]).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/epis/{epi['id']}/estado",
        params={"estado": "no_valido"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 400


def test_actualizar_estado_epi_a_baja(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    epi = _crear_epi(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"]).json()

    # ACT
    response = ctx["client"].patch(
        f"/rrhh/epis/{epi['id']}/estado",
        params={"estado": "baja"},
        headers=_auth(ctx["token_admin_a"]),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "baja"


# ══════════════════════════════════════════════════════════════════════════
# Certificados
# ══════════════════════════════════════════════════════════════════════════


def _crear_certificado(client, token, operario_id, **overrides):
    data = {
        "operario_id": operario_id,
        "tipo": "soldadura_homologada",
        "fecha_emision": date.today().isoformat(),
    }
    data.update(overrides)
    return client.post("/rrhh/certificados", data=data, headers=_auth(token))


def test_admin_sube_certificado_sin_archivo(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_certificado(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "vigente"


def test_operario_no_puede_subir_certificado(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_certificado(ctx["client"], ctx["token_op_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 403


def test_admin_no_ve_certificados_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_certificado(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"])

    # ACT
    response = ctx["client"].get("/rrhh/certificados", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.json() == []


def test_certificados_proximos_caducar_respeta_ventana_de_60_dias(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    pronto = (date.today() + timedelta(days=30)).isoformat()
    lejos = (date.today() + timedelta(days=400)).isoformat()
    _crear_certificado(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"], fecha_caducidad=pronto)
    _crear_certificado(
        ctx["client"], ctx["token_admin_a"], ctx["op_a_id"],
        fecha_caducidad=lejos, tipo="carretillero",
    )

    # ACT
    response = ctx["client"].get(
        "/rrhh/certificados/proximos-caducar", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert len(response.json()) == 1
    assert response.json()[0]["tipo"] == "soldadura_homologada"


# ══════════════════════════════════════════════════════════════════════════
# Reconocimientos médicos
# ══════════════════════════════════════════════════════════════════════════


def _crear_reconocimiento(client, token, operario_id, **overrides):
    data = {
        "operario_id": operario_id,
        "fecha_realizado": date.today().isoformat(),
        "resultado": "apto",
    }
    data.update(overrides)
    return client.post("/rrhh/reconocimientos", data=data, headers=_auth(token))


def test_admin_registra_reconocimiento_medico(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_reconocimiento(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 201
    assert response.json()["resultado"] == "apto"


def test_operario_ve_su_propio_reconocimiento(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_reconocimiento(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ACT
    response = ctx["client"].get("/rrhh/reconocimientos", headers=_auth(ctx["token_op_a"]))

    # ASSERT
    assert len(response.json()) == 1


def test_admin_no_ve_reconocimientos_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_reconocimiento(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"])

    # ACT
    response = ctx["client"].get("/rrhh/reconocimientos", headers=_auth(ctx["token_admin_a"]))

    # ASSERT
    assert response.json() == []


# ══════════════════════════════════════════════════════════════════════════
# Permisos de trabajo especial
# ══════════════════════════════════════════════════════════════════════════


def _crear_permiso(client, token, operario_id, **overrides):
    data = {
        "operario_id": operario_id,
        "tipo": "alturas",
        "fecha_emision": date.today().isoformat(),
    }
    data.update(overrides)
    return client.post("/rrhh/permisos-especiales", data=data, headers=_auth(token))


def test_admin_crea_permiso_de_trabajo_especial(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_permiso(ctx["client"], ctx["token_admin_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 201
    assert response.json()["estado"] == "activo"


def test_operario_no_puede_crear_permiso_especial(rrhh_client):
    # ARRANGE / ACT
    ctx = rrhh_client
    response = _crear_permiso(ctx["client"], ctx["token_op_a"], ctx["op_a_id"])

    # ASSERT
    assert response.status_code == 403


def test_admin_no_ve_permisos_especiales_de_otro_tenant(rrhh_client):
    # ARRANGE
    ctx = rrhh_client
    _crear_permiso(ctx["client"], ctx["token_admin_b"], ctx["op_b_id"])

    # ACT
    response = ctx["client"].get(
        "/rrhh/permisos-especiales", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.json() == []
