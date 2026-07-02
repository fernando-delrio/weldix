"""
Motor de alertas — calcula los avisos activos del taller en este momento.

Tres fuentes de alerta:
  1. OTs bloqueadas en 'en_proceso' más de 48 h desde fecha_inicio
  2. Materiales de stock por debajo del mínimo
  3. Equipos con mantenimiento vencido (días desde último > intervalo)
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.stock.model import Material


def get_current_alerts(db: Session, tenant_id: int) -> list[dict]:
    """Devuelve todos los avisos activos del tenant ordenados por severidad."""
    cutoff = date.today() - timedelta(days=2)

    stale_jobs = (
        db.query(Job)
        .filter(
            Job.tenant_id == tenant_id,
            Job.estado == "en_proceso",
            Job.fecha_inicio.isnot(None),
            Job.fecha_inicio <= cutoff,
        )
        .all()
    )

    low_stock = (
        db.query(Material)
        .filter(
            Material.tenant_id == tenant_id,
            Material.quantity <= Material.minimum,
            Material.minimum > 0,
        )
        .all()
    )

    equipos_vencidos = [
        e
        for e in db.query(Equipo)
        .filter(
            Equipo.tenant_id == tenant_id,
            Equipo.estado == "operativo",
            Equipo.ultimo_mantenimiento.isnot(None),
            Equipo.intervalo_dias > 0,
        )
        .all()
        if (date.today() - e.ultimo_mantenimiento).days > e.intervalo_dias
    ]

    alerts: list[dict] = []

    alerts += [
        {
            "id": f"job_{j.id}",
            "type": "job_stale",
            "level": "warning",
            "title": f"OT bloqueada: {j.code or f'#{j.id}'}",
            "body": f"{j.titulo} lleva más de 48 h en proceso",
            "link": f"/app/trabajos/{j.id}",
        }
        for j in stale_jobs
    ]

    alerts += [
        {
            "id": f"stock_{m.id}",
            "type": "stock_low",
            "level": "warning",
            "title": f"Stock bajo: {m.name}",
            "body": f"Quedan {m.quantity} {m.unit} (mínimo: {m.minimum})",
            "link": "/app/stock",
        }
        for m in low_stock
    ]

    today = date.today()
    alerts += [
        {
            "id": f"equipo_{e.id}",
            "type": "equipo_mantenimiento",
            "level": "error"
            if (today - e.ultimo_mantenimiento).days > e.intervalo_dias * 1.5
            else "warning",
            "title": f"Mantenimiento vencido: {e.nombre}",
            "body": f"Último: {e.ultimo_mantenimiento.strftime('%d/%m/%Y')} · intervalo: {e.intervalo_dias} días",
            "link": "/app/equipos",
        }
        for e in equipos_vencidos
    ]

    return alerts
