import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Importar el modelo de historial para que create_all genere su tabla.
# Jobs service llama a add_event(), que necesita la tabla job_events.
import backend.features.historial.model  # noqa: F401
from backend.core.database import Base, get_db
from backend.features.auth import service as auth_service
from backend.features.auth.router import router as auth_router
from backend.features.jobs.router import router as jobs_router


def _make_test_app(routers: list) -> tuple:
    """Crea una app FastAPI de prueba con DB SQLite en memoria."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    auth_service._login_state.clear()

    # Crear admin por defecto para todos los tests
    db = TestingSession()
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

    app = FastAPI()
    for router in routers:
        app.include_router(router)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app, engine


@pytest.fixture()
def client():
    """Fixture de auth — solo monta el router de autenticación."""
    app, engine = _make_test_app([auth_router])
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def jobs_client():
    """Fixture de jobs — monta auth + jobs routers."""
    app, engine = _make_test_app([auth_router, jobs_router])
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
