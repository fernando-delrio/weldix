"""
Tests de `GET /admin/operarios` — listado ligero de operarios para
selectores del panel admin.

Verifica: acceso admin-only, y aislamiento por tenant. Usa `admin_client`
(tests/features/admin/conftest.py).
"""


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_list_operarios_requires_admin_role(admin_client):
    # ARRANGE
    ctx = admin_client

    # ACT — un operario intenta listar operarios
    response = ctx["client"].get(
        "/admin/operarios", headers=_auth_header(ctx["token_op_a"])
    )

    # ASSERT
    assert response.status_code == 403


def test_list_operarios_returns_own_tenant_operario(admin_client):
    # ARRANGE / ACT
    ctx = admin_client
    response = ctx["client"].get(
        "/admin/operarios", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT
    names = [op["full_name"] for op in response.json()]
    assert "Operario A" in names


def test_list_operarios_never_includes_other_tenants_operario(admin_client):
    # ARRANGE / ACT — admin de B lista operarios
    ctx = admin_client
    response = ctx["client"].get(
        "/admin/operarios", headers=_auth_header(ctx["token_admin_b"])
    )

    # ASSERT — no aparece el operario del Taller A
    names = [op["full_name"] for op in response.json()]
    assert "Operario A" not in names


def test_list_operarios_excludes_admin_users(admin_client):
    # ARRANGE / ACT — el propio admin no debe listarse como operario
    ctx = admin_client
    response = ctx["client"].get(
        "/admin/operarios", headers=_auth_header(ctx["token_admin_a"])
    )

    # ASSERT — el tenant tiene 1 admin + 1 operario; la lista solo trae el operario
    names = [op["full_name"] for op in response.json()]
    assert names == ["Operario A"]
