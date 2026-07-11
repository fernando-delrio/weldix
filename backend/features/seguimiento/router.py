"""
Endpoint público de seguimiento — sin autenticación.

El cliente final accede a /seguimiento/{token} para ver el estado
de su trabajo sin necesitar cuenta. El token es un UUID opaco
generado al crear la OT.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.jobs.model import Job

router = APIRouter(prefix="/seguimiento", tags=["seguimiento"])

_ESTADO_LABEL = {
    "pendiente": "Pendiente",
    "en_proceso": "En proceso",
    "control": "Control de calidad",
    "listo": "Listo para recoger",
    "entregado": "Entregado",
}

_ESTADO_STEP = {
    "pendiente": 1,
    "en_proceso": 2,
    "control": 3,
    "listo": 4,
    "entregado": 5,
}


class PublicJobStatus(BaseModel):
    code: str
    titulo: str
    estado: str
    estado_label: str
    estado_step: int
    progreso: int


@router.get("/{token}", response_model=PublicJobStatus)
def get_public_status(token: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.public_token == token).first()
    if not job:
        raise HTTPException(
            status_code=404,
            detail="Enlace no válido o trabajo no encontrado",
        )
    estado = str(job.estado)
    return PublicJobStatus(
        code=str(job.code or f"#{job.id}"),
        titulo=str(job.titulo),
        estado=estado,
        estado_label=_ESTADO_LABEL.get(estado, estado),
        estado_step=_ESTADO_STEP.get(estado, 0),
        progreso=int(job.progreso or 0),
    )
