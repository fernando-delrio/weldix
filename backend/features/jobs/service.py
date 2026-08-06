import secrets
from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.core.webhooks import fire_webhook
from backend.features.historial.service import add_event

from .model import Job
from .schemas import CreateJobRequest, UpdateJobRequest


def _clamp_progress(value: int) -> int:
    return max(0, min(value, 100))


def _generate_code(db: Session, tenant_id: int | None = None) -> str:
    """Auto-genera el código ORD-YYYY-NNN si el admin no lo rellena."""
    year = date.today().year
    prefix = f"ORD-{year}-"
    q = db.query(Job).filter(Job.code.like(f"{prefix}%"))
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    count = q.count()
    return f"{prefix}{count + 1:03d}"


def get_all_jobs(db: Session, tenant_id: int | None = None) -> list[Job]:
    # joinedload del operario: sin él, pintar el nombre del operario en cada fila
    # del listado dispara una query por trabajo (N+1). Con él, una sola query con JOIN.
    q = db.query(Job).options(joinedload(Job.operario))
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    return q.order_by(Job.created_at.desc()).all()


def get_jobs_for_user(
    db: Session, user_id: int, tenant_id: int | None = None
) -> list[Job]:
    q = db.query(Job).options(joinedload(Job.operario)).filter(Job.operario_id == user_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    return q.order_by(Job.created_at.desc()).all()


def get_job_by_id(db: Session, job_id: int, tenant_id: int | None = None) -> Job:
    q = db.query(Job).filter(Job.id == job_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise ValueError(f"Trabajo {job_id} no encontrado")
    return job


def get_job_by_code(db: Session, code: str, tenant_id: int | None = None) -> Job:
    q = db.query(Job).filter(Job.code == code.strip().upper())
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise ValueError(f"No se encontró ninguna OT con código {code}")
    if job.estado != "pendiente":
        raise ValueError(
            f"La OT {code} ya está en estado '{job.estado}' y no puede iniciarse"
        )
    return job


def create_job(
    db: Session, data: CreateJobRequest, tenant_id: int | None = None
) -> Job:
    job = Job(
        tenant_id=tenant_id,
        code=data.code or _generate_code(db, tenant_id),
        titulo=data.titulo,
        cliente=data.cliente,
        estado=data.estado,
        operario_id=data.operario_id,
        fecha_inicio=data.fecha_inicio,
        progreso=_clamp_progress(data.progreso),
        descripcion=data.descripcion,
        public_token=secrets.token_urlsafe(32),
    )
    db.add(job)
    db.flush()  # obtiene job.id sin commitear — evento y job van en el mismo commit
    add_event(
        db,
        job.id,
        "creado",
        f"Trabajo {job.code} creado",
        "Sistema",
        tenant_id=tenant_id,
    )
    db.commit()
    db.refresh(job)
    return job


def _is_starting_job(current_estado: str, new_estado: str) -> bool:
    return current_estado == "pendiente" and new_estado == "en_proceso"


# Strategy Pattern (OCP) — mismo criterio que frontend/modules/core/lib/statusConfig.js
# (campo `next` de STATUS_CONFIG). Cada estado solo puede avanzar al siguiente de la
# cadena; 'entregado' es terminal y no tiene salida. Añadir un estado nuevo es una
# línea aquí, no un if/elif nuevo — igual que en el frontend.
_NEXT_ESTADO = {
    "pendiente": "en_proceso",
    "en_proceso": "control",
    "control": "listo",
    "listo": "entregado",
    "entregado": None,
}


def _is_valid_transition(current_estado: str, new_estado: str) -> bool:
    return _NEXT_ESTADO.get(current_estado) == new_estado


def update_estado(
    db: Session,
    job_id: int,
    estado: str,
    progreso: int | None = None,
    current_user_id: int | None = None,
    current_user_role: str = "operario",
    current_user_name: str = "Operario",
    tenant_id: int | None = None,
) -> Job:
    job = get_job_by_id(db, job_id, tenant_id)
    # Un operario solo puede modificar sus propios trabajos
    if (
        current_user_role != "admin"
        and job.operario_id
        and job.operario_id != current_user_id
    ):
        raise PermissionError("No tienes permiso para modificar este trabajo")
    # Guard clause: solo se permite avanzar al siguiente estado de la cadena.
    # 'entregado' es terminal — nunca puede volver a un estado anterior ni saltar etapas.
    current_estado = str(job.estado)
    if not _is_valid_transition(current_estado, estado):
        siguiente = _NEXT_ESTADO.get(current_estado)
        detalle_siguiente = f"'{siguiente}'" if siguiente else "ninguna: es un estado final"
        raise ValueError(
            f"No se puede cambiar de '{current_estado}' a '{estado}'. "
            f"Transición siguiente válida: {detalle_siguiente}"
        )
    # Auto-asignar operario al iniciar: si no tenía asignado, queda bloqueado a quien lo inicia
    if _is_starting_job(job.estado, estado) and not job.operario_id and current_user_id:
        job.operario_id = current_user_id
    job.estado = estado
    # Solo actualizamos el progreso si el llamante lo envía (el Kanban no lo hace).
    if progreso is not None:
        job.progreso = _clamp_progress(progreso)
    add_event(
        db,
        job.id,
        "estado_cambiado",
        f"Estado cambiado a '{estado}'",
        current_user_name,
        tenant_id=tenant_id,
    )
    db.commit()
    db.refresh(job)

    if estado == "listo":
        fire_webhook(
            "job_listo",
            {
                "job_id": job.id,
                "job_code": job.code,
                "titulo": job.titulo,
                "cliente": job.cliente,
                "tenant_id": job.tenant_id,
            },
        )

    return job


def update_job(
    db: Session, job_id: int, data: UpdateJobRequest, tenant_id: int | None = None
) -> Job:
    job = get_job_by_id(db, job_id, tenant_id)
    if data.titulo is not None:
        job.titulo = data.titulo
    if data.cliente is not None:
        job.cliente = data.cliente
    if data.operario_id is not None:
        job.operario_id = data.operario_id
    if data.fecha_inicio is not None:
        job.fecha_inicio = data.fecha_inicio
    if data.progreso is not None:
        job.progreso = _clamp_progress(data.progreso)
    if data.descripcion is not None:
        job.descripcion = data.descripcion
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: int, tenant_id: int | None = None) -> None:
    job = get_job_by_id(db, job_id, tenant_id)
    db.delete(job)
    db.commit()


def get_or_create_public_token(
    db: Session, job_id: int, tenant_id: int | None = None
) -> str:
    """Devuelve el token público del job, generándolo si aún no tiene uno."""
    job = get_job_by_id(db, job_id, tenant_id)
    if job.public_token is None:  # type: ignore[comparison-overlap]
        job.public_token = secrets.token_urlsafe(32)  # type: ignore[assignment]
        db.commit()
        db.refresh(job)
    return str(job.public_token)


def search_jobs(
    db: Session,
    q: str,
    user_id: int | None,
    user_role: str,
    tenant_id: int | None = None,
) -> list[Job]:
    """Búsqueda rápida — ILIKE en título, cliente y código OT. Limitado a 10 resultados."""
    term = f"%{q.strip()}%"
    query = db.query(Job).options(joinedload(Job.operario)).filter(
        or_(
            Job.titulo.ilike(term),
            Job.cliente.ilike(term),
            Job.code.ilike(term),
        )
    )
    if tenant_id is not None:
        query = query.filter(Job.tenant_id == tenant_id)
    # El operario solo puede ver sus propios trabajos
    if user_role != "admin":
        query = query.filter(Job.operario_id == user_id)
    return query.order_by(Job.created_at.desc()).limit(10).all()
