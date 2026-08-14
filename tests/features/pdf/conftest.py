"""
Fixtures para tests de pdf (generación del parte de trabajo en PDF).

`two_tenants_pdf_client`: dos workspaces reales con auth + jobs + pdf montados,
cada uno con su propio admin — para verificar aislamiento por tenant al
generar el PDF de un trabajo (backend/features/pdf/service.py::generate_job_pdf
ya filtra por tenant_id).
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
from backend.features.pdf.router import router as pdf_router


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
    app.include_router(jobs_router)
    app.include_router(pdf_router)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app, engine, testing_session


@pytest.fixture()
def pdf_client():
    """Admin sin tenant — happy path y errores genéricos, sin datos demo."""
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
def two_tenants_pdf_client():
    """
    App con auth + jobs + pdf y DOS workspaces reales con tenants distintos.
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
