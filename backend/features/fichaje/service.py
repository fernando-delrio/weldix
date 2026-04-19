import csv
import io
from datetime import datetime, timedelta, timezone

from sqlalchemy import extract
from sqlalchemy.orm import Session

from .model import Fichaje

MAX_HORAS_JORNADA = 16


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _duracion_horas(inicio: datetime, fin: datetime) -> float:
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    duracion = fin - inicio
    return round(duracion.total_seconds() / 3600, 2)


def _es_duracion_valida(inicio: datetime, fin: datetime) -> bool:
    return _duracion_horas(inicio, fin) <= MAX_HORAS_JORNADA


def get_jornada_activa(db: Session, operario_id: int) -> Fichaje | None:
    return (
        db.query(Fichaje)
        .filter(Fichaje.operario_id == operario_id, Fichaje.fin.is_(None))
        .first()
    )


def iniciar_jornada(
    db: Session, operario_id: int, tenant_id: int | None = None
) -> Fichaje:
    activa = get_jornada_activa(db, operario_id)
    if activa:
        raise ValueError(
            "Ya tienes una jornada abierta. Finalízala antes de iniciar una nueva."
        )

    fichaje = Fichaje(tenant_id=tenant_id, operario_id=operario_id, inicio=_now_utc())
    db.add(fichaje)
    db.commit()
    db.refresh(fichaje)
    return fichaje


def finalizar_jornada(db: Session, fichaje_id: int, operario_id: int) -> Fichaje:
    fichaje = db.query(Fichaje).filter(Fichaje.id == fichaje_id).first()
    if not fichaje:
        raise ValueError(f"Jornada {fichaje_id} no encontrada")
    if fichaje.operario_id != operario_id:
        raise PermissionError("No puedes finalizar la jornada de otro operario")
    if fichaje.fin is not None:
        raise ValueError("Esta jornada ya está cerrada")

    fin = _now_utc()
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


def forzar_cierre_jornada(
    db: Session, fichaje_id: int, horas_reales: float, tenant_id: int | None = None
) -> Fichaje:
    q = db.query(Fichaje).filter(Fichaje.id == fichaje_id)
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id)
    fichaje = q.first()
    if not fichaje:
        raise ValueError(f"Jornada {fichaje_id} no encontrada")
    if fichaje.fin is not None:
        raise ValueError("Esta jornada ya está cerrada")
    if horas_reales <= 0 or horas_reales > MAX_HORAS_JORNADA:
        raise ValueError(f"Las horas deben estar entre 0 y {MAX_HORAS_JORNADA}")

    inicio = fichaje.inicio
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    fichaje.fin = inicio + timedelta(hours=horas_reales)
    fichaje.horas = horas_reales
    db.commit()
    db.refresh(fichaje)
    return fichaje


def get_fichajes_operario(
    db: Session, operario_id: int, limit: int = 30
) -> list[Fichaje]:
    return (
        db.query(Fichaje)
        .filter(Fichaje.operario_id == operario_id)
        .order_by(Fichaje.inicio.desc())
        .limit(limit)
        .all()
    )


def get_todos_los_fichajes(
    db: Session, tenant_id: int | None = None, limit: int = 100
) -> list[Fichaje]:
    q = db.query(Fichaje)
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id)
    return q.order_by(Fichaje.inicio.desc()).limit(limit).all()


def _fmt_dt(value: datetime | None) -> str:
    if not value:
        return ""
    return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def build_fichajes_csv(
    db: Session,
    tenant_id: int | None = None,
    year: int | None = None,
    month: int | None = None,
) -> str:
    """
    CSV legal para inspeccion/auditoria con jornadas por operario.
    Se filtra opcionalmente por anio y mes.
    """
    from backend.features.auth.model import User

    q = db.query(Fichaje, User).join(User, User.id == Fichaje.operario_id)
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id, User.tenant_id == tenant_id)
    if year is not None:
        q = q.filter(extract("year", Fichaje.inicio) == year)
    if month is not None:
        q = q.filter(extract("month", Fichaje.inicio) == month)

    rows = q.order_by(User.full_name.asc().nulls_last(), Fichaje.inicio.desc()).all()

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        [
            "fichaje_id",
            "worker_number",
            "operario",
            "email",
            "inicio_utc",
            "fin_utc",
            "horas",
            "estado",
        ]
    )

    for fichaje, user in rows:
        estado = "abierta" if fichaje.fin is None else "cerrada"
        writer.writerow(
            [
                fichaje.id,
                user.worker_number or "",
                user.full_name or user.email,
                user.email,
                _fmt_dt(fichaje.inicio),
                _fmt_dt(fichaje.fin),
                "" if fichaje.horas is None else round(float(fichaje.horas), 2),
                estado,
            ]
        )

    return out.getvalue()
