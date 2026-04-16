from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from . import service
from .schemas import FichajeResponse, ForzarCierreRequest

router = APIRouter(prefix="/fichajes", tags=["fichajes"])


@router.post("/iniciar", response_model=FichajeResponse, status_code=201)
def iniciar_jornada(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario inicia su jornada laboral del día."""
    try:
        fichaje = service.iniciar_jornada(db, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.post("/{fichaje_id}/finalizar", response_model=FichajeResponse)
def finalizar_jornada(
    fichaje_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario cierra su jornada. Las horas se calculan automáticamente."""
    try:
        fichaje = service.finalizar_jornada(db, fichaje_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.get("/activo", response_model=FichajeResponse | None)
def get_jornada_activa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve la jornada abierta del operario actual, o null si no hay ninguna."""
    fichaje = service.get_jornada_activa(db, current_user.id)
    return FichajeResponse.from_orm_fichaje(fichaje) if fichaje else None


@router.get("/mis-jornadas", response_model=list[FichajeResponse])
def mis_jornadas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historial de jornadas del operario actual."""
    fichajes = service.get_fichajes_operario(db, current_user.id)
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]


@router.get("", response_model=list[FichajeResponse])
def list_all_fichajes(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: todos los fichajes de todos los operarios."""
    fichajes = service.get_todos_los_fichajes(db)
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]


@router.post("/{fichaje_id}/forzar-cierre", response_model=FichajeResponse)
def forzar_cierre(
    fichaje_id: int,
    body: ForzarCierreRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: cierra manualmente una jornada huérfana con las horas reales declaradas."""
    try:
        fichaje = service.forzar_cierre_jornada(db, fichaje_id, body.horas_reales)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.get("/operario/{operario_id}", response_model=list[FichajeResponse])
def fichajes_por_operario(
    operario_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: fichajes de un operario concreto."""
    fichajes = service.get_fichajes_operario(db, operario_id)
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]
