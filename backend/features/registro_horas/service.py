from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.features.fichaje.model import Fichaje

from .model import RegistroHoras


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _duracion_horas(inicio: datetime, fin: datetime) -> float:
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    return round((fin - inicio).total_seconds() / 3600, 2)


# ── Consultas ─────────────────────────────────────────────────────────────────


def get_registro_activo(db: Session, operario_id: int) -> RegistroHoras | None:
    """Registro abierto del operario (sin fin), si existe."""
    return (
        db.query(RegistroHoras)
        .filter(RegistroHoras.operario_id == operario_id, RegistroHoras.fin.is_(None))
        .first()
    )


def get_registros_para_ot(db: Session, job_id: int) -> list[RegistroHoras]:
    """Todos los registros de una OT, ordenados por inicio desc."""
    return (
        db.query(RegistroHoras)
        .filter(RegistroHoras.job_id == job_id)
        .order_by(RegistroHoras.inicio.desc())
        .all()
    )


def get_registros_operario(db: Session, operario_id: int) -> list[RegistroHoras]:
    return (
        db.query(RegistroHoras)
        .filter(RegistroHoras.operario_id == operario_id)
        .order_by(RegistroHoras.inicio.desc())
        .all()
    )


# ── Mutaciones ────────────────────────────────────────────────────────────────


def iniciar_registro(db: Session, job_id: int, operario_id: int) -> RegistroHoras:
    """
    Abre un nuevo registro de horas en una OT.
    Reglas de negocio:
      1. El operario debe tener una jornada laboral activa (fichaje abierto).
      2. No puede tener dos registros abiertos a la vez.
    """
    jornada = (
        db.query(Fichaje)
        .filter(
            Fichaje.operario_id == operario_id,
            Fichaje.fin.is_(None),
        )
        .first()
    )
    if not jornada:
        raise ValueError(
            "Debes iniciar tu jornada laboral antes de registrar tiempo en una OT."
        )

    activo = get_registro_activo(db, operario_id)
    if activo:
        ot = activo.job.code if activo.job else f"#{activo.job_id}"
        raise ValueError(
            f"Ya tienes un registro abierto en la OT {ot}. Ciérralo antes de iniciar uno nuevo."
        )

    registro = RegistroHoras(job_id=job_id, operario_id=operario_id, inicio=_now_utc())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def finalizar_registro(
    db: Session, registro_id: int, operario_id: int
) -> RegistroHoras:
    """Cierra el registro y calcula las horas."""
    registro = db.query(RegistroHoras).filter(RegistroHoras.id == registro_id).first()
    if not registro:
        raise ValueError(f"Registro {registro_id} no encontrado")
    if registro.operario_id != operario_id:
        raise PermissionError("No puedes cerrar el registro de otro operario")
    if registro.fin is not None:
        raise ValueError("Este registro ya está cerrado")

    fin = _now_utc()
    registro.fin = fin
    registro.horas = _duracion_horas(registro.inicio, fin)
    db.commit()
    db.refresh(registro)
    return registro


# ── Resumen por OT ────────────────────────────────────────────────────────────


def get_resumen_horas_ot(db: Session, job_id: int) -> dict:
    """
    Agrega horas por operario en una OT.
    Solo cuenta registros cerrados (con horas calculadas).
    Devuelve el total global y el desglose por operario.
    """
    from backend.features.jobs.model import Job

    job = db.query(Job).filter(Job.id == job_id).first()

    registros = get_registros_para_ot(db, job_id)

    # Acumular horas por operario usando reduce mental: defaultdict
    por_operario: dict[int, dict] = defaultdict(
        lambda: {"nombre": "", "horas": 0.0, "sesiones": 0}
    )
    for r in registros:
        if r.horas is None:
            continue  # registro aún abierto — no lo contamos en el resumen
        pid = r.operario_id
        por_operario[pid]["nombre"] = r.operario.full_name if r.operario else f"#{pid}"
        por_operario[pid]["horas"] += r.horas
        por_operario[pid]["sesiones"] += 1

    resumen = [
        {
            "operario_id": pid,
            "operario_nombre": datos["nombre"],
            "total_horas": round(datos["horas"], 2),
            "num_sesiones": datos["sesiones"],
        }
        for pid, datos in por_operario.items()
    ]

    total = round(sum(d["total_horas"] for d in resumen), 2)

    return {
        "job_id": job_id,
        "job_code": job.code if job else None,
        "total_horas": total,
        "por_operario": resumen,
        "registros": registros,
    }
