"""
Fixture para tests del panel de super-admin (`GET /superadmin/metrics`,
`GET /superadmin/workspaces`).

A diferencia del resto de features, este panel NO usa JWT — usa un header
estático `x-superadmin-key` comparado contra `settings.superadmin_key`
(ver `_require_superadmin` en `backend/features/superadmin/router.py`).
Por eso la fixture no genera tokens; solo levanta la app con dos workspaces
reales para poder verificar que el panel agrega datos de TODOS los tenants
(comportamiento intencional — no es un test de aislamiento).
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
from backend.features.superadmin.router import router as superadmin_router


def _create_workspace_in_db(db, nombre: str, email: str, password: str) -> tuple:
    return auth_service.create_workspace(
        db=db,
        nombre_taller=nombre,
        admin_email=email,
        admin_password=password,
        admin_name=f"Admin {nombre}",
    )


@pytest.fixture()
def superadmin_client():
    """
    App con solo el router de superadmin y DOS workspaces reales ya creados.

    Devuelve un dict con: client, tenant_a, tenant_b, db.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    app = FastAPI()
    app.include_router(superadmin_router)

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
        db_for_test = TestingSession()
        try:
            tenant_a_obj = db_for_test.query(Tenant).filter_by(id=tenant_a_id).first()
            tenant_b_obj = db_for_test.query(Tenant).filter_by(id=tenant_b_id).first()
            yield {
                "client": test_client,
                "tenant_a": tenant_a_obj,
                "tenant_b": tenant_b_obj,
                "db": db_for_test,
            }
        finally:
            db_for_test.close()

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
