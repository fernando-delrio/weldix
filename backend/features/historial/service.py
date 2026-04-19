from sqlalchemy.orm import Session

from .model import JobEvent


def add_event(
    db: Session,
    trabajo_id: int,
    tipo: str,
    descripcion: str,
    usuario: str,
    tenant_id: int | None = None,
) -> JobEvent:
    """
    Registra un evento en el historial de una OT.
    Se llama desde jobs/service.py — nunca directamente desde el router.
    """
    event = JobEvent(
        tenant_id=tenant_id,
        trabajo_id=trabajo_id,
        tipo=tipo,
        descripcion=descripcion,
        usuario=usuario,
    )
    db.add(event)
    # Sin commit aquí — el caller (jobs/service.py) es dueño de la transacción.
    # Así job + evento se guardan juntos o no se guarda ninguno.
    return event


def get_events_by_job(
    db: Session, trabajo_id: int, tenant_id: int | None = None
) -> list[JobEvent]:
    """Devuelve todos los eventos de una OT ordenados del más antiguo al más reciente."""
    q = db.query(JobEvent).filter(JobEvent.trabajo_id == trabajo_id)
    if tenant_id is not None:
        q = q.filter(JobEvent.tenant_id == tenant_id)
    return q.order_by(JobEvent.created_at.asc()).all()
