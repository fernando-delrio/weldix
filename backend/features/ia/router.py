from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user
from backend.features.auth.model import User
from backend.features.jobs.model import Job
from backend.features.stock.model import Material

from . import service
from .schemas import ConsultaRequest, ConsultaResponse

router = APIRouter(prefix="/ia", tags=["ia"])


@router.post("/consulta", response_model=ConsultaResponse)
def consulta(
    body: ConsultaRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stock_items = db.query(Material).order_by(Material.name).all()
    jobs_items  = db.query(Job).options(joinedload(Job.operario)).order_by(Job.created_at.desc()).all()

    try:
        respuesta = service.consultar(
            body.mensaje,
            [m.model_dump() for m in body.historial] if body.historial else None,
            stock_items=stock_items,
            jobs_items=jobs_items,
            contexto_trabajo=body.contexto_trabajo,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Error al contactar con la IA. Inténtalo de nuevo.")
    return ConsultaResponse(respuesta=respuesta)
