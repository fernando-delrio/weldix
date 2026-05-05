from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import require_role
from backend.features.auth.model import User

from . import service
from .schemas import AdminDashboardResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return service.get_admin_dashboard(db, tenant_id=current_user.tenant_id)


@router.delete("/demo-data")
def delete_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if current_user.tenant_id is None:
        raise HTTPException(400, "Este usuario no pertenece a ningún taller")
    return service.clear_demo_data(db, current_user.tenant_id)
