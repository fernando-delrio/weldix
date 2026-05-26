from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User

from . import service
from .context_providers import build_ai_context
from .schemas import ConsultaRequest, ConsultaResponse

router = APIRouter(
    prefix="/ia",
    tags=["ia"],
    dependencies=[Depends(require_active_trial)],
)


@router.post("/consulta", response_model=ConsultaResponse)
def consulta(
    body: ConsultaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_context = build_ai_context(db, current_user)
    seccion_ctx = body.contexto_seccion or body.contexto_trabajo

    try:
        respuesta = service.consultar(
            body.mensaje,
            [m.model_dump() for m in body.historial] if body.historial else None,
            stock_items=ai_context["stock_items"],
            jobs_items=ai_context["jobs_items"],
            user_context=ai_context["user_context"],
            contexto_seccion=seccion_ctx,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=502, detail="Error al contactar con la IA. Intentalo de nuevo."
        )
    return ConsultaResponse(respuesta=respuesta)
