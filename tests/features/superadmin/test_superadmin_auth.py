"""
Tests de autenticación del panel de super-admin.

Mecanismo distinto al resto del backend: header estático `x-superadmin-key`
comparado contra `settings.superadmin_key` (ver `_require_superadmin`,
backend/features/superadmin/router.py). No hay JWT ni tenant — es un panel
de plataforma para el founder, no para un taller.
"""
from backend.core.config import settings


def test_metrics_without_configured_key_returns_503(superadmin_client, monkeypatch):
    # ARRANGE — el panel no está configurado en este entorno
    monkeypatch.setattr(settings, "superadmin_key", None)

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/metrics", headers={"x-superadmin-key": "cualquier-cosa"}
    )

    # ASSERT
    assert response.status_code == 503


def test_workspaces_without_configured_key_returns_503(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", None)

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/workspaces", headers={"x-superadmin-key": "cualquier-cosa"}
    )

    # ASSERT
    assert response.status_code == 503


def test_metrics_with_wrong_key_returns_401(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", "clave-correcta")

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/metrics", headers={"x-superadmin-key": "clave-incorrecta"}
    )

    # ASSERT
    assert response.status_code == 401


def test_metrics_without_header_returns_422(superadmin_client, monkeypatch):
    # ARRANGE — la clave sí está configurada, pero la request no manda el header
    monkeypatch.setattr(settings, "superadmin_key", "clave-correcta")

    # ACT
    response = superadmin_client["client"].get("/superadmin/metrics")

    # ASSERT — FastAPI rechaza por parámetro requerido ausente, antes de la validación de la key
    assert response.status_code == 422


def test_metrics_with_correct_key_returns_200(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", "clave-correcta")

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/metrics", headers={"x-superadmin-key": "clave-correcta"}
    )

    # ASSERT
    assert response.status_code == 200


def test_workspaces_with_correct_key_returns_200(superadmin_client, monkeypatch):
    # ARRANGE
    monkeypatch.setattr(settings, "superadmin_key", "clave-correcta")

    # ACT
    response = superadmin_client["client"].get(
        "/superadmin/workspaces", headers={"x-superadmin-key": "clave-correcta"}
    )

    # ASSERT
    assert response.status_code == 200
