import csv
import io
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

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
    db: Session, operario_id: int, limit: int = 30, tenant_id: int | None = None
) -> list[Fichaje]:
    q = db.query(Fichaje).filter(Fichaje.operario_id == operario_id)
    # Scoping por tenant: sin él, un admin podría leer las horas de un operario
    # de OTRO taller pasando un operario_id ajeno (IDOR cross-tenant).
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id)
    return q.order_by(Fichaje.inicio.desc()).limit(limit).all()


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


def _dt_desde(d: date) -> datetime:
    return datetime.combine(d, datetime.min.time()).replace(tzinfo=timezone.utc)


def _dt_hasta(d: date) -> datetime:
    return datetime.combine(d, datetime.max.time()).replace(tzinfo=timezone.utc)


def get_resumen_extras(
    db: Session,
    tenant_id: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
) -> list[dict]:
    """Horas ordinarias y extras por operario en el rango indicado.

    Hora extra = cada hora trabajada en un día por encima de 8h ordinarias.
    Agrupa todos los fichajes del día antes de calcular el exceso — evita
    contar como extra un corte de jornada partido en dos fichajes.
    """
    from backend.features.auth.model import User

    q = db.query(Fichaje, User).join(User, User.id == Fichaje.operario_id)
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id)
    if desde:
        q = q.filter(Fichaje.inicio >= _dt_desde(desde))
    if hasta:
        q = q.filter(Fichaje.inicio <= _dt_hasta(hasta))

    rows = q.order_by(Fichaje.inicio.asc()).all()

    # { operario_id: { user, days: {day_key: horas}, total_fichajes } }
    by_op: dict = defaultdict(lambda: {"user": None, "days": defaultdict(float), "n": 0})
    for fichaje, user in rows:
        if fichaje.horas is None:
            continue
        entry = by_op[user.id]
        entry["user"] = user
        entry["n"] += 1
        inicio = fichaje.inicio
        if inicio.tzinfo is None:
            inicio = inicio.replace(tzinfo=timezone.utc)
        entry["days"][inicio.strftime("%Y-%m-%d")] += float(fichaje.horas)

    ORDINARIA = 8.0
    result = []
    for operario_id, data in by_op.items():
        user = data["user"]
        if not user:
            continue
        total = sum(data["days"].values())
        extras = sum(max(0.0, h - ORDINARIA) for h in data["days"].values())
        result.append({
            "operario_id": operario_id,
            "operario_nombre": user.full_name or user.email,
            "email": user.email,
            "total_jornadas": len(data["days"]),
            "total_fichajes": data["n"],
            "total_horas": round(total, 2),
            "horas_ordinarias": round(total - extras, 2),
            "horas_extra": round(extras, 2),
        })

    return sorted(result, key=lambda x: (x["operario_nombre"] or "").lower())


def build_fichajes_csv_rango(
    db: Session,
    tenant_id: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
) -> str:
    """CSV para Inspección de Trabajo filtrado por rango libre de fechas."""
    from backend.features.auth.model import User

    q = db.query(Fichaje, User).join(User, User.id == Fichaje.operario_id)
    if tenant_id is not None:
        q = q.filter(Fichaje.tenant_id == tenant_id, User.tenant_id == tenant_id)
    if desde:
        q = q.filter(Fichaje.inicio >= _dt_desde(desde))
    if hasta:
        q = q.filter(Fichaje.inicio <= _dt_hasta(hasta))

    rows = q.order_by(User.full_name.asc().nulls_last(), Fichaje.inicio.asc()).all()

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "fichaje_id", "worker_number", "operario", "email",
        "inicio_utc", "fin_utc", "horas", "estado",
    ])
    for fichaje, user in rows:
        writer.writerow([
            fichaje.id,
            user.worker_number or "",
            user.full_name or user.email,
            user.email,
            _fmt_dt(fichaje.inicio),
            _fmt_dt(fichaje.fin),
            "" if fichaje.horas is None else round(float(fichaje.horas), 2),
            "abierta" if fichaje.fin is None else "cerrada",
        ])
    return out.getvalue()
