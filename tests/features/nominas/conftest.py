"""
Fixtures para tests de nominas (subida, listado, descarga, análisis IA y borrado
de nóminas en PDF).

`nominas_client`: admin sin tenant — CRUD y reglas de rol, sin datos demo.

`two_tenants_nominas_client`: dos workspaces reales con tenants distintos, cada
uno con su propio admin y un operario — para aislamiento multi-tenant.

`_redirect_media_dir` (autouse): `MEDIA_DIR` en backend/features/nominas/service.py
es una constante de módulo calculada al importar
(`Path(settings.media_base_dir) / "nominas"`), así que parchear
`settings.media_base_dir` después de importar no tendría efecto — hay que
monkeypatchear el propio atributo del módulo `service.MEDIA_DIR` (mismo patrón
que tests/features/fotos/conftest.py) para no ensuciar backend/media.

`sample_pdf_bytes`: un PDF real y mínimo generado con fpdf2 (misma librería que
usa backend/features/pdf), con texto extraíble por pypdf.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fpdf import FPDF
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.core.bootstrap  # noqa: F401 — registra todas las tablas
import backend.features.nominas.service as nominas_service
from backend.core.database import Base, get_db
from backend.features.auth import service as auth_service
from backend.features.auth.router import router as auth_router
from backend.features.nominas.router import router as nominas_router


@pytest.fixture(autouse=True)
def _redirect_media_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(nominas_service, "MEDIA_DIR", tmp_path / "nominas")


@pytest.fixture()
def sample_pdf_bytes() -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 10, "NOMINA DE PRUEBA - Total devengado 2000.00 - Liquido a percibir 1650.50")
    return bytes(pdf.output())


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
    app.include_router(nominas_router)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return app, engine, testing_session


@pytest.fixture()
def nominas_client():
    """Admin sin tenant — CRUD y reglas de rol, sin datos demo."""
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
def two_tenants_nominas_client():
    """
    App con auth + nominas y DOS workspaces reales con tenants distintos.
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
