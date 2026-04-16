from sqlalchemy.orm import Session

from .model import JobEvent


def add_event(
    db: Session, trabajo_id: int, tipo: str, descripcion: str, usuario: str
) -> JobEvent:
    """
    Registra un evento en el historial de una OT.
    Se llama desde jobs/service.py — nunca directamente desde el router.
    """
    event = JobEvent(
        trabajo_id=trabajo_id,
        tipo=tipo,
        descripcion=descripcion,
        usuario=usuario,
    )
    db.add(event)
    # Sin commit aquí — el caller (jobs/service.py) es dueño de la transacción.
    # Así job + evento se guardan juntos o no se guarda ninguno.
    return event


def get_events_by_job(db: Session, trabajo_id: int) -> list[JobEvent]:
    """Devuelve todos los eventos de una OT ordenados del más antiguo al más reciente."""
    return (
        db.query(JobEvent)
        .filter(JobEvent.trabajo_id == trabajo_id)
        .order_by(JobEvent.created_at.asc())
        .all()
    )
