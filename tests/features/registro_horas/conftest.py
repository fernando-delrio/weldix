"""
Fixture para tests de registro_horas: dos tenants reales (Taller A y Taller
B), cada uno con un admin + un operario, y auth + jobs + fichaje +
registro_horas montados.

Sigue el mismo patrón que `rrhh_client` (tests/features/rrhh/conftest.py):
`two_tenants_client` (tests/conftest.py raíz) no monta fichaje ni
registro_horas y no crea operarios, así que se define una variante local.
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
from backend.features.fichaje.router import router as fichaje_router
from backend.features.jobs.router import router as jobs_router
from backend.features.registro_horas.router import router as registro_horas_router


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
def registro_horas_client():
    """
    App con auth + jobs + fichaje + registro_horas y DOS workspaces reales.
    Cada taller tiene: 1 admin + 1 operario, y el admin ya creó una OT propia.

    Devuelve un dict con:
      client,
      token_admin_a, token_op_a, op_a_id, job_a_id,
      token_admin_b, token_op_b, op_b_id, job_b_id.
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
    app.include_router(fichaje_router)
    app.include_router(registro_horas_router)

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
        token_admin_a = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-a.dev", "password": "Admin1234!"},
        ).json()["access_token"]
        token_admin_b = test_client.post(
            "/auth/login",
            json={"email": "admin@taller-b.dev", "password": "Admin1234!"},
        ).json()["access_token"]

        op_a = test_client.post(
            "/auth/admin/signup",
            json={
                "email": "op-a@taller-a.dev",
                "password": "Operario1234!",
                "full_name": "Operario A",
                "role": "operario",
            },
            headers=_auth_header(token_admin_a),
        ).json()
        op_b = test_client.post(
            "/auth/admin/signup",
            json={
                "email": "op-b@taller-b.dev",
                "password": "Operario1234!",
                "full_name": "Operario B",
                "role": "operario",
            },
            headers=_auth_header(token_admin_b),
        ).json()

        token_op_a = test_client.post(
            "/auth/login",
            json={"email": "op-a@taller-a.dev", "password": "Operario1234!"},
        ).json()["access_token"]
        token_op_b = test_client.post(
            "/auth/login",
            json={"email": "op-b@taller-b.dev", "password": "Operario1234!"},
        ).json()["access_token"]

        job_a = test_client.post(
            "/trabajos",
            json={"titulo": "OT del Taller A", "cliente": "Cliente A"},
            headers=_auth_header(token_admin_a),
        ).json()
        job_b = test_client.post(
            "/trabajos",
            json={"titulo": "OT del Taller B", "cliente": "Cliente B"},
            headers=_auth_header(token_admin_b),
        ).json()

        yield {
            "client": test_client,
            "token_admin_a": token_admin_a,
            "token_admin_b": token_admin_b,
            "token_op_a": token_op_a,
            "token_op_b": token_op_b,
            "op_a_id": op_a["id"],
            "op_b_id": op_b["id"],
            "job_a_id": job_a["id"],
            "job_b_id": job_b["id"],
        }

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
