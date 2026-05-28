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
    AlbaranLineResult,
    ConsumeMaterialRequest,
    CreateMaterialRequest,
    GenerarVariantesRequest,
    GenerarVariantesResponse,
    ParseAlbaranRequest,
    RestockMaterialRequest,
    StockItemResponse,
    UpdateMaterialRequest,
)

router = APIRouter(
    prefix="/stock",
    tags=["stock"],
    dependencies=[Depends(require_active_trial)],
)


@router.get("", response_model=list[StockItemResponse])
def list_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [
        StockItemResponse.from_orm_material(m)
        for m in service.get_all_materials(db, tenant_id=current_user.tenant_id)
    ]


@router.post("", response_model=StockItemResponse, status_code=201)
def create_material(
    body: CreateMaterialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return StockItemResponse.from_orm_material(
        service.create_material(db, body, tenant_id=current_user.tenant_id)
    )


@router.post(
    "/generar-variantes", response_model=GenerarVariantesResponse, status_code=201
)
def generar_variantes(
    body: GenerarVariantesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return service.generar_variantes(db, body, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/parse-albaran", response_model=list[AlbaranLineResult])
def parse_albaran(
    body: ParseAlbaranRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return service.parse_albaran_with_ia(db, body.texto, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Error al contactar con la IA. Inténtalo de nuevo.")


@router.post("/{material_id}/consume", response_model=StockItemResponse)
def consume_material(
    material_id: int,
    body: ConsumeMaterialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return StockItemResponse.from_orm_material(
            service.consume_material(
                db, material_id, body.consumed, tenant_id=current_user.tenant_id
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/{material_id}/restock", response_model=StockItemResponse)
def restock_material(
    material_id: int,
    body: RestockMaterialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return StockItemResponse.from_orm_material(
            service.restock_material(
                db, material_id, body.cantidad, tenant_id=current_user.tenant_id
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{material_id}", response_model=StockItemResponse)
def update_material(
    material_id: int,
    body: UpdateMaterialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        return StockItemResponse.from_orm_material(
            service.update_material(
                db, material_id, body, tenant_id=current_user.tenant_id
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        service.delete_material(db, material_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
