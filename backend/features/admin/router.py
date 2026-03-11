from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import require_role
from backend.features.auth.model import User
from .schemas import AdminDashboardResponse
from . import service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return service.get_admin_dashboard(db)
