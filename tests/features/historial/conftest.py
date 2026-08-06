"""
Fixture extra para tests de historial: dos tenants reales (Taller A y Taller
B) con auth + jobs + historial montados.

`two_tenants_client` (tests/conftest.py raíz) no monta el historial_router
— solo auth + jobs (+ fotos). Se define aquí una variante local siguiendo el
mismo patrón que `two_tenants_billing_client` (tests/features/billing/conftest.py)
y `rrhh_client` (tests/features/rrhh/conftest.py).
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
from backend.features.historial.router import router as historial_router
from backend.features.jobs.router import router as jobs_router


def _create_workspace_in_db(db, nombre: str, email: str, password: str) -> tuple:
    return auth_service.create_workspace(
        db=db,
        nombre_taller=nombre,
        admin_email=email,
        admin_password=password,
        admin_name=f"Admin {nombre}",
    )


@pytest.fixture()
def two_tenants_historial_client():
    """
    App con auth + jobs + historial y DOS workspaces reales con tenants
    distintos. Devuelve (client, token_a, token_b).
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    auth_service._login_state.clear()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(jobs_router)
    app.include_router(historial_router)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSession()
    try:
        _create_workspace_in_db(db, "Taller A", "admin@taller-a.dev", "Admin1234!")
        _create_workspace_in_db(db, "Taller B", "admin@taller-b.dev", "Admin1234!")
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
