from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial, require_role
from backend.features.auth.model import User

from . import service
from .schemas import NominaResponse

router = APIRouter(
    prefix="/nominas",
    tags=["nominas"],
    dependencies=[Depends(require_active_trial)],
)


# ─── Admin: subir nómina ──────────────────────────────────────────────────────


@router.post("/upload", response_model=NominaResponse, status_code=201)
async def upload_nomina(
    operario_id: int = Form(...),
    year: int = Form(...),
    month: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: sube el PDF de la nómina de un operario para un mes concreto."""
    try:
        nomina = await service.subir_nomina(
            db,
            tenant_id=current_user.tenant_id,
            operario_id=operario_id,
            uploaded_by_id=current_user.id,
            year=year,
            month=month,
            file=file,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return NominaResponse.from_orm_nomina(nomina)


# ─── Admin: listar todas ──────────────────────────────────────────────────────


@router.get("", response_model=list[NominaResponse])
def list_nominas(
    operario_id: int | None = Query(default=None),
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: lista todas las nóminas del taller, con filtros opcionales."""
    nominas = service.list_nominas_admin(
        db, current_user.tenant_id, operario_id=operario_id, year=year
    )
    return [NominaResponse.from_orm_nomina(n) for n in nominas]


# ─── Admin: eliminar ─────────────────────────────────────────────────────────


@router.delete("/{nomina_id}", status_code=204)
def delete_nomina(
    nomina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: elimina una nómina y su archivo."""
    try:
        service.delete_nomina(db, nomina_id, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ─── Operario: mis nóminas ────────────────────────────────────────────────────


@router.get("/mias", response_model=list[NominaResponse])
def mis_nominas(
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Operario: sus propias nóminas. Admin también puede llamar a este endpoint."""
    nominas = service.list_nominas_operario(
        db, current_user.tenant_id, current_user.id, year=year
    )
    return [NominaResponse.from_orm_nomina(n) for n in nominas]


# ─── Descarga del PDF ─────────────────────────────────────────────────────────


@router.get("/{nomina_id}/descargar")
def descargar_nomina(
    nomina_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Descarga el PDF de la nómina.
    Admin puede descargar cualquier nómina del tenant.
    Operario solo puede descargar las suyas.
    """
    try:
        nomina = service.get_nomina_by_id(db, nomina_id, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if current_user.role != "admin" and nomina.operario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta nómina")

    archivo = Path(nomina.filepath)
    if not archivo.exists():
        raise HTTPException(status_code=404, detail="El archivo no está disponible")

    return FileResponse(
        archivo,
        media_type="application/pdf",
        filename=nomina.filename,
        headers={"Content-Disposition": f'attachment; filename="{nomina.filename}"'},
    )
