"""
Lógica de negocio pura de backend/features/registro_horas/service.py, probada
directamente contra la fixture `db` (SQLite en memoria, sin HTTP) siguiendo
el mismo patrón que tests/features/fichaje/test_fichaje_service.py.
"""
from datetime import datetime, timezone

import pytest

from backend.core.security import hash_password
from backend.features.auth.model import Tenant, User
from backend.features.fichaje.model import Fichaje
from backend.features.jobs.model import Job
from backend.features.registro_horas import service as registro_service
from backend.features.registro_horas.model import RegistroHoras


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


def _job(db, tenant_id, titulo="OT de prueba"):
    job = Job(tenant_id=tenant_id, titulo=titulo, cliente="Cliente Test")
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _jornada_abierta(db, tenant_id, operario_id):
    fichaje = Fichaje(tenant_id=tenant_id, operario_id=operario_id, inicio=datetime.now(timezone.utc))
    db.add(fichaje)
    db.commit()
    return fichaje


# ─── iniciar_registro — reglas de negocio ────────────────────────────────────


def test_iniciar_registro_requiere_jornada_laboral_activa(db):
    # ARRANGE — operario sin fichaje abierto
    tenant, op = _tenant_with_operario(db, "t1", "op1@t.com")
    job = _job(db, tenant.id)

    # ACT & ASSERT
    with pytest.raises(ValueError, match="jornada laboral"):
        registro_service.iniciar_registro(db, job.id, op.id)


def test_iniciar_registro_con_jornada_activa_crea_registro_abierto(db):
    # ARRANGE
    tenant, op = _tenant_with_operario(db, "t2", "op2@t.com")
    job = _job(db, tenant.id)
    _jornada_abierta(db, tenant.id, op.id)

    # ACT
    registro = registro_service.iniciar_registro(db, job.id, op.id)

    # ASSERT
    assert registro.fin is None
    assert registro.job_id == job.id
    assert registro.operario_id == op.id


def test_iniciar_registro_falla_si_ya_hay_uno_abierto(db):
    # ARRANGE
    tenant, op = _tenant_with_operario(db, "t3", "op3@t.com")
    job = _job(db, tenant.id)
    _jornada_abierta(db, tenant.id, op.id)
    registro_service.iniciar_registro(db, job.id, op.id)

    # ACT & ASSERT
    with pytest.raises(ValueError, match="Ya tienes un registro abierto"):
        registro_service.iniciar_registro(db, job.id, op.id)


# ─── finalizar_registro ──────────────────────────────────────────────────────


def test_finalizar_registro_calcula_horas(db):
    # ARRANGE
    tenant, op = _tenant_with_operario(db, "t4", "op4@t.com")
    job = _job(db, tenant.id)
    _jornada_abierta(db, tenant.id, op.id)
    registro = registro_service.iniciar_registro(db, job.id, op.id)

    # ACT
    cerrado = registro_service.finalizar_registro(db, registro.id, op.id)

    # ASSERT
    assert cerrado.fin is not None
    assert cerrado.horas is not None and cerrado.horas >= 0


def test_finalizar_registro_de_otro_operario_lanza_permission_error(db):
    # ARRANGE — dos operarios del mismo taller, cada uno con su registro
    tenant, op1 = _tenant_with_operario(db, "t5", "op5@t.com")
    _, op2 = _tenant_with_operario(db, "t5b", "op5b@t.com")
    job = _job(db, tenant.id)
    _jornada_abierta(db, tenant.id, op1.id)
    registro = registro_service.iniciar_registro(db, job.id, op1.id)

    # ACT & ASSERT
    with pytest.raises(PermissionError, match="No puedes cerrar"):
        registro_service.finalizar_registro(db, registro.id, op2.id)


def test_finalizar_registro_ya_cerrado_lanza_value_error(db):
    # ARRANGE
    tenant, op = _tenant_with_operario(db, "t6", "op6@t.com")
    job = _job(db, tenant.id)
    _jornada_abierta(db, tenant.id, op.id)
    registro = registro_service.iniciar_registro(db, job.id, op.id)
    registro_service.finalizar_registro(db, registro.id, op.id)

    # ACT & ASSERT
    with pytest.raises(ValueError, match="ya está cerrado"):
        registro_service.finalizar_registro(db, registro.id, op.id)


def test_finalizar_registro_inexistente_lanza_value_error(db):
    # ARRANGE
    tenant, op = _tenant_with_operario(db, "t7", "op7@t.com")

    # ACT & ASSERT
    with pytest.raises(ValueError, match="no encontrado"):
        registro_service.finalizar_registro(db, 9999, op.id)


# ─── get_resumen_horas_ot — agregación ───────────────────────────────────────


def test_resumen_horas_ot_suma_por_operario_y_total(db):
    # ARRANGE — dos operarios distintos con registros cerrados en la misma OT
    tenant, op1 = _tenant_with_operario(db, "t8", "op8@t.com")
    _, op2 = _tenant_with_operario(db, "t8b", "op8b@t.com")
    job = _job(db, tenant.id)
    ahora = datetime.now(timezone.utc)
    db.add(RegistroHoras(job_id=job.id, operario_id=op1.id, inicio=ahora, fin=ahora, horas=3.0))
    db.add(RegistroHoras(job_id=job.id, operario_id=op2.id, inicio=ahora, fin=ahora, horas=2.5))
    db.commit()

    # ACT
    resumen = registro_service.get_resumen_horas_ot(db, job.id)

    # ASSERT
    assert resumen["total_horas"] == 5.5
    por_operario = {r["operario_id"]: r["total_horas"] for r in resumen["por_operario"]}
    assert por_operario[op1.id] == 3.0
    assert por_operario[op2.id] == 2.5


def test_resumen_horas_ot_ignora_registros_abiertos(db):
    # ARRANGE — un registro cerrado y uno todavía abierto (sin horas calculadas)
    tenant, op = _tenant_with_operario(db, "t9", "op9@t.com")
    job = _job(db, tenant.id)
    ahora = datetime.now(timezone.utc)
    db.add(RegistroHoras(job_id=job.id, operario_id=op.id, inicio=ahora, fin=ahora, horas=4.0))
    db.add(RegistroHoras(job_id=job.id, operario_id=op.id, inicio=ahora, fin=None, horas=None))
    db.commit()

    # ACT
    resumen = registro_service.get_resumen_horas_ot(db, job.id)

    # ASSERT — solo cuenta el registro cerrado
    assert resumen["total_horas"] == 4.0
    assert resumen["por_operario"][0]["num_sesiones"] == 1
