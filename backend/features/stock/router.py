from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from .schemas import CreateMaterialRequest, StockItemResponse, UpdateMaterialRequest
from . import service

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=list[StockItemResponse])
def list_stock(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return [StockItemResponse.from_orm_material(m) for m in service.get_all_materials(db)]


@router.post("", response_model=StockItemResponse, status_code=201)
def create_material(
    body: CreateMaterialRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return StockItemResponse.from_orm_material(service.create_material(db, body))


@router.patch("/{material_id}", response_model=StockItemResponse)
def update_material(
    material_id: int,
    body: UpdateMaterialRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return StockItemResponse.from_orm_material(service.update_material(db, material_id, body))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        service.delete_material(db, material_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
