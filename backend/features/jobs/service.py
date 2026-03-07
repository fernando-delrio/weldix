from sqlalchemy.orm import Session

from .model import Job
from .schemas import CreateJobRequest, UpdateJobRequest


def _clamp_progress(value: int) -> int:
    return max(0, min(value, 100))


def get_all_jobs(db: Session) -> list[Job]:
    return db.query(Job).order_by(Job.created_at.desc()).all()


def get_job_by_id(db: Session, job_id: int) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Trabajo {job_id} no encontrado")
    return job


def create_job(db: Session, data: CreateJobRequest) -> Job:
    job = Job(
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


def update_estado(db: Session, job_id: int, estado: str, progreso: int) -> Job:
    job = get_job_by_id(db, job_id)
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
