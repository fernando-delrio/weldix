from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from .schemas import CreateJobRequest, JobResponse, UpdateJobRequest, UpdateJobStatusRequest
from . import service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    jobs = service.get_all_jobs(db)
    return [JobResponse.from_orm_job(j) for j in jobs]


@router.post("", response_model=JobResponse, status_code=201)
def create_job(
    body: CreateJobRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    job = service.create_job(db, body)
    return JobResponse.from_orm_job(job)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        job = service.get_job_by_id(db, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.patch("/{job_id}/status", response_model=JobResponse)
def update_status(
    job_id: int,
    body: UpdateJobStatusRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        job = service.update_job_status(db, job_id, body.status, body.progress)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    body: UpdateJobRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        job = service.update_job(db, job_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        service.delete_job(db, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
