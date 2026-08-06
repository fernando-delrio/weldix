"""
Tests de los datos agregados del panel de super-admin.

A propósito, `/superadmin/metrics` y `/superadmin/workspaces` NO filtran
por tenant — es un panel de plataforma que debe ver TODOS los talleres.
Estos tests verifican justamente eso: que con la key correcta, los datos
de ambos tenants (A y B) aparecen agregados en la respuesta.
"""
from backend.core.config import settings

_KEY = "clave-correcta-test"


def _headers() -> dict:
    return {"x-superadmin-key": _KEY}


def test_metrics_counts_all_tenants_workspaces(superadmin_client, monkeypatch):
    # ARRANGE — dos workspaces ya creados por la fixture (A y B)
    monkeypatch.setattr(settings, "superadmin_key", _KEY)

    # ACT
    response = superadmin_client["client"].get("/superadmin/metrics", headers=_headers())

    # ASSERT
    assert response.json()["total_workspaces"] == 2


def test_metrics_counts_users_from_all_tenants(superadmin_client, monkeypatch):
    # ARRANGE — cada workspace crea 1 admin al registrarse (2 tenants → 2 users)
    monkeypatch.setattr(settings, "superadmin_key", _KEY)

    # ACT
    response = superadmin_client["client"].get("/superadmin/metrics", headers=_headers())

    # ASSERT
    assert response.json()["total_users"] == 2


def test_workspaces_list_includes_tenant_from_taller_a(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", _KEY)

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/workspaces", headers=_headers()
    )

    # ASSERT — el panel ve el workspace del Taller A, aunque la key no pertenezca a ningún tenant
    nombres = [w["nombre"] for w in response.json()]
    assert "Taller A" in nombres


def test_workspaces_list_includes_tenant_from_taller_b(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", _KEY)

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/workspaces", headers=_headers()
    )

    # ASSERT — comportamiento intencional: el panel no aísla por tenant
    nombres = [w["nombre"] for w in response.json()]
    assert "Taller B" in nombres


def test_workspaces_list_reports_trial_status_for_new_workspace(superadmin_client, monkeypatch):
    # ARRANGE — un workspace recién creado está en periodo de prueba (15 días)
    monkeypatch.setattr(settings, "superadmin_key", _KEY)

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/workspaces", headers=_headers()
    )

    # ASSERT
    taller_a = next(w for w in response.json() if w["nombre"] == "Taller A")
    assert taller_a["status"] == "trial"
