from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .model import Fichaje


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _duracion_horas(inicio: datetime, fin: datetime) -> float:
    """Calcula la duración en horas entre dos datetimes, con aware/naive handling."""
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    duracion = fin - inicio
    return round(duracion.total_seconds() / 3600, 2)


def get_jornada_activa(db: Session, operario_id: int) -> Fichaje | None:
    """Jornada abierta (sin fin) del operario. Sólo puede haber una."""
    return (
        db.query(Fichaje)
        .filter(Fichaje.operario_id == operario_id, Fichaje.fin.is_(None))
        .first()
    )


def iniciar_jornada(db: Session, operario_id: int) -> Fichaje:
    """
    Abre una nueva jornada laboral.
    Regla de negocio: no se puede iniciar si ya hay una jornada abierta.
    """
    activa = get_jornada_activa(db, operario_id)
    if activa:
        raise ValueError("Ya tienes una jornada abierta. Finalízala antes de iniciar una nueva.")

    fichaje = Fichaje(operario_id=operario_id, inicio=_now_utc())
    db.add(fichaje)
    db.commit()
    db.refresh(fichaje)
    return fichaje


def finalizar_jornada(db: Session, fichaje_id: int, operario_id: int) -> Fichaje:
    """
    Cierra la jornada y calcula las horas.
    Solo el propio operario puede cerrar su jornada.
    """
    fichaje = db.query(Fichaje).filter(Fichaje.id == fichaje_id).first()
    if not fichaje:
        raise ValueError(f"Jornada {fichaje_id} no encontrada")
    if fichaje.operario_id != operario_id:
        raise PermissionError("No puedes finalizar la jornada de otro operario")
    if fichaje.fin is not None:
        raise ValueError("Esta jornada ya está cerrada")

    fin = _now_utc()
    fichaje.fin   = fin
    fichaje.horas = _duracion_horas(fichaje.inicio, fin)
    db.commit()
    db.refresh(fichaje)
    return fichaje


def get_fichajes_operario(db: Session, operario_id: int, limit: int = 30) -> list[Fichaje]:
    """Últimas jornadas de un operario, más reciente primero."""
    return (
        db.query(Fichaje)
        .filter(Fichaje.operario_id == operario_id)
        .order_by(Fichaje.inicio.desc())
        .limit(limit)
        .all()
    )


def get_todos_los_fichajes(db: Session, limit: int = 100) -> list[Fichaje]:
    """Admin: todos los fichajes de todos los operarios, más reciente primero."""
    return (
        db.query(Fichaje)
        .order_by(Fichaje.inicio.desc())
        .limit(limit)
        .all()
    )
