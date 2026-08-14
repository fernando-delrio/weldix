from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.features.fichaje.model import Fichaje

from .model import RegistroHoras


class JobNotFoundError(ValueError):
    """
    La OT no existe o no pertenece al tenant del llamante.

    Subclase de ValueError (no un tipo nuevo sin relación) para que cualquier
    `except ValueError` existente siga funcionando sin cambios. El router la
    captura primero y explícitamente para devolver 404 en vez del 400 que
    usa el resto de errores de negocio de este módulo (jornada no iniciada,
    registro ya abierto...) — mismo patrón que PermissionError vs ValueError
    en `finalizar_registro`.
    """


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _duracion_horas(inicio: datetime, fin: datetime) -> float:
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)
    return round((fin - inicio).total_seconds() / 3600, 2)


def _get_job_in_tenant(db: Session, job_id: int, tenant_id: int | None):
    """Devuelve la OT si existe y pertenece al tenant; si no, JobNotFoundError.

    Evita que un operario de OTRO taller registre u observe horas de una OT
    ajena adivinando su job_id — el mismo tipo de fuga (IDOR cross-tenant)
    que ya se corrigió en fichaje/service.py y rrhh/service.py.
    """
    from backend.features.jobs.model import Job

    q = db.query(Job).filter(Job.id == job_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise JobNotFoundError(f"Trabajo {job_id} no encontrado")
    return job


# ── Consultas ─────────────────────────────────────────────────────────────────


def get_registro_activo(db: Session, operario_id: int) -> RegistroHoras | None:
    """
    Registro abierto del operario (sin fin), si existe.

    No necesita tenant_id: operario_id siempre llega desde current_user.id
    (el propio usuario autenticado, nunca un id externo elegido por el
    llamante), así que no hay superficie de IDOR aquí — a diferencia de
    iniciar_registro y get_resumen_horas_ot, que reciben un job_id externo.
    """
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


def iniciar_registro(
    db: Session, job_id: int, operario_id: int, tenant_id: int | None = None
) -> RegistroHoras:
    """
    Abre un nuevo registro de horas en una OT.
    Reglas de negocio:
      1. La OT debe existir y pertenecer al taller del operario.
      2. El operario debe tener una jornada laboral activa (fichaje abierto).
      3. No puede tener dos registros abiertos a la vez.
    """
    _get_job_in_tenant(db, job_id, tenant_id)

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

    registro = RegistroHoras(
        tenant_id=tenant_id, job_id=job_id, operario_id=operario_id, inicio=_now_utc()
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


def finalizar_registro(
    db: Session, registro_id: int, operario_id: int
) -> RegistroHoras:
    """
    Cierra el registro y calcula las horas.

    No necesita tenant_id: `registro.operario_id != operario_id` ya bloquea
    el cruce entre talleres, porque los ids de usuario son globales y
    únicos en toda la tabla `users` — ningún usuario de otro tenant puede
    coincidir con el operario_id del registro salvo que sea la misma
    cuenta. Ver ERRORES_APRENDIDOS.md para el detalle de este análisis.
    """
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


def get_resumen_horas_ot(
    db: Session, job_id: int, tenant_id: int | None = None
) -> dict:
    """
    Agrega horas por operario en una OT.
    Solo cuenta registros cerrados (con horas calculadas).
    Devuelve el total global y el desglose por operario.

    Valida que la OT pertenezca al tenant antes de calcular nada — sin este
    guard, cualquier usuario autenticado de OTRO taller podía leer el
    resumen de horas (código, título, horas y nombres de operarios) de una
    OT que no era suya, solo conociendo su job_id (IDOR cross-tenant, ver
    ERRORES_APRENDIDOS.md).
    """
    job = _get_job_in_tenant(db, job_id, tenant_id)

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
