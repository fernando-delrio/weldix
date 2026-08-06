"""
Tests de backend/features/historial/ (GET /trabajos/{trabajo_id}/historial).

Los eventos NUNCA se crean a mano en estos tests — se generan reutilizando
`add_event`, que jobs/service.py ya invoca internamente al crear un trabajo
y al cambiar su estado (ver jobs/service.py create_job y update_estado).
"""


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_job(client, token: str, **overrides) -> dict:
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth(token)).json()


# ─── Camino feliz ────────────────────────────────────────────────────────────


def test_historial_includes_creation_event_after_job_is_created(
    two_tenants_historial_client,
):
    # ARRANGE
    client, token_a, _ = two_tenants_historial_client
    job = _create_job(client, token_a)

    # ACT
    response = client.get(
        f"/trabajos/{job['id']}/historial", headers=_auth(token_a)
    )

    # ASSERT
    assert response.status_code == 200
    eventos = response.json()
    assert len(eventos) == 1
    assert eventos[0]["tipo"] == "creado"
    assert job["code"] in eventos[0]["descripcion"]


def test_historial_includes_status_change_event(two_tenants_historial_client):
    # ARRANGE
    client, token_a, _ = two_tenants_historial_client
    job = _create_job(client, token_a)

    # ACT
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth(token_a),
    )
    eventos = client.get(
        f"/trabajos/{job['id']}/historial", headers=_auth(token_a)
    ).json()

    # ASSERT
    tipos = [e["tipo"] for e in eventos]
    assert "estado_cambiado" in tipos


def test_historial_events_are_ordered_chronologically(two_tenants_historial_client):
    # ARRANGE — un trabajo con dos eventos: creación y cambio de estado
    client, token_a, _ = two_tenants_historial_client
    job = _create_job(client, token_a)

    # ACT
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth(token_a),
    )
    eventos = client.get(
        f"/trabajos/{job['id']}/historial", headers=_auth(token_a)
    ).json()

    # ASSERT — el más antiguo (creación) va primero, el más reciente al final
    assert eventos[0]["tipo"] == "creado"
    assert eventos[-1]["tipo"] == "estado_cambiado"
    assert eventos[0]["created_at"] <= eventos[-1]["created_at"]


# ─── Casos de error ──────────────────────────────────────────────────────────


def test_historial_without_auth_token_returns_401(two_tenants_historial_client):
    # ARRANGE
    client, token_a, _ = two_tenants_historial_client
    job = _create_job(client, token_a)

    # ACT
    response = client.get(f"/trabajos/{job['id']}/historial")

    # ASSERT
    assert response.status_code == 401


# ─── Aislamiento multi-tenant ────────────────────────────────────────────────


def test_historial_of_other_tenants_job_returns_empty_list(
    two_tenants_historial_client,
):
    """El admin de Taller B nunca ve los eventos de una OT del Taller A,
    aunque conozca su id y pida el endpoint directamente."""
    # ARRANGE
    client, token_a, token_b = two_tenants_historial_client
    job_a = _create_job(client, token_a, titulo="Trabajo confidencial de A")

    # ACT
    response = client.get(
        f"/trabajos/{job_a['id']}/historial", headers=_auth(token_b)
    )

    # ASSERT — 200 con lista vacía: el endpoint filtra eventos por tenant_id,
    # no valida la existencia del job, así que no cruza datos entre talleres.
    assert response.status_code == 200
    assert response.json() == []
