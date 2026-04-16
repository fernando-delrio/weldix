from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user
from backend.features.auth.model import User

from .schemas import JobEventResponse
from .service import get_events_by_job

router = APIRouter(prefix="/trabajos", tags=["historial"])


@router.get("/{trabajo_id}/historial", response_model=list[JobEventResponse])
def get_historial(
    trabajo_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return get_events_by_job(db, trabajo_id)
