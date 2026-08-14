from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import (
    get_current_user,
    require_active_trial,
    require_role,
)
from backend.features.auth.model import User

from . import service
from .schemas import (
    CreateEquipoRequest,
    EquipoResponse,
    UpdateEquipoEstadoRequest,
    UpdateEquipoRequest,
)

router = APIRouter(
    prefix="/equipos",
    tags=["equipos"],
    dependencies=[Depends(require_active_trial)],
)


@router.get("", response_model=list[EquipoResponse])
def list_equipos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_all_equipos(db, tenant_id=current_user.tenant_id)


@router.get("/alertas", response_model=list[EquipoResponse])
def list_alertas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_equipos_con_alerta(db, tenant_id=current_user.tenant_id)


@router.post("", response_model=EquipoResponse, status_code=201)
def create_equipo(
    body: CreateEquipoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return service.create_equipo(db, body, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{equipo_id}", response_model=EquipoResponse)
def get_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return service.get_equipo_by_id(db, equipo_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{equipo_id}", response_model=EquipoResponse)
def update_equipo(
    equipo_id: int,
    body: UpdateEquipoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return service.update_equipo(
            db, equipo_id, body, tenant_id=current_user.tenant_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{equipo_id}/estado", response_model=EquipoResponse)
def update_estado(
    equipo_id: int,
    body: UpdateEquipoEstadoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        service.get_equipo_by_id(db, equipo_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    try:
        return service.update_estado_equipo(
            db, equipo_id, body.estado, tenant_id=current_user.tenant_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{equipo_id}", status_code=204)
def delete_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        service.delete_equipo(db, equipo_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
