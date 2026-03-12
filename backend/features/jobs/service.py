from sqlalchemy.orm import Session

from .model import Job
from .schemas import CreateJobRequest, UpdateJobRequest


def _clamp_progress(value: int) -> int:
    return max(0, min(value, 100))


def get_all_jobs(db: Session) -> list[Job]:
    return db.query(Job).order_by(Job.created_at.desc()).all()


def get_jobs_for_user(db: Session, user_id: int) -> list[Job]:
    return db.query(Job).filter(Job.operario_id == user_id).order_by(Job.created_at.desc()).all()


def get_job_by_id(db: Session, job_id: int) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Trabajo {job_id} no encontrado")
    return job


def get_job_by_code(db: Session, code: str) -> Job:
    job = db.query(Job).filter(Job.code == code.strip().upper()).first()
    if not job:
        raise ValueError(f"No se encontró ninguna OT con código {code}")
    if job.estado != "pendiente":
        raise ValueError(f"La OT {code} ya está en estado '{job.estado}' y no puede iniciarse")
    return job


def create_job(db: Session, data: CreateJobRequest) -> Job:
    job = Job(
        code=data.code,
        titulo=data.titulo,
        cliente=data.cliente,
        estado=data.estado,
        operario_id=data.operario_id,
        fecha_inicio=data.fecha_inicio,
        progreso=_clamp_progress(data.progreso),
        descripcion=data.descripcion,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _is_starting_job(current_estado: str, new_estado: str) -> bool:
    return current_estado == 'pendiente' and new_estado == 'en_proceso'


def update_estado(db: Session, job_id: int, estado: str, progreso: int, current_user_id: int | None = None, current_user_role: str = 'operario') -> Job:
    job = get_job_by_id(db, job_id)
    # Un operario solo puede modificar sus propios trabajos
    if current_user_role != 'admin' and job.operario_id and job.operario_id != current_user_id:
        raise PermissionError("No tienes permiso para modificar este trabajo")
    # Auto-asignar operario al iniciar: si no tenía asignado, queda bloqueado a quien lo inicia
    if _is_starting_job(job.estado, estado) and not job.operario_id and current_user_id:
        job.operario_id = current_user_id
    job.estado   = estado
    job.progreso = _clamp_progress(progreso)
    db.commit()
    db.refresh(job)
    return job


def update_job(db: Session, job_id: int, data: UpdateJobRequest) -> Job:
    job = get_job_by_id(db, job_id)
    if data.titulo       is not None: job.titulo       = data.titulo
    if data.cliente      is not None: job.cliente      = data.cliente
    if data.operario_id  is not None: job.operario_id  = data.operario_id
    if data.fecha_inicio is not None: job.fecha_inicio = data.fecha_inicio
    if data.progreso     is not None: job.progreso     = _clamp_progress(data.progreso)
    if data.descripcion  is not None: job.descripcion  = data.descripcion
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: int) -> None:
    job = get_job_by_id(db, job_id)
    db.delete(job)
    db.commit()
