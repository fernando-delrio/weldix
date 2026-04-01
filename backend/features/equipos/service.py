from datetime import date

from sqlalchemy.orm import Session

from .model import Equipo
from .schemas import CreateEquipoRequest, UpdateEquipoRequest

ESTADOS_VALIDOS = {"operativo", "en_revision", "averiado", "retirado"}


def _dias_desde(fecha: date | None) -> int | None:
    if fecha is None:
        return None
    return (date.today() - fecha).days


def _enriquecer(equipo: Equipo) -> dict:
    """
    Añade días_desde_mantenimiento y alerta_mantenimiento al equipo.
    Estas propiedades se calculan en tiempo de consulta, no se almacenan en la BD.
    """
    dias = _dias_desde(equipo.ultimo_mantenimiento)
    alerta = dias is not None and dias > equipo.intervalo_dias
    return {
        "id":                   equipo.id,
        "nombre":               equipo.nombre,
        "tipo":                 equipo.tipo,
        "descripcion":          equipo.descripcion,
        "estado":               equipo.estado,
        "ultimo_mantenimiento": equipo.ultimo_mantenimiento,
        "intervalo_dias":       equipo.intervalo_dias,
        "created_at":           equipo.created_at,
        "dias_desde_mantenimiento": dias,
        "alerta_mantenimiento": alerta,
    }


def get_all_equipos(db: Session) -> list[dict]:
    equipos = db.query(Equipo).order_by(Equipo.nombre.asc()).all()
    return [_enriquecer(e) for e in equipos]


def get_equipos_con_alerta(db: Session) -> list[dict]:
    """Solo equipos que superan su intervalo de mantenimiento."""
    todos = get_all_equipos(db)
    return [e for e in todos if e["alerta_mantenimiento"]]


def get_equipo_by_id(db: Session, equipo_id: int) -> dict:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")
    return _enriquecer(equipo)


def create_equipo(db: Session, data: CreateEquipoRequest) -> dict:
    if data.estado not in ESTADOS_VALIDOS:
        raise ValueError(f"Estado inválido: {data.estado}. Válidos: {ESTADOS_VALIDOS}")

    equipo = Equipo(
        nombre=data.nombre,
        tipo=data.tipo,
        descripcion=data.descripcion,
        estado=data.estado,
        ultimo_mantenimiento=data.ultimo_mantenimiento,
        intervalo_dias=data.intervalo_dias,
    )
    db.add(equipo)
    db.commit()
    db.refresh(equipo)
    return _enriquecer(equipo)


def update_equipo(db: Session, equipo_id: int, data: UpdateEquipoRequest) -> dict:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")

    if data.nombre               is not None: equipo.nombre               = data.nombre
    if data.tipo                 is not None: equipo.tipo                 = data.tipo
    if data.descripcion          is not None: equipo.descripcion          = data.descripcion
    if data.ultimo_mantenimiento is not None: equipo.ultimo_mantenimiento = data.ultimo_mantenimiento
    if data.intervalo_dias       is not None: equipo.intervalo_dias       = data.intervalo_dias

    db.commit()
    db.refresh(equipo)
    return _enriquecer(equipo)


def update_estado_equipo(db: Session, equipo_id: int, estado: str) -> dict:
    if estado not in ESTADOS_VALIDOS:
        raise ValueError(f"Estado inválido: {estado}")

    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")

    equipo.estado = estado
    db.commit()
    db.refresh(equipo)
    return _enriquecer(equipo)


def delete_equipo(db: Session, equipo_id: int) -> None:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")
    db.delete(equipo)
    db.commit()
