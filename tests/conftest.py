import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Importar modelos para que Base.metadata.create_all los registre.
import backend.features.historial.model  # noqa: F401
import backend.core.bootstrap  # noqa: F401 — registra TODAS las tablas (fixture `db`)
from backend.core.database import Base, get_db
from backend.features.auth import service as auth_service
from backend.features.auth.dependencies import require_active_trial
from backend.features.auth.model import Tenant
from backend.features.auth.router import router as auth_router
from backend.features.billing.router import router as billing_router
from backend.features.fotos.router import router as fotos_router
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


# ─── Fixtures multi-tenant ────────────────────────────────────────────────────


def _create_workspace_in_db(db, nombre: str, email: str, password: str) -> tuple:
    """Crea un Tenant + admin directamente en la BD, sin HTTP ni background tasks."""
    tenant, admin = auth_service.create_workspace(
        db=db,
        nombre_taller=nombre,
        admin_email=email,
        admin_password=password,
        admin_name=f"Admin {nombre}",
    )
    return tenant, admin


@pytest.fixture()
def workspace_client():
    """
    App con auth + jobs + billing y UN workspace real (tenant_id != None).
    Devuelve (client, admin_token, tenant, db_session).

    El db_session permite manipular tenant.trial_expires_at en cada test.
    Útil para: tests de trial, tests de billing, tests de suscripción.
    """
    app, engine = _make_test_app([auth_router, jobs_router, billing_router])
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Endpoint de prueba para validar require_active_trial sin depender de un feature
    @app.get("/test/trial-gate")
    def _trial_gate(user=Depends(require_active_trial)):
        return {"ok": True}

    db = SessionLocal()
    try:
        tenant, _ = _create_workspace_in_db(
            db, "Taller Test", "admin@taller.dev", "Admin1234!"
        )
        tenant_id = tenant.id
    finally:
        db.close()

    with TestClient(app) as test_client:
        login = test_client.post(
            "/auth/login",
            json={"email": "admin@taller.dev", "password": "Admin1234!"},
        )
        admin_token = login.json()["access_token"]

        db_for_test = SessionLocal()
        try:
            tenant_obj = db_for_test.query(Tenant).filter_by(id=tenant_id).first()
            yield test_client, admin_token, tenant_obj, db_for_test
        finally:
            db_for_test.close()

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def two_tenants_client():
    """
    App con auth + jobs y DOS workspaces reales con tenants distintos.
    Devuelve (client, token_a, token_b).

    Útil para: tests de aislamiento multi-tenant.
    """
    app, engine = _make_test_app([auth_router, jobs_router, fotos_router])
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    db = SessionLocal()
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


# ─── Fixture de sesión de BD "pura" (sin HTTP) ────────────────────────────────
# Portada desde backend/tests/conftest.py: para tests de servicio/modelo que no
# pasan por el router (demo, fichaje, kiosko, utilidades de auth como PIN o
# rate-limit). Aislada por test — SQLite en memoria + StaticPool propios, no
# comparte engine con los fixtures de arriba.


@pytest.fixture()
def db():
    """DB SQLite en memoria con TODAS las tablas del proyecto (via bootstrap)."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
