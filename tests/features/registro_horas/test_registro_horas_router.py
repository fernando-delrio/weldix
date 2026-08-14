"""
Camino feliz de backend/features/registro_horas/router.py vía HTTP real:
iniciar -> activo -> finalizar -> resumen de horas de la OT.
"""


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _iniciar_jornada(ctx, token: str) -> None:
    ctx["client"].post("/fichajes/iniciar", headers=_auth(token))


def _iniciar_registro(ctx, token: str, job_id: int) -> dict:
    return ctx["client"].post(
        "/registro-horas/iniciar", json={"job_id": job_id}, headers=_auth(token)
    ).json()


def test_iniciar_registro_sin_jornada_abierta_devuelve_400(registro_horas_client):
    # ARRANGE — operario A sin fichaje abierto
    ctx = registro_horas_client

    # ACT
    response = ctx["client"].post(
        "/registro-horas/iniciar",
        json={"job_id": ctx["job_a_id"]},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 400


def test_iniciar_registro_con_jornada_abierta_devuelve_201(registro_horas_client):
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])

    # ACT
    response = ctx["client"].post(
        "/registro-horas/iniciar",
        json={"job_id": ctx["job_a_id"]},
        headers=_auth(ctx["token_op_a"]),
    )

    # ASSERT
    assert response.status_code == 201
    assert response.json()["fin"] is None


def test_get_registro_activo_devuelve_el_registro_abierto(registro_horas_client):
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"])

    # ACT
    response = ctx["client"].get(
        "/registro-horas/activo", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["id"] == registro["id"]


def test_get_registro_activo_devuelve_null_sin_registro_abierto(registro_horas_client):
    # ARRANGE
    ctx = registro_horas_client

    # ACT
    response = ctx["client"].get(
        "/registro-horas/activo", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json() is None


def test_finalizar_registro_propio_cierra_y_calcula_horas(registro_horas_client):
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"])

    # ACT
    response = ctx["client"].post(
        f"/registro-horas/{registro['id']}/finalizar", headers=_auth(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["fin"] is not None
    assert body["horas"] is not None


def test_horas_ot_devuelve_resumen_tras_finalizar(registro_horas_client):
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"])
    ctx["client"].post(
        f"/registro-horas/{registro['id']}/finalizar", headers=_auth(ctx["token_op_a"])
    )

    # ACT
    response = ctx["client"].get(
        f"/trabajos/{ctx['job_a_id']}/horas", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == ctx["job_a_id"]
    assert body["total_horas"] >= 0
    assert len(body["registros"]) == 1
