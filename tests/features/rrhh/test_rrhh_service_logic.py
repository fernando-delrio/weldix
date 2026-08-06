"""
Lógica de negocio pura de backend/features/rrhh/service.py, probada
directamente contra la fixture `db` (SQLite en memoria, sin HTTP) siguiendo
el mismo patrón que tests/features/fichaje/test_fichaje_service.py.

Cubre: cálculo de días laborables, saldo de vacaciones por defecto, y las
fórmulas de horas extra/nocturnas/festivas e índices de siniestralidad.
"""
from datetime import date, datetime, timedelta, timezone

from backend.core.security import hash_password
from backend.features.auth.model import Tenant, User
from backend.features.fichaje.model import Fichaje
from backend.features.rrhh import service as rrhh_service
from backend.features.rrhh.model import AccidenteLaboral, Festivo
from backend.features.rrhh.service import _dias_laborables_entre


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


# ─── Días laborables entre fechas ────────────────────────────────────────────


def test_dias_laborables_entre_cuenta_solo_lunes_a_viernes():
    # ARRANGE — un lunes a un domingo (7 días naturales)
    lunes = date(2026, 6, 1)
    domingo = lunes + timedelta(days=6)

    # ACT
    dias = _dias_laborables_entre(lunes, domingo, "LMXJV")

    # ASSERT — de lunes a viernes son 5 días laborables, sábado y domingo no cuentan
    assert dias == 5


def test_dias_laborables_entre_incluye_sabado_si_esta_configurado():
    # ARRANGE
    lunes = date(2026, 6, 1)
    domingo = lunes + timedelta(days=6)

    # ACT
    dias = _dias_laborables_entre(lunes, domingo, "LMXJVS")

    # ASSERT
    assert dias == 6


# ─── Saldo de vacaciones sin configuración explícita ────────────────────────


def test_saldo_vacaciones_sin_config_usa_22_dias_por_defecto(db):
    # ARRANGE
    tenant, operario = _tenant_with_operario(db, "taller-default", "op@default.dev")

    # ACT
    saldo = rrhh_service.get_saldo_vacaciones(db, tenant.id, operario.id, date.today().year)

    # ASSERT
    assert saldo.dias_totales == 22
    assert saldo.dias_disponibles == 22


def test_saldo_vacaciones_resta_dias_aprobados_de_disponibles(db):
    # ARRANGE
    tenant, operario = _tenant_with_operario(db, "taller-saldo", "op@saldo.dev")
    inicio = date.today() + timedelta(days=10)
    fin = inicio + timedelta(days=4)
    from backend.features.rrhh.model import SolicitudAusencia

    dias = _dias_laborables_entre(inicio, fin, "LMXJV")
    db.add(
        SolicitudAusencia(
            tenant_id=tenant.id,
            operario_id=operario.id,
            tipo="vacaciones",
            fecha_inicio=inicio,
            fecha_fin=fin,
            dias_solicitados=dias,
            estado="aprobada",
        )
    )
    db.commit()

    # ACT
    saldo = rrhh_service.get_saldo_vacaciones(db, tenant.id, operario.id, inicio.year)

    # ASSERT
    assert saldo.dias_aprobados == dias
    assert saldo.dias_disponibles == 22 - dias


# ─── Horas extra / ordinarias ────────────────────────────────────────────────


def test_resumen_horas_calcula_extra_por_encima_de_la_jornada(db):
    # ARRANGE — jornada por defecto 8h/día, fichaje de 10h en un único día
    tenant, operario = _tenant_with_operario(db, "taller-extra", "op@extra.dev")
    dia = date(2026, 6, 10)  # miércoles, dentro del mes de prueba
    inicio = datetime(dia.year, dia.month, dia.day, 8, tzinfo=timezone.utc)
    fin = datetime(dia.year, dia.month, dia.day, 18, tzinfo=timezone.utc)
    db.add(Fichaje(tenant_id=tenant.id, operario_id=operario.id, inicio=inicio, fin=fin, horas=10.0))
    db.commit()

    # ACT
    resumen = rrhh_service.get_resumen_horas(db, tenant.id, operario.id, "2026-06")

    # ASSERT
    assert resumen["horas_ordinarias"] == 8.0
    assert resumen["horas_extra"] == 2.0
    assert resumen["horas_total"] == 10.0


