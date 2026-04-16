from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .model import Fichaje

# Máximo de horas que puede durar una jornada.
# Si se supera, probablemente el operario olvidó fichar la salida.
MAX_HORAS_JORNADA = 16


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _duracion_horas(inicio: datetime, fin: datetime) -> float:
    """Calcula la duración en horas entre dos datetimes, con aware/naive handling."""
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    duracion = fin - inicio
    return round(duracion.total_seconds() / 3600, 2)


def _es_duracion_valida(inicio: datetime, fin: datetime) -> bool:
    """Una jornada es válida si dura 16h o menos."""
    return _duracion_horas(inicio, fin) <= MAX_HORAS_JORNADA


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
        raise ValueError(
            "Ya tienes una jornada abierta. Finalízala antes de iniciar una nueva."
        )

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

    # Guard: si la jornada lleva más de 16h abierta, es casi seguro que el operario
    # olvidó fichar la salida. Bloqueamos y pedimos al admin que la cierre manualmente.
    if not _es_duracion_valida(fichaje.inicio, fin):
        horas_reales = round(_duracion_horas(fichaje.inicio, fin))
        raise ValueError(
            f"Esta jornada lleva {horas_reales}h abierta, lo que supera el límite de "
            f"{MAX_HORAS_JORNADA}h. Probablemente olvidaste fichar la salida. "
            f"Contacta con el administrador para que la cierre manualmente."
        )

    fichaje.fin = fin
    fichaje.horas = _duracion_horas(fichaje.inicio, fin)
    db.commit()
    db.refresh(fichaje)
    return fichaje


def forzar_cierre_jornada(db: Session, fichaje_id: int, horas_reales: float) -> Fichaje:
    """
    Admin: cierra una jornada huérfana estableciendo las horas manualmente.
    Se usa cuando el operario olvidó fichar la salida y la jornada supera 16h.
    """
    fichaje = db.query(Fichaje).filter(Fichaje.id == fichaje_id).first()
    if not fichaje:
        raise ValueError(f"Jornada {fichaje_id} no encontrada")
    if fichaje.fin is not None:
        raise ValueError("Esta jornada ya está cerrada")
    if horas_reales <= 0 or horas_reales > MAX_HORAS_JORNADA:
        raise ValueError(f"Las horas deben estar entre 0 y {MAX_HORAS_JORNADA}")

    # Reconstruimos el fin a partir de las horas reales declaradas por el admin
    inicio = fichaje.inicio
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    from datetime import timedelta

    fichaje.fin = inicio + timedelta(hours=horas_reales)
    fichaje.horas = horas_reales
    db.commit()
    db.refresh(fichaje)
    return fichaje


def get_fichajes_operario(
    db: Session, operario_id: int, limit: int = 30
) -> list[Fichaje]:
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
    return db.query(Fichaje).order_by(Fichaje.inicio.desc()).limit(limit).all()
