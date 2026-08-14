"""
Tests de backend/features/seguimiento/ (GET /seguimiento/{token}).

Endpoint público — sin autenticación. El cliente final accede con el token
que genera `POST /trabajos/{id}/compartir` (jobs/router.py, ya cubierto por
tests/features/jobs/test_jobs_isolation.py para el aislamiento del propio
endpoint de compartir).
"""

_PUBLIC_FIELDS = {"code", "titulo", "estado", "estado_label", "estado_step", "progreso"}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job_and_token(client, admin_token: str, **overrides) -> tuple[dict, str]:
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Confidencial SL"}
    payload.update(overrides)
    job = client.post("/trabajos", json=payload, headers=_auth(admin_token)).json()
    token = client.post(
        f"/trabajos/{job['id']}/compartir", headers=_auth(admin_token)
    ).json()["token"]
    return job, token


# ─── Camino feliz ────────────────────────────────────────────────────────────


def test_get_public_status_with_valid_token_returns_200(seguimiento_client):
    # ARRANGE
    client, admin_token = seguimiento_client
    _, token = _create_job_and_token(client, admin_token)

    # ACT — sin cabecera de autenticación: es un endpoint público
    response = client.get(f"/seguimiento/{token}")

    # ASSERT
    assert response.status_code == 200


def test_get_public_status_returns_current_job_data(seguimiento_client):
    # ARRANGE
    client, admin_token = seguimiento_client
    job, token = _create_job_and_token(client, admin_token, titulo="Barandilla inox")

    # ACT
    body = client.get(f"/seguimiento/{token}").json()

    # ASSERT
    assert body["code"] == job["code"]
    assert body["titulo"] == "Barandilla inox"
    assert body["estado"] == "pendiente"
    assert body["estado_label"] == "Pendiente"
    assert body["estado_step"] == 1


def test_public_status_reflects_current_state_after_change(seguimiento_client):
    """El seguimiento público no es una foto fija — refleja el estado actual."""
    # ARRANGE
    client, admin_token = seguimiento_client
    job, token = _create_job_and_token(client, admin_token)

    # ACT
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth(admin_token),
    )
    body = client.get(f"/seguimiento/{token}").json()

    # ASSERT
    assert body["estado"] == "en_proceso"
    assert body["estado_label"] == "En proceso"
    assert body["estado_step"] == 2


# ─── Caso de error ───────────────────────────────────────────────────────────


def test_get_public_status_with_invalid_token_returns_404(seguimiento_client):
    # ARRANGE
    client, _admin_token = seguimiento_client

    # ACT
    response = client.get("/seguimiento/token-que-no-existe")

    # ASSERT
    assert response.status_code == 404


# ─── No exponer datos internos sensibles ─────────────────────────────────────


def test_public_status_does_not_expose_internal_fields(seguimiento_client):
    """El schema PublicJobStatus debe limitarse a lo mínimo para seguimiento:
    nunca el cliente, la descripción interna ni el operario asignado."""
    # ARRANGE
    client, admin_token = seguimiento_client
    _, token = _create_job_and_token(
        client,
        admin_token,
        cliente="Cliente Confidencial SL",
        descripcion="Nota interna: cobrar por adelantado, cliente moroso",
    )

    # ACT
    body = client.get(f"/seguimiento/{token}").json()

    # ASSERT — solo los campos públicos, ni uno más
    assert set(body.keys()) == _PUBLIC_FIELDS
    assert "cliente" not in body
    assert "descripcion" not in body
    assert "operario_id" not in body
    serialized = str(body)
    assert "Confidencial" not in serialized
    assert "moroso" not in serialized
