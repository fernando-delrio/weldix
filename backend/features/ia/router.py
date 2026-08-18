import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User

from . import service
from .context_providers import build_ai_context
from .schemas import ConsultaRequest, ConsultaResponse, LandingChatRequest

router = APIRouter(
    prefix="/ia",
    tags=["ia"],
    dependencies=[Depends(require_active_trial)],
)

# Router público (sin auth) para el chat de venta del landing.
public_router = APIRouter(prefix="/ia", tags=["ia"])

# Rate limit en memoria por IP: el endpoint es público y llama a Mistral (cuesta).
_landing_hits: dict[str, list[float]] = {}


def _landing_rate_ok(ip: str, max_hits: int = 20, window_s: int = 600) -> bool:
    now = time.time()
    hits = [t for t in _landing_hits.get(ip, []) if now - t < window_s]
    if len(hits) >= max_hits:
        _landing_hits[ip] = hits
        return False
    hits.append(now)
    _landing_hits[ip] = hits
    return True


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
            equipos_context=ai_context["equipos_context"],
            fichaje_context=ai_context["fichaje_context"],
            nominas_context=ai_context["nominas_context"],
            contexto_seccion=seccion_ctx,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=502, detail="Error al contactar con la IA. Intentalo de nuevo."
        )
    return ConsultaResponse(respuesta=respuesta)


@public_router.post("/landing-chat", response_model=ConsultaResponse)
def landing_chat(body: LandingChatRequest, request: Request):
    """Chat de venta del landing. Público, sin datos de ningún taller. Rate-limited por IP."""
    ip = request.client.host if request.client else "unknown"
    if not _landing_rate_ok(ip):
        raise HTTPException(
            status_code=429,
            detail="Has hecho muchas preguntas. Escríbenos a hola@weldix.es y te ayudamos en persona.",
        )

    historial = (
        [m.model_dump() for m in body.historial[-10:]] if body.historial else None
    )
    try:
        respuesta = service.consultar_landing(body.mensaje, historial)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=502, detail="Error al contactar con la IA. Inténtalo de nuevo."
        )
    return ConsultaResponse(respuesta=respuesta)
