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
    dias = _dias_desde(equipo.ultimo_mantenimiento)
    alerta = dias is not None and dias > equipo.intervalo_dias
    return {
        "id": equipo.id,
        "nombre": equipo.nombre,
        "tipo": equipo.tipo,
        "descripcion": equipo.descripcion,
        "estado": equipo.estado,
        "ultimo_mantenimiento": equipo.ultimo_mantenimiento,
        "intervalo_dias": equipo.intervalo_dias,
        "created_at": equipo.created_at,
        "dias_desde_mantenimiento": dias,
        "alerta_mantenimiento": alerta,
    }


def get_all_equipos(db: Session, tenant_id: int | None = None) -> list[dict]:
    q = db.query(Equipo)
    if tenant_id is not None:
        q = q.filter(Equipo.tenant_id == tenant_id)
    equipos = q.order_by(Equipo.nombre.asc()).all()
    return [_enriquecer(e) for e in equipos]


def get_equipos_con_alerta(db: Session, tenant_id: int | None = None) -> list[dict]:
    todos = get_all_equipos(db, tenant_id)
    return [e for e in todos if e["alerta_mantenimiento"]]


def get_equipo_by_id(db: Session, equipo_id: int, tenant_id: int | None = None) -> dict:
    q = db.query(Equipo).filter(Equipo.id == equipo_id)
    if tenant_id is not None:
        q = q.filter(Equipo.tenant_id == tenant_id)
    equipo = q.first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")
    return _enriquecer(equipo)


def create_equipo(
    db: Session, data: CreateEquipoRequest, tenant_id: int | None = None
) -> dict:
    if data.estado not in ESTADOS_VALIDOS:
        raise ValueError(f"Estado inválido: {data.estado}. Válidos: {ESTADOS_VALIDOS}")

    equipo = Equipo(
        tenant_id=tenant_id,
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


def update_equipo(
    db: Session, equipo_id: int, data: UpdateEquipoRequest, tenant_id: int | None = None
) -> dict:
    q = db.query(Equipo).filter(Equipo.id == equipo_id)
    if tenant_id is not None:
        q = q.filter(Equipo.tenant_id == tenant_id)
    equipo = q.first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")

    if data.nombre is not None:
        equipo.nombre = data.nombre
    if data.tipo is not None:
        equipo.tipo = data.tipo
    if data.descripcion is not None:
        equipo.descripcion = data.descripcion
    if data.ultimo_mantenimiento is not None:
        equipo.ultimo_mantenimiento = data.ultimo_mantenimiento
    if data.intervalo_dias is not None:
        equipo.intervalo_dias = data.intervalo_dias

    db.commit()
    db.refresh(equipo)
    return _enriquecer(equipo)


def update_estado_equipo(
    db: Session, equipo_id: int, estado: str, tenant_id: int | None = None
) -> dict:
    if estado not in ESTADOS_VALIDOS:
        raise ValueError(f"Estado inválido: {estado}")

    q = db.query(Equipo).filter(Equipo.id == equipo_id)
    if tenant_id is not None:
        q = q.filter(Equipo.tenant_id == tenant_id)
    equipo = q.first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")

    equipo.estado = estado
    db.commit()
    db.refresh(equipo)
    return _enriquecer(equipo)


def delete_equipo(db: Session, equipo_id: int, tenant_id: int | None = None) -> None:
    q = db.query(Equipo).filter(Equipo.id == equipo_id)
    if tenant_id is not None:
        q = q.filter(Equipo.tenant_id == tenant_id)
    equipo = q.first()
    if not equipo:
        raise ValueError(f"Equipo {equipo_id} no encontrado")
    db.delete(equipo)
    db.commit()
