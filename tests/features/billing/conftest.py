"""
Fixture extra para tests de aislamiento multi-tenant de billing.

`two_tenants_client` (tests/conftest.py) no monta el billing_router — solo
auth + jobs + fotos. Los tests de aislamiento de billing necesitan DOS
tenants reales con el billing_router montado, así que se define aquí una
variante local siguiendo el mismo patrón que `two_tenants_client` y
`workspace_client` del conftest raíz.
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
from backend.features.auth.model import Tenant
from backend.features.auth.router import router as auth_router
from backend.features.billing.router import router as billing_router


def _create_workspace_in_db(db, nombre: str, email: str, password: str) -> tuple:
    return auth_service.create_workspace(
        db=db,
        nombre_taller=nombre,
        admin_email=email,
        admin_password=password,
        admin_name=f"Admin {nombre}",
    )


@pytest.fixture()
def two_tenants_billing_client():
    """
    App con auth + billing y DOS workspaces reales con tenants distintos.
    Devuelve (client, token_a, token_b, tenant_a, tenant_b, db_session).

    Útil para: tests de aislamiento de billing entre talleres.
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
    app.include_router(billing_router)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSession()
    try:
        tenant_a, _ = _create_workspace_in_db(
            db, "Taller A", "admin@taller-a.dev", "Admin1234!"
        )
        tenant_b, _ = _create_workspace_in_db(
            db, "Taller B", "admin@taller-b.dev", "Admin1234!"
        )
        tenant_a_id, tenant_b_id = tenant_a.id, tenant_b.id
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

        db_for_test = TestingSession()
        try:
            tenant_a_obj = db_for_test.query(Tenant).filter_by(id=tenant_a_id).first()
            tenant_b_obj = db_for_test.query(Tenant).filter_by(id=tenant_b_id).first()
            yield test_client, token_a, token_b, tenant_a_obj, tenant_b_obj, db_for_test
        finally:
            db_for_test.close()

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