def test_resumen_horas_calcula_tramo_nocturno(db):
    # ARRANGE — jornada de 21:00 a 05:00 del día siguiente (8 horas, cruza medianoche)
    tenant, operario = _tenant_with_operario(db, "taller-noct", "op@noct.dev")
    inicio = datetime(2026, 6, 10, 21, tzinfo=timezone.utc)
    fin = datetime(2026, 6, 11, 5, tzinfo=timezone.utc)
    db.add(Fichaje(tenant_id=tenant.id, operario_id=operario.id, inicio=inicio, fin=fin, horas=8.0))
    db.commit()

    # ACT
    resumen = rrhh_service.get_resumen_horas(db, tenant.id, operario.id, "2026-06")

    # ASSERT — nocturno es 22:00-06:00; de 21 a 22 (1h) es diurno, de 22 a 05 (7h) es nocturno
    assert resumen["horas_nocturnas"] == 7.0


def test_resumen_horas_marca_como_festivas_las_de_un_dia_festivo(db):
    # ARRANGE
    tenant, operario = _tenant_with_operario(db, "taller-fest", "op@fest.dev")
    dia_festivo = date(2026, 6, 15)
    db.add(Festivo(fecha=dia_festivo, nombre="Festivo de prueba", year=2026))
    inicio = datetime(dia_festivo.year, dia_festivo.month, dia_festivo.day, 9, tzinfo=timezone.utc)
    fin = datetime(dia_festivo.year, dia_festivo.month, dia_festivo.day, 15, tzinfo=timezone.utc)
    db.add(Fichaje(tenant_id=tenant.id, operario_id=operario.id, inicio=inicio, fin=fin, horas=6.0))
    db.commit()

    # ACT
    resumen = rrhh_service.get_resumen_horas(db, tenant.id, operario.id, "2026-06")

    # ASSERT
    assert resumen["horas_festivas"] == 6.0


# ─── Índices de siniestralidad ───────────────────────────────────────────────


def test_calcular_indices_siniestralidad_aplica_la_formula_correcta(db):
    # ARRANGE — 1 trabajador, 2000 horas trabajadas, 1 accidente con 5 días de baja
    tenant, operario = _tenant_with_operario(db, "taller-sinies", "op@sinies.dev")
    inicio = datetime(2026, 3, 1, 8, tzinfo=timezone.utc)
    db.add(Fichaje(tenant_id=tenant.id, operario_id=operario.id, inicio=inicio, fin=inicio, horas=2000.0))
    db.add(
        AccidenteLaboral(
            tenant_id=tenant.id,
            afectado_id=operario.id,
            fecha_hora=datetime(2026, 3, 10, 10, tzinfo=timezone.utc),
            tipo="accidente",
            descripcion="Corte en el brazo con radial",
            dias_baja=5,
        )
    )
    db.commit()

    # ACT
    indices = rrhh_service.calcular_indices_siniestralidad(db, tenant.id, 2026)

    # ASSERT — IF = (1 x 10^6) / 2000 = 500.0 | IG = (5 x 10^3) / 2000 = 2.5 | II = (1 x 10^3) / 1 = 1000.0
    assert indices["total_accidentes"] == 1
    assert indices["indice_frecuencia"] == 500.0
    assert indices["indice_gravedad"] == 2.5
    assert indices["indice_incidencia"] == 1000.0


def test_calcular_indices_siniestralidad_sin_horas_trabajadas_no_divide_por_cero(db):
    # ARRANGE — accidente registrado pero sin ningún fichaje ese año
    tenant, operario = _tenant_with_operario(db, "taller-sinhoras", "op@sinhoras.dev")
    db.add(
        AccidenteLaboral(
            tenant_id=tenant.id,
            afectado_id=operario.id,
            fecha_hora=datetime(2026, 3, 10, 10, tzinfo=timezone.utc),
            tipo="accidente",
            descripcion="Accidente sin fichajes registrados ese año",
            dias_baja=1,
        )
    )
    db.commit()

    # ACT
    indices = rrhh_service.calcular_indices_siniestralidad(db, tenant.id, 2026)

    # ASSERT — sin horas trabajadas, los índices basados en horas quedan en 0 (no crashean)
    assert indices["indice_frecuencia"] == 0.0
    assert indices["indice_gravedad"] == 0.0
