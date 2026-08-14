"""
Tests de aislamiento multi-tenant para equipos (GMAO).

Verifican que el admin del Taller A nunca ve, modifica, cambia de estado ni
borra un equipo del Taller B. Usa `two_tenants_equipos_client`
(tests/features/equipos/conftest.py), que monta auth + equipos con dos
tenants reales y devuelve (client, token_a, token_b).

Nota: cada workspace nace con 1 equipo demo propio (seed_workspace_demo_data,
is_demo=True, "Soldadora MIG (demo)", ver backend/features/demo/service.py)
— por eso los tests de listado comparan pertenencia, no listas exactas.
"""
from datetime import date, timedelta


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_equipo(client, token: str, **overrides):
    payload = {"nombre": "Soldadora MIG", "tipo": "Soldadora", "intervalo_dias": 90}
    payload.update(overrides)
    return client.post("/equipos", json=payload, headers=_auth_header(token))


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_equipos_never_shows_other_tenants_equipos(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    _create_equipo(client, token_a, nombre="Equipo exclusivo de A")
    _create_equipo(client, token_b, nombre="Equipo exclusivo de B")

    # ACT
    response_a = client.get("/equipos", headers=_auth_header(token_a))

    # ASSERT — A ve el suyo (+ 1 demo propio), nunca el de B
    names = [e["nombre"] for e in response_a.json()]
    assert "Equipo exclusivo de A" in names
    assert "Equipo exclusivo de B" not in names


# ─── Obtener uno ───────────────────────────────────────────────────────────


def test_get_equipo_from_other_tenant_returns_404(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a).json()

    # ACT
    response = client.get(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


# ─── Actualización parcial ─────────────────────────────────────────────────


def test_update_equipo_of_other_tenant_returns_404(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a, nombre="Original de A").json()

    # ACT
    response = client.patch(
        f"/equipos/{equipo_a['id']}",
        json={"nombre": "Hackeado por B"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_update_equipo_of_other_tenant_does_not_mutate_it(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a, nombre="Original de A").json()

    # ACT
    client.patch(
        f"/equipos/{equipo_a['id']}",
        json={"nombre": "Hackeado por B"},
        headers=_auth_header(token_b),
    )
    check = client.get(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_a))

    # ASSERT
    assert check.json()["nombre"] == "Original de A"


# ─── Cambio de estado ──────────────────────────────────────────────────────


def test_update_estado_of_other_tenants_equipo_returns_404(two_tenants_equipos_client):
    """B no puede tocar el equipo de A — para B, ese equipo no existe."""
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a).json()

    # ACT — B intenta cambiar el estado del equipo de A
    response = client.patch(
        f"/equipos/{equipo_a['id']}/estado",
        json={"estado": "averiado"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_update_estado_attempt_from_other_tenant_does_not_mutate_it(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a).json()

    # ACT
    client.patch(
        f"/equipos/{equipo_a['id']}/estado",
        json={"estado": "averiado"},
        headers=_auth_header(token_b),
    )
    check = client.get(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_a))

    # ASSERT — el estado de A no cambió por la acción de B
    assert check.json()["estado"] == "operativo"


# ─── Borrado ────────────────────────────────────────────────────────────────


def test_delete_equipo_of_other_tenant_returns_404(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a).json()

    # ACT
    response = client.delete(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


def test_delete_attempt_from_other_tenant_does_not_remove_it(two_tenants_equipos_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_equipos_client
    equipo_a = _create_equipo(client, token_a).json()

    # ACT
    client.delete(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_b))
    still_there = client.get(f"/equipos/{equipo_a['id']}", headers=_auth_header(token_a))

    # ASSERT
    assert still_there.status_code == 200


# ─── Alertas ────────────────────────────────────────────────────────────────


def test_alertas_never_shows_other_tenants_overdue_equipos(two_tenants_equipos_client):
    # ARRANGE — A tiene un equipo con mantenimiento vencido
    client, token_a, token_b = two_tenants_equipos_client
    hace_100_dias = (date.today() - timedelta(days=100)).isoformat()
    equipo_a = _create_equipo(
        client, token_a, ultimo_mantenimiento=hace_100_dias, intervalo_dias=90
    ).json()

    # ACT — B consulta sus propias alertas
    response_b = client.get("/equipos/alertas", headers=_auth_header(token_b))

    # ASSERT — B nunca ve el equipo vencido de A
    ids = [e["id"] for e in response_b.json()]
    assert equipo_a["id"] not in ids
