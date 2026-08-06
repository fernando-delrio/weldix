"""
Tests HTTP del router de equipos (GMAO): CRUD, cambio de estado y el
endpoint de alertas de mantenimiento.

Usa `equipos_client` (admin sin tenant) para los casos CRUD, de autorización
y del criterio de alerta. Aislamiento multi-tenant completo vive en
test_equipos_isolation.py.
"""
from datetime import date, timedelta


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


def _create_operario(client, admin_token: str, email: str, full_name: str = "Operario Test"):
    return client.post(
        "/auth/admin/signup",
        json={
            "email": email,
            "password": "Operario123!",
            "full_name": full_name,
            "role": "operario",
        },
        headers=_auth_header(admin_token),
    )


def _create_equipo(client, token: str, **overrides):
    payload = {"nombre": "Soldadora MIG", "tipo": "Soldadora", "intervalo_dias": 90}
    payload.update(overrides)
    return client.post("/equipos", json=payload, headers=_auth_header(token))


# ─── Creación ──────────────────────────────────────────────────────────────


def test_create_equipo_requires_admin_role(equipos_client):
    # ARRANGE
    admin_token = _admin_token(equipos_client)
    _create_operario(equipos_client, admin_token, "operario1@weldix.dev")
    operario_token = _login(equipos_client, "operario1@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = _create_equipo(equipos_client, operario_token)

    # ASSERT
    assert response.status_code == 403


def test_create_equipo_happy_path(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = _create_equipo(equipos_client, token)

    # ASSERT
    assert response.status_code == 201
    body = response.json()
    assert body["nombre"] == "Soldadora MIG"
    assert body["estado"] == "operativo"
    assert body["alerta_mantenimiento"] is False


def test_create_equipo_with_invalid_estado_returns_400(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = _create_equipo(equipos_client, token, estado="estado_inexistente")

    # ASSERT
    assert response.status_code == 400


def test_create_equipo_without_token_returns_401(equipos_client):
    # ACT
    response = equipos_client.post("/equipos", json={"nombre": "Grua"})

    # ASSERT
    assert response.status_code == 401


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_equipos_returns_all(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    _create_equipo(equipos_client, token, nombre="Equipo 1")
    _create_equipo(equipos_client, token, nombre="Equipo 2")

    # ACT
    response = equipos_client.get("/equipos", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_equipos_accessible_by_operario(equipos_client):
    """Cualquier usuario autenticado puede leer la lista de equipos."""
    # ARRANGE
    admin_token = _admin_token(equipos_client)
    _create_equipo(equipos_client, admin_token)
    _create_operario(equipos_client, admin_token, "reader@weldix.dev")
    operario_token = _login(equipos_client, "reader@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = equipos_client.get("/equipos", headers=_auth_header(operario_token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 1


# ─── Obtener uno — GET /{id} ───────────────────────────────────────────────


def test_get_equipo_by_id_returns_404_when_not_found(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = equipos_client.get("/equipos/999999", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


def test_get_equipo_by_id_happy_path(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token).json()

    # ACT
    response = equipos_client.get(f"/equipos/{equipo['id']}", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert response.json()["id"] == equipo["id"]


# ─── Actualización parcial — PATCH /{id} ──────────────────────────────────────


def test_update_equipo_partial_changes_only_sent_fields(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token, nombre="Original", tipo="Soldadora").json()

    # ACT
    response = equipos_client.patch(
        f"/equipos/{equipo['id']}", json={"nombre": "Renombrado"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["nombre"] == "Renombrado"
    assert body["tipo"] == "Soldadora"


def test_update_equipo_requires_admin_role(equipos_client):
    # ARRANGE
    admin_token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, admin_token).json()
    _create_operario(equipos_client, admin_token, "updater@weldix.dev")
    operario_token = _login(equipos_client, "updater@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = equipos_client.patch(
        f"/equipos/{equipo['id']}",
        json={"nombre": "Intento no autorizado"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_update_equipo_returns_404_when_not_found(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = equipos_client.patch(
        "/equipos/999999", json={"nombre": "X"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Cambio de estado — PATCH /{id}/estado ─────────────────────────────────────


def test_update_estado_happy_path(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token).json()

    # ACT
    response = equipos_client.patch(
        f"/equipos/{equipo['id']}/estado",
        json={"estado": "averiado"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "averiado"


def test_update_estado_requires_admin_role(equipos_client):
    # ARRANGE
    admin_token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, admin_token).json()
    _create_operario(equipos_client, admin_token, "estado@weldix.dev")
    operario_token = _login(equipos_client, "estado@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = equipos_client.patch(
        f"/equipos/{equipo['id']}/estado",
        json={"estado": "averiado"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_update_estado_with_invalid_value_returns_400(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token).json()

    # ACT
    response = equipos_client.patch(
        f"/equipos/{equipo['id']}/estado",
        json={"estado": "estado_inexistente"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 400


def test_update_estado_of_nonexistent_equipo_returns_404(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = equipos_client.patch(
        "/equipos/999999/estado", json={"estado": "averiado"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Borrado — DELETE /{id} ────────────────────────────────────────────────────


def test_delete_equipo_removes_it(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token).json()

    # ACT
    delete_response = equipos_client.delete(f"/equipos/{equipo['id']}", headers=_auth_header(token))
    get_response = equipos_client.get(f"/equipos/{equipo['id']}", headers=_auth_header(token))

    # ASSERT
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_delete_equipo_requires_admin_role(equipos_client):
    # ARRANGE
    admin_token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, admin_token).json()
    _create_operario(equipos_client, admin_token, "deleter@weldix.dev")
    operario_token = _login(equipos_client, "deleter@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = equipos_client.delete(
        f"/equipos/{equipo['id']}", headers=_auth_header(operario_token)
    )

    # ASSERT
    assert response.status_code == 403


def test_delete_equipo_returns_404_when_not_found(equipos_client):
    # ARRANGE
    token = _admin_token(equipos_client)

    # ACT
    response = equipos_client.delete("/equipos/999999", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


# ─── Alertas — GET /alertas ────────────────────────────────────────────────────
# Criterio real (backend/features/equipos/service.py::_enriquecer):
# alerta_mantenimiento = dias_desde_mantenimiento is not None
#                         and dias_desde_mantenimiento > intervalo_dias
# Un equipo SIN ultimo_mantenimiento nunca genera alerta, sin importar lo
# vencido que esté en la práctica (dias es None).


def test_alertas_includes_equipo_overdue_maintenance(equipos_client):
    # ARRANGE — último mantenimiento hace 100 días, intervalo de 90
    token = _admin_token(equipos_client)
    hace_100_dias = (date.today() - timedelta(days=100)).isoformat()
    equipo = _create_equipo(
        equipos_client, token, ultimo_mantenimiento=hace_100_dias, intervalo_dias=90
    ).json()

    # ACT
    response = equipos_client.get("/equipos/alertas", headers=_auth_header(token))

    # ASSERT
    ids = [e["id"] for e in response.json()]
    assert equipo["id"] in ids


def test_alertas_excludes_equipo_within_interval(equipos_client):
    # ARRANGE — último mantenimiento hace 10 días, intervalo de 90 (no vencido)
    token = _admin_token(equipos_client)
    hace_10_dias = (date.today() - timedelta(days=10)).isoformat()
    equipo = _create_equipo(
        equipos_client, token, ultimo_mantenimiento=hace_10_dias, intervalo_dias=90
    ).json()

    # ACT
    response = equipos_client.get("/equipos/alertas", headers=_auth_header(token))

    # ASSERT
    ids = [e["id"] for e in response.json()]
    assert equipo["id"] not in ids


def test_alertas_excludes_equipo_without_ultimo_mantenimiento(equipos_client):
    """Sin fecha de último mantenimiento, dias_desde_mantenimiento es None y
    el guard clause de _enriquecer nunca marca alerta — aunque el intervalo
    configurado sea muy corto."""
    # ARRANGE
    token = _admin_token(equipos_client)
    equipo = _create_equipo(equipos_client, token, intervalo_dias=1).json()

    # ACT
    response = equipos_client.get("/equipos/alertas", headers=_auth_header(token))

    # ASSERT
    ids = [e["id"] for e in response.json()]
    assert equipo["id"] not in ids
    assert equipo["dias_desde_mantenimiento"] is None
    assert equipo["alerta_mantenimiento"] is False
