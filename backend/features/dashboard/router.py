from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User

from . import service
from .schemas import WorkerDashboardResponse

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_active_trial)],
)


@router.get("/worker", response_model=WorkerDashboardResponse)
def get_worker_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_worker_dashboard(db, current_user)
