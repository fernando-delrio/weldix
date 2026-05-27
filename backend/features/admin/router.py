from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import require_active_trial, require_role
from backend.features.auth.model import User

from . import service
from .schemas import AdminDashboardResponse

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_active_trial)],
)


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return service.get_admin_dashboard(db, tenant_id=current_user.tenant_id)


@router.get("/operarios")
def list_operarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Lista ligera de operarios del tenant — id + nombre — para selectores."""
    operarios = (
        db.query(User.id, User.full_name)
        .filter(User.tenant_id == current_user.tenant_id, User.role == "operario")
        .order_by(User.full_name)
        .all()
    )
    return [{"id": op.id, "full_name": op.full_name} for op in operarios]


@router.delete("/demo-data")
def delete_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if current_user.tenant_id is None:
        raise HTTPException(400, "Este usuario no pertenece a ningún taller")
    return service.clear_demo_data(db, current_user.tenant_id)
