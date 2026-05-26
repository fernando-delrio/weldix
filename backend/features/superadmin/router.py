from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db

from . import service

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


def _require_superadmin(x_superadmin_key: str = Header(..., alias="x-superadmin-key")) -> None:
    if not settings.superadmin_key:
        raise HTTPException(503, "Super-admin panel not configured (SUPERADMIN_KEY missing)")
    if x_superadmin_key != settings.superadmin_key:
        raise HTTPException(401, "Invalid superadmin key")


@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    _: None = Depends(_require_superadmin),
):
    return service.get_global_metrics(db)


@router.get("/workspaces")
def get_workspaces(
    db: Session = Depends(get_db),
    _: None = Depends(_require_superadmin),
):
    return service.list_workspaces(db)
