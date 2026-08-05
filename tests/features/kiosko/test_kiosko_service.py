"""
Tests del Modo Kiosko: fichaje por PIN y aislamiento de PIN entre talleres.

Migrado desde backend/tests/test_kiosko_service.py — usa la fixture `db`
(SQLite en memoria, sin HTTP) portada a tests/conftest.py (raíz).

IMPORTANTE: test_pin_no_se_cruza_entre_talleres es cobertura de seguridad
(aislamiento de PIN entre tenants) y se migra SIN simplificar: un PIN válido
en el Taller A no debe resolverse contra el token de kiosko del Taller B.
"""
import pytest

from backend.core.security import hash_password
from backend.features.auth.model import Tenant, User
from backend.features.kiosko import service as kiosko_service


def _tenant_with_pin_user(db, slug, email, pin):
    tenant = Tenant(nombre=slug, slug=slug, plan="trial", kiosk_token=f"tok-{slug}")
    db.add(tenant)
    db.flush()
    user = User(
        tenant_id=tenant.id,
        email=email,
        role="operario",
        full_name="Operario",
        password_hash=hash_password("x"),
        pin=pin,
    )
    db.add(user)
    db.commit()
    db.refresh(tenant)
    return tenant, user


def test_fichar_por_pin_toggle_entrada_salida(db):
    tenant, _ = _tenant_with_pin_user(db, "t-a", "op@a.com", "1234")
    entrada = kiosko_service.fichar_por_pin(db, tenant.kiosk_token, "1234")
    assert entrada["accion"] == "entrada"
    salida = kiosko_service.fichar_por_pin(db, tenant.kiosk_token, "1234")
    assert salida["accion"] == "salida"


def test_fichar_por_pin_invalido_lanza_error(db):
    tenant, _ = _tenant_with_pin_user(db, "t-b", "op@b.com", "1234")
    with pytest.raises(ValueError):
        kiosko_service.fichar_por_pin(db, tenant.kiosk_token, "9999")


def test_pin_no_se_cruza_entre_talleres(db):
    # Taller A tiene el PIN 1234. Taller B NO. Con el token de B, ese PIN no existe.
    _tenant_with_pin_user(db, "ta", "a@x.com", "1234")
    tenant_b, _ = _tenant_with_pin_user(db, "tb", "b@x.com", "5678")
    with pytest.raises(ValueError):
        kiosko_service.fichar_por_pin(db, tenant_b.kiosk_token, "1234")


def test_kiosko_token_invalido_lanza_error(db):
    with pytest.raises(ValueError):
        kiosko_service.fichar_por_pin(db, "token-que-no-existe", "1234")
