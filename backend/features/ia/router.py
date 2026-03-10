from fastapi import APIRouter, Depends, HTTPException

from backend.features.auth.dependencies import get_current_user
from backend.features.auth.model import User

from . import service
from .schemas import ConsultaRequest, ConsultaResponse

router = APIRouter(prefix="/ia", tags=["ia"])


@router.post("/consulta", response_model=ConsultaResponse)
def consulta(body: ConsultaRequest, _: User = Depends(get_current_user)):
    try:
        respuesta = service.consultar(
            body.mensaje,
            [m.model_dump() for m in body.historial] if body.historial else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Error al contactar con la IA. Inténtalo de nuevo.")
    return ConsultaResponse(respuesta=respuesta)
