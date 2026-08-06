"""
Tests del WebSocket /ws/notificaciones (backend/features/alertas/router.py).

El router abre sus propias sesiones de BD con `SessionLocal` importado
directamente (nunca con la dependencia `get_db`, porque un WebSocket no
puede retener una conexión del pool durante toda su vida — ver docstring
del router). Por eso aquí no basta con `app.dependency_overrides[get_db]`:
hay que parchear el `SessionLocal` que usa el módulo del router para que
apunte al engine de pruebas.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.core.bootstrap  # noqa: F401 — registra todas las tablas
import backend.features.alertas.router as alertas_router_module
from backend.core.database import Base, get_db
from backend.features.alertas.router import router as alertas_router
from backend.features.auth import service as auth_service
from backend.features.auth.router import router as auth_router


@pytest.fixture()
def alertas_ws_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    auth_service._login_state.clear()

    # El router de alertas usa SessionLocal directamente (no la dependencia
    # get_db) — hay que parchear el nombre importado en su propio módulo.
    monkeypatch.setattr(alertas_router_module, "SessionLocal", TestingSession)

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(alertas_router)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSession()
    try:
        auth_service.create_workspace(
            db=db,
            nombre_taller="Taller WS",
            admin_email="admin@taller-ws.dev",
            admin_password="Admin1234!",
            admin_name="Admin WS",
        )
    finally:
        db.close()

    with TestClient(app) as test_client:
        token = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-ws.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        yield test_client, token

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_ws_notificaciones_con_token_valido_envia_snapshot_inicial(alertas_ws_client):
    # ARRANGE
    client, token = alertas_ws_client

    # ACT
    with client.websocket_connect(f"/ws/notificaciones?token={token}") as ws:
        snapshot = ws.receive_json()

    # ASSERT — el snapshot llega con la forma esperada. El taller recién
    # creado ya tiene una alerta de stock bajo por el material demo
    # (seed_workspace_demo_data: "Varilla soldadura 3.2mm (demo)",
    # quantity=20 <= minimum=50), así que no comprobamos lista vacía sino
    # la presencia de esa alerta conocida.
    assert snapshot["type"] == "snapshot"
    tipos = [a["type"] for a in snapshot["alerts"]]
    assert "stock_low" in tipos


def test_ws_notificaciones_con_token_invalido_cierra_con_codigo_4001(alertas_ws_client):
    # ARRANGE
    client, _token = alertas_ws_client

    # ACT & ASSERT — la conexión se cierra inmediatamente con el código 4001
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/ws/notificaciones?token=token-invalido"):
            pass
    assert exc_info.value.code == 4001
