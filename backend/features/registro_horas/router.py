from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from . import service
from .schemas import HorasOTResponse, IniciarRegistroRequest, RegistroHorasResponse

router = APIRouter(tags=["registro-horas"])


@router.post(
    "/registro-horas/iniciar", response_model=RegistroHorasResponse, status_code=201
)
def iniciar_registro(
    body: IniciarRegistroRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario empieza a trabajar en una OT — abre el contador de tiempo."""
    try:
        r = service.iniciar_registro(db, body.job_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return RegistroHorasResponse.from_orm(r)


@router.post(
    "/registro-horas/{registro_id}/finalizar", response_model=RegistroHorasResponse
)
def finalizar_registro(
    registro_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario para de trabajar en la OT — cierra el contador y calcula las horas."""
    try:
        r = service.finalizar_registro(db, registro_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return RegistroHorasResponse.from_orm(r)


@router.get("/registro-horas/activo", response_model=RegistroHorasResponse | None)
def get_registro_activo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registro de horas abierto del operario actual, o null si no hay ninguno."""
    r = service.get_registro_activo(db, current_user.id)
    return RegistroHorasResponse.from_orm(r) if r else None


@router.get("/trabajos/{job_id}/horas", response_model=HorasOTResponse)
def horas_ot(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Resumen de horas de una OT: total + desglose por operario."""
    resumen = service.get_resumen_horas_ot(db, job_id)
    return HorasOTResponse(
        job_id=resumen["job_id"],
        job_code=resumen["job_code"],
        total_horas=resumen["total_horas"],
        por_operario=resumen["por_operario"],
        registros=[RegistroHorasResponse.from_orm(r) for r in resumen["registros"]],
    )
