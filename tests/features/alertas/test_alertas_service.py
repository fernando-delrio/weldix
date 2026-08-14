"""
Tests de backend/features/alertas/service.py — get_current_alerts(db, tenant_id).

Función pura: recibe una sesión de BD y un tenant_id, y calcula el snapshot
de alertas activas del taller. Se testea directamente contra la fixture `db`
(SQLite en memoria, sin HTTP), igual que fichaje/rrhh service logic.

Tres fuentes de alerta (ver service.py):
  1. OTs en 'en_proceso' con fecha_inicio > 48h.
  2. Materiales de stock con quantity <= minimum (minimum > 0).
  3. Equipos operativos con mantenimiento vencido.
"""
from datetime import date, timedelta

from backend.features.alertas.service import get_current_alerts
from backend.features.auth.model import Tenant
from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.stock.model import Material


def _tenant(db, slug: str) -> Tenant:
    tenant = Tenant(nombre=slug, slug=slug, plan="trial")
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


# ─── Fuente 1 — OTs bloqueadas en 'en_proceso' ───────────────────────────────


def test_alerta_job_stale_cuando_lleva_mas_de_48h_en_proceso(db):
    # ARRANGE
    tenant = _tenant(db, "t-job-stale")
    db.add(
        Job(
            tenant_id=tenant.id,
            titulo="Estructura atascada",
            cliente="Cliente X",
            estado="en_proceso",
            fecha_inicio=date.today() - timedelta(days=3),
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    tipos = [a["type"] for a in alerts]
    assert "job_stale" in tipos


def test_sin_alerta_job_stale_cuando_lleva_menos_de_48h(db):
    # ARRANGE — trabajo recién iniciado, dentro del margen
    tenant = _tenant(db, "t-job-fresh")
    db.add(
        Job(
            tenant_id=tenant.id,
            titulo="Estructura reciente",
            cliente="Cliente X",
            estado="en_proceso",
            fecha_inicio=date.today(),
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


def test_sin_alerta_job_stale_si_el_trabajo_ya_no_esta_en_proceso(db):
    # ARRANGE — mismo trabajo antiguo pero ya en 'listo': no debe alertar
    tenant = _tenant(db, "t-job-done")
    db.add(
        Job(
            tenant_id=tenant.id,
            titulo="Estructura terminada",
            cliente="Cliente X",
            estado="listo",
            fecha_inicio=date.today() - timedelta(days=10),
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


# ─── Fuente 2 — stock bajo mínimo ────────────────────────────────────────────


def test_alerta_stock_low_cuando_cantidad_es_menor_o_igual_al_minimo(db):
    # ARRANGE
    tenant = _tenant(db, "t-stock-low")
    db.add(Material(tenant_id=tenant.id, name="Varilla 3.2mm", quantity=5, minimum=10, unit="ud"))
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    tipos = [a["type"] for a in alerts]
    assert "stock_low" in tipos


def test_sin_alerta_stock_low_cuando_cantidad_supera_el_minimo(db):
    # ARRANGE
    tenant = _tenant(db, "t-stock-ok")
    db.add(Material(tenant_id=tenant.id, name="Chapa 3mm", quantity=50, minimum=10, unit="kg"))
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


def test_sin_alerta_stock_low_cuando_minimo_es_cero(db):
    """Un material sin mínimo configurado (0) no debe generar ruido."""
    # ARRANGE
    tenant = _tenant(db, "t-stock-no-min")
    db.add(Material(tenant_id=tenant.id, name="Consumible libre", quantity=0, minimum=0, unit="ud"))
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


# ─── Fuente 3 — mantenimiento de equipos vencido ─────────────────────────────


def test_alerta_equipo_mantenimiento_cuando_vence_el_intervalo(db):
    # ARRANGE
    tenant = _tenant(db, "t-equipo-vencido")
    db.add(
        Equipo(
            tenant_id=tenant.id,
            nombre="Soldadora MIG",
            estado="operativo",
            ultimo_mantenimiento=date.today() - timedelta(days=100),
            intervalo_dias=90,
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    tipos = [a["type"] for a in alerts]
    assert "equipo_mantenimiento" in tipos


def test_sin_alerta_equipo_mantenimiento_dentro_del_intervalo(db):
    # ARRANGE
    tenant = _tenant(db, "t-equipo-ok")
    db.add(
        Equipo(
            tenant_id=tenant.id,
            nombre="Soldadora TIG",
            estado="operativo",
            ultimo_mantenimiento=date.today() - timedelta(days=10),
            intervalo_dias=90,
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


def test_sin_alerta_equipo_mantenimiento_si_no_esta_operativo(db):
    """Un equipo averiado/retirado ya tiene su propio estado — no duplicamos aviso."""
    # ARRANGE
    tenant = _tenant(db, "t-equipo-averiado")
    db.add(
        Equipo(
            tenant_id=tenant.id,
            nombre="Grúa averiada",
            estado="averiado",
            ultimo_mantenimiento=date.today() - timedelta(days=200),
            intervalo_dias=90,
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    assert alerts == []


def test_alerta_equipo_mantenimiento_escala_a_error_muy_pasado_el_plazo(db):
    """Nivel 'error' cuando el retraso supera 1.5x el intervalo; 'warning' si no."""
    # ARRANGE — 200 días de retraso sobre un intervalo de 90 (>135 → error)
    tenant = _tenant(db, "t-equipo-critico")
    db.add(
        Equipo(
            tenant_id=tenant.id,
            nombre="Cortadora CNC",
            estado="operativo",
            ultimo_mantenimiento=date.today() - timedelta(days=300),
            intervalo_dias=90,
        )
    )
    db.commit()

    # ACT
    alerts = get_current_alerts(db, tenant.id)

    # ASSERT
    equipo_alert = next(a for a in alerts if a["type"] == "equipo_mantenimiento")
    assert equipo_alert["level"] == "error"


# ─── Aislamiento multi-tenant ─────────────────────────────────────────────────


def test_get_current_alerts_solo_devuelve_alertas_del_tenant_pedido(db):
    """El motor de alertas nunca mezcla avisos de dos talleres distintos,
    aunque ambos tengan condiciones de alerta simultáneas."""
    # ARRANGE — Taller A y Taller B, cada uno con su propia OT bloqueada,
    # su propio stock bajo y su propio equipo con mantenimiento vencido.
    tenant_a = _tenant(db, "t-iso-a")
    tenant_b = _tenant(db, "t-iso-b")

    db.add(Job(tenant_id=tenant_a.id, titulo="OT de A", cliente="Cliente A",
               estado="en_proceso", fecha_inicio=date.today() - timedelta(days=5)))
    db.add(Job(tenant_id=tenant_b.id, titulo="OT de B", cliente="Cliente B",
               estado="en_proceso", fecha_inicio=date.today() - timedelta(days=5)))

    db.add(Material(tenant_id=tenant_a.id, name="Material de A", quantity=1, minimum=10, unit="ud"))
    db.add(Material(tenant_id=tenant_b.id, name="Material de B", quantity=1, minimum=10, unit="ud"))

    db.add(Equipo(tenant_id=tenant_a.id, nombre="Equipo de A", estado="operativo",
                  ultimo_mantenimiento=date.today() - timedelta(days=200), intervalo_dias=90))
    db.add(Equipo(tenant_id=tenant_b.id, nombre="Equipo de B", estado="operativo",
                  ultimo_mantenimiento=date.today() - timedelta(days=200), intervalo_dias=90))
    db.commit()

    # ACT
    alerts_a = get_current_alerts(db, tenant_a.id)

    # ASSERT — las 3 alertas de A están presentes; ninguna referencia a B aparece
    titles_a = " ".join(a["title"] + a["body"] for a in alerts_a)
    assert "OT de A" in titles_a or "Material de A" in titles_a  # sanity: hay contenido de A
    assert len(alerts_a) == 3
    assert "de B" not in titles_a
