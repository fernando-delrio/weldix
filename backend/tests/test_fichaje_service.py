"""Tests de fichaje: jornada, aislamiento multi-tenant (IDOR) y días laborables."""
from datetime import date, datetime, timedelta, timezone

from backend.core.security import hash_password
from backend.features.auth.model import Tenant, User
from backend.features.fichaje import service as fichaje_service
from backend.features.fichaje.model import Fichaje
from backend.features.fichaje.service import _dias_laborables_en_rango


def _tenant_with_operario(db, slug, email):
    tenant = Tenant(nombre=slug, slug=slug, plan="trial")
    db.add(tenant)
    db.flush()
    user = User(
        tenant_id=tenant.id,
        email=email,
        role="operario",
        full_name="Operario",
        password_hash=hash_password("x"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tenant)
    return tenant, user


def test_iniciar_y_finalizar_jornada_calcula_horas(db):
    _, op = _tenant_with_operario(db, "t1", "op1@t.com")
    abierta = fichaje_service.iniciar_jornada(db, op.id, tenant_id=None)
    assert abierta.fin is None

    cerrada = fichaje_service.finalizar_jornada(db, abierta.id, op.id)
    assert cerrada.fin is not None
    assert cerrada.horas is not None and cerrada.horas >= 0


def test_get_fichajes_operario_scopes_by_tenant(db):
    # IDOR: un fichaje del mismo operario_id existe en dos talleres.
    ta, opa = _tenant_with_operario(db, "taller-a", "a@a.com")
    tb, _ = _tenant_with_operario(db, "taller-b", "b@b.com")
    ahora = datetime.now(timezone.utc)
    db.add(Fichaje(tenant_id=ta.id, operario_id=opa.id, inicio=ahora, fin=ahora, horas=8.0))
    db.add(Fichaje(tenant_id=tb.id, operario_id=opa.id, inicio=ahora, fin=ahora, horas=8.0))
    db.commit()

    solo_a = fichaje_service.get_fichajes_operario(db, opa.id, tenant_id=ta.id)
    assert len(solo_a) == 1
    assert solo_a[0].tenant_id == ta.id


def test_dias_laborables_cuenta_y_excluye():
    inicio = date(2026, 6, 1)
    fin = inicio + timedelta(days=6)  # 7 días consecutivos
    # patrón con todos los días → cuenta los 7
    assert _dias_laborables_en_rango(inicio, fin, "LMXJVSD", set(), set()) == 7
    # un festivo resta uno
    assert _dias_laborables_en_rango(inicio, fin, "LMXJVSD", {inicio}, set()) == 6
    # una ausencia resta uno
    assert _dias_laborables_en_rango(inicio, fin, "LMXJVSD", set(), {inicio}) == 6
    # patrón vacío → ningún día laborable
    assert _dias_laborables_en_rango(inicio, fin, "", set(), set()) == 0


def test_balance_horas_devuelve_saldo_por_operario(db):
    tenant, op = _tenant_with_operario(db, "t-bal", "bal@t.com")
    # Un domingo pasado: con la config por defecto (LMXJV) no es laborable → esperadas = 0.
    domingo = date.today()
    while domingo.weekday() != 6:
        domingo -= timedelta(days=1)
    inicio = datetime(domingo.year, domingo.month, domingo.day, 8, tzinfo=timezone.utc)
    db.add(
        Fichaje(tenant_id=tenant.id, operario_id=op.id, inicio=inicio, fin=inicio, horas=6.0)
    )
    db.commit()

    balance = fichaje_service.get_balance_horas(db, tenant_id=tenant.id, desde=domingo, hasta=domingo)
    fila = next(f for f in balance if f["operario_id"] == op.id)
    assert fila["horas_esperadas"] == 0
    assert fila["horas_fichadas"] == 6.0
    assert fila["saldo"] == 6.0
