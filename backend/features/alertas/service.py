"""
Motor de alertas — calcula los avisos activos del taller en este momento.

Dos fuentes de alerta:
  1. OTs bloqueadas en 'en_proceso' más de 48 h desde fecha_inicio
  2. Materiales de stock por debajo del mínimo

Nota: hubo una tercera fuente (mantenimiento de equipos vencido) que se quitó
porque el módulo Equipos/GMAO no tiene ruta en el frontend — esas alertas
enlazaban a /app/equipos, un callejón sin salida. Si el módulo se publica
alguna vez, esta es la función a la que hay que devolver esa fuente.
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from backend.core.ws_manager import ws_manager
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

    return alerts


async def push_alerts(db: Session, tenant_id: int) -> None:
    """Empuja snapshot fresco de alertas a todos los clientes WS del tenant.

    Best-effort: si el broadcast falla no interrumpe el endpoint HTTP que lo llama.
    """
    try:
        await ws_manager.broadcast(
            tenant_id,
            {"type": "snapshot", "alerts": get_current_alerts(db, tenant_id)},
        )
    except Exception:
        pass
