from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User

from .service import generate_job_pdf

router = APIRouter(prefix="/trabajos", tags=["pdf"])


@router.get("/{job_id}/pdf", summary="Descargar parte de trabajo en PDF")
def download_job_pdf(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_trial),
):
    try:
        pdf_bytes = generate_job_pdf(db, job_id, tenant_id=current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    filename = f"parte-trabajo-{job_id}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
