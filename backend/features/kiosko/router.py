"""
Router del Modo Kiosko.

- POST /kiosko/generar-link  → admin: obtiene el link de la tablet (con auth)
- GET  /kiosko/{token}       → público: nombre del taller para pintar la pantalla
- POST /kiosko/{token}/fichar → público: ficha por número de operario (toggle)

Regla de orden (CLAUDE.md §8.1): la ruta literal /generar-link se registra ANTES
que /{token}, o FastAPI interpretaría "generar-link" como un token.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.features.auth.dependencies import require_role
from backend.features.auth.model import User

from . import service
from .schemas import (
    FicharKioskoRequest,
    FicharKioskoResponse,
    KioskInfoResponse,
    KioskLinkResponse,
)

router = APIRouter(prefix="/kiosko", tags=["kiosko"])


@router.post("/generar-link", response_model=KioskLinkResponse)
def generar_link(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: obtiene (o genera) el enlace del kiosko para su taller."""
    token = service.generate_kiosk_link(db, current_user.tenant_id)
    return KioskLinkResponse(token=token, url=f"{settings.frontend_url}/kiosko/{token}")


@router.get("/{token}", response_model=KioskInfoResponse)
def kiosk_info(token: str, db: Session = Depends(get_db)):
    """Público: valida el token y devuelve el nombre del taller."""
    try:
        tenant = service.get_tenant_by_token(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return KioskInfoResponse(tenant_nombre=str(tenant.nombre))


@router.post("/{token}/fichar", response_model=FicharKioskoResponse)
def fichar(token: str, body: FicharKioskoRequest, db: Session = Depends(get_db)):
    """Público: ficha por PIN. Toggle entrada/salida."""
    try:
        result = service.fichar_por_pin(db, token, body.pin)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FicharKioskoResponse(**result)
