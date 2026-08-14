"""
Fixture de dos tenants reales para tests de aislamiento del dashboard del
operario (`GET /dashboard/worker`).

Cada tenant tiene: 1 admin + 2 operarios. El admin puede crear trabajos vía
API y asignarlos directamente a un operario (`operario_id` en el payload),
lo que permite construir escenarios de "trabajo activo" sin depender del
flujo completo de fichaje.

Sigue el mismo patrón que `tests/features/rrhh/conftest.py` (fixture propia,
motor SQLite en memoria aislado, no comparte estado con otros módulos).
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
from backend.features.dashboard.router import router as dashboard_router
from backend.features.jobs.router import router as jobs_router


def _create_workspace_in_db(db, nombre: str, email: str, password: str) -> tuple:
    return auth_service.create_workspace(
        db=db,
        nombre_taller=nombre,
        admin_email=email,
        admin_password=password,
        admin_name=f"Admin {nombre}",
    )


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def dashboard_client():
    """
    App con auth + jobs + dashboard y DOS workspaces reales con tenants
    distintos. Cada taller tiene: 1 admin + 2 operarios.

    Devuelve un dict con:
      client,
      token_admin_a, token_op1_a, token_op2_a, op1_a_id, op2_a_id,
      token_admin_b, token_op1_b, op1_b_id,
      tenant_a, tenant_b, db (sesión para manipular datos directamente).
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
    app.include_router(dashboard_router)

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
        token_admin_a = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-a.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        token_admin_b = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-b.dev", "password": "Admin1234!"},
        ).json()["access_token"]

        op1_a = test_client.post(
            "/auth/admin/signup",
            json={
                "email": "op1-a@taller-a.dev",
                "password": "Operario1234!",
                "full_name": "Operario 1 A",
                "role": "operario",
            },
            headers=_auth_header(token_admin_a),
        ).json()
        op2_a = test_client.post(
            "/auth/admin/signup",
            json={
                "email": "op2-a@taller-a.dev",
                "password": "Operario1234!",
                "full_name": "Operario 2 A",
                "role": "operario",
            },
            headers=_auth_header(token_admin_a),
        ).json()
        op1_b = test_client.post(
            "/auth/admin/signup",
            json={
                "email": "op1-b@taller-b.dev",
                "password": "Operario1234!",
                "full_name": "Operario 1 B",
                "role": "operario",
            },
            headers=_auth_header(token_admin_b),
        ).json()

        token_op1_a = test_client.post(
            "/auth/login",
            json={"email": "op1-a@taller-a.dev", "password": "Operario1234!"},
        ).json()["access_token"]
        token_op2_a = test_client.post(
            "/auth/login",
            json={"email": "op2-a@taller-a.dev", "password": "Operario1234!"},
        ).json()["access_token"]
        token_op1_b = test_client.post(
            "/auth/login",
            json={"email": "op1-b@taller-b.dev", "password": "Operario1234!"},
        ).json()["access_token"]

        db_for_test = TestingSession()
        try:
            yield {
                "client": test_client,
                "token_admin_a": token_admin_a,
                "token_admin_b": token_admin_b,
                "token_op1_a": token_op1_a,
                "token_op2_a": token_op2_a,
                "token_op1_b": token_op1_b,
                "op1_a_id": op1_a["id"],
                "op2_a_id": op2_a["id"],
                "op1_b_id": op1_b["id"],
                "tenant_a_id": tenant_a_id,
                "tenant_b_id": tenant_b_id,
                "db": db_for_test,
            }
        finally:
            db_for_test.close()

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
