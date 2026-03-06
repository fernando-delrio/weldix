from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from .model import Job
from .schemas import CreateJobRequest, UpdateJobRequest


def _current_year() -> int:
    return datetime.now(timezone.utc).year

def _generate_code(job_id: int) -> str:
    return f"ORD-{_current_year()}-{job_id:03d}"

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
        code="TEMP",
        title=data.title,
        client=data.client,
        type=data.type,
        area=data.area,
        due_date=data.due_date,
        status=data.status,
        progress=_clamp_progress(data.progress),
    )
    db.add(job)
    db.flush()  # genera el id sin hacer commit
    job.code = _generate_code(job.id)
    db.commit()
    db.refresh(job)
    return job


def update_job_status(db: Session, job_id: int, status: str, progress: int) -> Job:
    job = get_job_by_id(db, job_id)
    job.status   = status
    job.progress = _clamp_progress(progress)
    db.commit()
    db.refresh(job)
    return job


def update_job(db: Session, job_id: int, data: UpdateJobRequest) -> Job:
    job = get_job_by_id(db, job_id)
    if data.title    is not None: job.title    = data.title
    if data.client   is not None: job.client   = data.client
    if data.type     is not None: job.type     = data.type
    if data.area     is not None: job.area     = data.area
    if data.due_date is not None: job.due_date = data.due_date
    if data.progress is not None: job.progress = _clamp_progress(data.progress)
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: int) -> None:
    job = get_job_by_id(db, job_id)
    db.delete(job)
    db.commit()
