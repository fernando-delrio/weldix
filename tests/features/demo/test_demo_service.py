"""
Tests del acceso de invitado a la demo (start_demo_session).

Migrado desde backend/tests/test_demo_service.py — usa la fixture `db`
(SQLite en memoria, sin HTTP) portada a tests/conftest.py (raíz).
Contenido sin cambios respecto al original: la lógica de negocio (creación de
tenant demo, idempotencia, seed de datos de ejemplo) sigue siendo la misma.
"""
from backend.features.auth import service as auth_service
from backend.features.auth.model import Tenant, User


def _demo_tenant(db):
    return db.query(Tenant).filter(Tenant.slug == "demo").first()


def test_start_demo_creates_tenant_with_jefe_and_operario(db):
    data = auth_service.start_demo_session(db, role="admin")
    assert data["role"] == "admin"
    assert data["access_token"]

    tenant = _demo_tenant(db)
    assert tenant is not None
    roles = {u.role for u in db.query(User).filter(User.tenant_id == tenant.id).all()}
    assert roles == {"admin", "operario"}


def test_start_demo_operario_returns_operario_token(db):
    data = auth_service.start_demo_session(db, role="operario")
    assert data["role"] == "operario"
    assert data["email"] == "demo-operario@weldix.app"


def test_start_demo_is_idempotent(db):
    auth_service.start_demo_session(db, role="admin")
    auth_service.start_demo_session(db, role="operario")

    # Un solo taller demo y exactamente dos usuarios (no se duplican).
    assert db.query(Tenant).filter(Tenant.slug == "demo").count() == 1
    tenant = _demo_tenant(db)
    assert db.query(User).filter(User.tenant_id == tenant.id).count() == 2


def test_start_demo_seeds_example_data(db):
    from backend.features.jobs.model import Job

    auth_service.start_demo_session(db, role="admin")
    tenant = _demo_tenant(db)
    # se siembran trabajos de ejemplo marcados como demo
    jobs = db.query(Job).filter(Job.tenant_id == tenant.id, Job.is_demo.is_(True)).all()
    assert len(jobs) > 0
