"""
Fixtures para tests de ia (chat con contexto del taller + chat público del landing).

`ia_client`: admin sin tenant (como stock_client) — para guard clauses y errores,
sin ruido de datos demo.

`two_tenants_ia_client`: dos workspaces reales con auth + jobs + stock + ia
montados — para verificar que el contexto que se construye para la IA está
siempre filtrado por el tenant del usuario que pregunta.
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
from backend.features.ia.router import public_router as ia_public_router
from backend.features.ia.router import router as ia_router
from backend.features.jobs.router import router as jobs_router
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
    app.include_router(jobs_router)
    app.include_router(stock_router)
    app.include_router(ia_router)
    app.include_router(ia_public_router)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app, engine, testing_session


@pytest.fixture()
def ia_client():
    """Admin sin tenant — para guard clauses y manejo de errores, sin datos demo."""
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
def two_tenants_ia_client():
    """
    App con auth + jobs + stock + ia y DOS workspaces reales con tenants distintos.
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
