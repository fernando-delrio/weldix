"""
Tests de aislamiento multi-tenant para stock (materiales).

Verifican que el admin del Taller A nunca ve, consume, reabastece, modifica
ni borra un material del Taller B. Usa `two_tenants_stock_client`
(tests/features/stock/conftest.py), que monta auth + stock con dos tenants
reales y devuelve (client, token_a, token_b).

Nota: cada workspace nace con 2 materiales demo propios
(seed_workspace_demo_data, is_demo=True, ver backend/features/demo/service.py)
— por eso los tests de listado comparan pertenencia, no listas exactas.
"""


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_material(client, token: str, **overrides):
    payload = {"name": "Varilla soldadura 3.2mm", "quantity": 10, "minimum": 5, "unit": "kg"}
    payload.update(overrides)
    return client.post("/stock", json=payload, headers=_auth_header(token))


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_stock_never_shows_other_tenants_materials(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    _create_material(client, token_a, name="Material exclusivo de A")
    _create_material(client, token_b, name="Material exclusivo de B")

    # ACT
    response_a = client.get("/stock", headers=_auth_header(token_a))

    # ASSERT — A ve el suyo (+ 2 demo propios), nunca el de B
    names = [m["name"] for m in response_a.json()]
    assert "Material exclusivo de A" in names
    assert "Material exclusivo de B" not in names


# ─── Consumo ───────────────────────────────────────────────────────────────


def test_consume_material_of_other_tenant_returns_404(two_tenants_stock_client):
    """B no puede consumir stock de A — para B, ese material no existe."""
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a).json()

    # ACT — B intenta consumir el material de A
    response = client.post(
        f"/stock/{material_a['id']}/consume",
        json={"consumed": 5},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_consume_attempt_from_other_tenant_does_not_mutate_it(two_tenants_stock_client):
    """Confirma el efecto de lado real: el intento fallido de B no reduce el
    stock de A."""
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a, quantity=10).json()

    # ACT
    client.post(
        f"/stock/{material_a['id']}/consume",
        json={"consumed": 5},
        headers=_auth_header(token_b),
    )
    check = client.get("/stock", headers=_auth_header(token_a))

    # ASSERT — la cantidad de A sigue intacta
    own = next(m for m in check.json() if m["id"] == material_a["id"])
    assert own["quantity"] == 10


# ─── Reabastecimiento ──────────────────────────────────────────────────────


def test_restock_material_of_other_tenant_returns_404(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a).json()

    # ACT — B intenta reabastecer el material de A
    response = client.post(
        f"/stock/{material_a['id']}/restock",
        json={"cantidad": 5},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


# ─── Actualización parcial ─────────────────────────────────────────────────


def test_update_material_of_other_tenant_returns_404(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a, name="Original de A").json()

    # ACT
    response = client.patch(
        f"/stock/{material_a['id']}",
        json={"name": "Hackeado por B"},
        headers=_auth_header(token_b),
    )

    # ASSERT
    assert response.status_code == 404


def test_update_material_of_other_tenant_does_not_mutate_it(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a, name="Original de A").json()

    # ACT
    client.patch(
        f"/stock/{material_a['id']}",
        json={"name": "Hackeado por B"},
        headers=_auth_header(token_b),
    )
    check = client.get("/stock", headers=_auth_header(token_a))

    # ASSERT
    own = next(m for m in check.json() if m["id"] == material_a["id"])
    assert own["name"] == "Original de A"


# ─── Borrado ────────────────────────────────────────────────────────────────


def test_delete_material_of_other_tenant_returns_404(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a).json()

    # ACT
    response = client.delete(f"/stock/{material_a['id']}", headers=_auth_header(token_b))

    # ASSERT
    assert response.status_code == 404


def test_delete_attempt_from_other_tenant_does_not_remove_it(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    material_a = _create_material(client, token_a).json()

    # ACT
    client.delete(f"/stock/{material_a['id']}", headers=_auth_header(token_b))
    check = client.get("/stock", headers=_auth_header(token_a))

    # ASSERT — sigue existiendo en el listado de A
    ids = [m["id"] for m in check.json()]
    assert material_a["id"] in ids


# ─── Generador de variantes ────────────────────────────────────────────────


def test_generar_variantes_of_tenant_a_not_visible_to_tenant_b(two_tenants_stock_client):
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client

    # ACT
    client.post(
        "/stock/generar-variantes",
        json={"category": "tornilleria", "attribute_values": {"metrica": ["M6", "M8"]}},
        headers=_auth_header(token_a),
    )
    response_b = client.get("/stock", headers=_auth_header(token_b))

    # ASSERT — B no ve las variantes generadas por A
    names = [m["name"] for m in response_b.json()]
    assert not any("Tornilleria" in n for n in names)


def test_generar_variantes_does_not_count_other_tenants_existing_names(two_tenants_stock_client):
    """El chequeo de 'ya existe con ese display_name' filtra por tenant — A
    puede generar la misma combinación que B sin que cuente como omitida."""
    # ARRANGE
    client, token_a, token_b = two_tenants_stock_client
    payload = {"category": "tornilleria", "attribute_values": {"metrica": ["M6"]}}
    client.post("/stock/generar-variantes", json=payload, headers=_auth_header(token_a))

    # ACT — B genera la misma combinación de categoría/atributo
    response = client.post(
        "/stock/generar-variantes", json=payload, headers=_auth_header(token_b)
    )

    # ASSERT — no se omite por lo que ya existe en el tenant de A
    body = response.json()
    assert body["creadas"] == 1
    assert body["omitidas"] == 0
