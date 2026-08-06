"""
Fixture para tests del endpoint público de seguimiento (sin auth).

Monta auth + jobs + seguimiento en una app de prueba con UN workspace real.
Necesita el jobs_router porque el token público se genera vía
`POST /trabajos/{id}/compartir` (backend/features/jobs/router.py).
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
from backend.features.jobs.router import router as jobs_router
from backend.features.seguimiento.router import router as seguimiento_router


@pytest.fixture()
def seguimiento_client():
    """
    App con auth + jobs + seguimiento y UN workspace real.
    Devuelve (client, admin_token).
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
    app.include_router(seguimiento_router)

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
            nombre_taller="Taller Test",
            admin_email="admin@taller.dev",
            admin_password="Admin1234!",
            admin_name="Admin Test",
        )
    finally:
        db.close()

    with TestClient(app) as test_client:
        admin_token = test_client.post(
            "/auth/login",
            json={"email": "admin@taller.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        yield test_client, admin_token

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
