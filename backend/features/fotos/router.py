from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User

from . import service
from .schemas import FotoResponse

router = APIRouter(
    tags=["fotos"],
    dependencies=[Depends(require_active_trial)],
)


def _base_url(request: Request) -> str:
    """Construye la URL base del servidor para generar las URLs públicas de las fotos."""
    return str(request.base_url).rstrip("/")


@router.post("/trabajos/{job_id}/fotos", response_model=FotoResponse, status_code=201)
async def upload_foto(
    job_id: int,
    request: Request,
    file: UploadFile = File(...),
    etiqueta: str = Form(default="durante"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        foto = await service.guardar_foto(
            db, job_id, current_user.id, current_user.tenant_id, file, etiqueta
        )
    except ValueError as exc:
        status_code = (
            404 if "Trabajo" in str(exc) and "no encontrado" in str(exc) else 400
        )
        raise HTTPException(status_code=status_code, detail=str(exc))
    return FotoResponse.from_orm_foto(foto, _base_url(request))


@router.get("/trabajos/{job_id}/fotos", response_model=list[FotoResponse])
def list_fotos(
    job_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fotos = service.get_fotos_para_trabajo(db, job_id, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return [FotoResponse.from_orm_foto(f, _base_url(request)) for f in fotos]


@router.get("/fotos/{foto_id}/archivo")
def get_foto_archivo(
    foto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        foto = service.get_foto_by_id(db, foto_id, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    archivo = Path(foto.filepath)
    if not archivo.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(archivo)


@router.delete("/fotos/{foto_id}", status_code=204)
def delete_foto(
    foto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        service.delete_foto(
            db, foto_id, current_user.id, current_user.role, current_user.tenant_id
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
