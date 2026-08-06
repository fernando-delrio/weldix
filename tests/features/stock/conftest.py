"""
Fixtures para tests de stock (materiales).

`stock_client`: admin sin tenant (como `jobs_client` del conftest raíz,
creado con `auth_service.create_user`) — sirve para CRUD y reglas de rol sin
ruido de datos demo, porque `create_user` no dispara el seed de demo.

`two_tenants_stock_client`: dos workspaces reales (`create_workspace`) con
auth + stock montados — para aislamiento multi-tenant. Cada tenant nace con
2 materiales demo (is_demo=True, ver backend/features/demo/service.py), así
que los tests de listado comparan pertenencia, no listas exactas (mismo
patrón que tests/features/jobs/test_jobs_isolation.py).
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.core.bootstrap  # noqa: F401 — registra todas las tablas
from backend.core.database import Base, get_db
from backend.features.auth import service as auth_service
from backend.features.auth.router import router as auth_router
from backend.features.stock.router import router as stock_router


def _build_app():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    auth_service._login_state.clear()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(stock_router)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app, engine, testing_session


@pytest.fixture()
def stock_client():
    """Admin sin tenant — CRUD y reglas de rol, sin datos demo."""
    app, engine, testing_session = _build_app()

    db = testing_session()
    try:
        auth_service.create_user(
            db=db,
            email="admin@weldix.dev",
            password="Admin1234!",
            full_name="Admin Test",
            role="admin",
        )
    finally:
        db.close()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def two_tenants_stock_client():
    """
    App con auth + stock y DOS workspaces reales con tenants distintos.
    Devuelve (client, token_a, token_b).
    """
    app, engine, testing_session = _build_app()

    db = testing_session()
    try:
        auth_service.create_workspace(
            db=db,
            nombre_taller="Taller A",
            admin_email="admin@taller-a.dev",
            admin_password="Admin1234!",
            admin_name="Admin Taller A",
        )
        auth_service.create_workspace(
            db=db,
            nombre_taller="Taller B",
            admin_email="admin@taller-b.dev",
            admin_password="Admin1234!",
            admin_name="Admin Taller B",
        )
    finally:
        db.close()

    with TestClient(app) as test_client:
        token_a = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-a.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        token_b = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-b.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        yield test_client, token_a, token_b

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
