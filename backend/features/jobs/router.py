from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from . import service
from .schemas import (
    CreateJobRequest,
    JobResponse,
    UpdateEstadoRequest,
    UpdateJobRequest,
)

router = APIRouter(prefix="/trabajos", tags=["trabajos"])


@router.get("", response_model=list[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tid = current_user.tenant_id
    jobs = (
        service.get_all_jobs(db, tenant_id=tid)
        if current_user.role == "admin"
        else service.get_jobs_for_user(db, current_user.id, tenant_id=tid)
    )
    return [JobResponse.from_orm_job(j) for j in jobs]


@router.post("", response_model=JobResponse, status_code=201)
def create_job(
    body: CreateJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    job = service.create_job(db, body, tenant_id=current_user.tenant_id)
    return JobResponse.from_orm_job(job)


@router.get("/buscar-rapido", response_model=list[JobResponse])
def search_jobs_global(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = service.search_jobs(
        db, q, current_user.id, current_user.role, tenant_id=current_user.tenant_id
    )
    return [JobResponse.from_orm_job(j) for j in jobs]


@router.get("/buscar", response_model=JobResponse)
def find_job_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        job = service.get_job_by_code(db, code, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        job = service.get_job_by_id(db, job_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    if (
        current_user.role != "admin"
        and job.operario_id
        and job.operario_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="No tienes acceso a este trabajo")
    return JobResponse.from_orm_job(job)


@router.patch("/{job_id}/estado", response_model=JobResponse)
def update_estado(
    job_id: int,
    body: UpdateEstadoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        job = service.update_estado(
            db,
            job_id,
            body.estado,
            body.progreso,
            current_user.id,
            current_user.role,
            current_user.full_name,
            tenant_id=current_user.tenant_id,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    body: UpdateJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        job = service.update_job(db, job_id, body, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return JobResponse.from_orm_job(job)


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        service.delete_job(db, job_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
