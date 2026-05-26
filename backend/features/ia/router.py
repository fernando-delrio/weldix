from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_active_trial
from backend.features.auth.model import User
from backend.features.jobs.model import Job
from backend.features.rrhh import service as rrhh_service
from backend.features.rrhh.model import SolicitudAusencia
from backend.features.stock.model import Material

from . import service
from .schemas import ConsultaRequest, ConsultaResponse

router = APIRouter(
    prefix="/ia",
    tags=["ia"],
    dependencies=[Depends(require_active_trial)],
)


def _build_user_context(db: Session, user: User) -> str:
    """Construye el contexto personal del usuario para la IA."""
    lines = [
        f"Usuario activo: {user.full_name}",
        f"Rol: {'Administrador' if user.role == 'admin' else 'Operario'}",
    ]

    # Saldo de vacaciones — solo para operarios
    if user.role == "operario":
        try:
            saldo = rrhh_service.get_saldo_vacaciones(db, user.id, date.today().year)
            lines.append(
                f"Vacaciones {saldo.year}: {saldo.dias_disponibles} días disponibles "
                f"de {saldo.dias_totales} totales "
                f"({saldo.dias_aprobados} aprobados, {saldo.dias_pendientes} en espera)"
            )
        except Exception:
            pass

        # Solicitudes pendientes del operario
        pendientes = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.operario_id == user.id,
                SolicitudAusencia.estado == "pendiente",
            )
            .count()
        )
        if pendientes:
            lines.append(
                f"Solicitudes de ausencia pendientes de revisión: {pendientes}"
            )

    # Admin: resumen de solicitudes pendientes del equipo
    if user.role == "admin":
        total_pendientes = (
            db.query(SolicitudAusencia)
            .filter(SolicitudAusencia.estado == "pendiente")
            .count()
        )
        if total_pendientes:
            lines.append(
                f"Solicitudes de ausencia del equipo pendientes de revisión: {total_pendientes}"
            )

    return "\n".join(lines)


@router.post("/consulta", response_model=ConsultaResponse)
def consulta(
    body: ConsultaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stock_items = db.query(Material).order_by(Material.name).all()
    jobs_items = (
        db.query(Job)
        .options(joinedload(Job.operario))
        .order_by(Job.created_at.desc())
        .all()
    )

    # Contexto personal del usuario (perfil + RRHH)
    user_context = _build_user_context(db, current_user)

    # Combinar contexto de sección + contexto de trabajo (legacy)
    seccion_ctx = body.contexto_seccion or body.contexto_trabajo

    try:
        respuesta = service.consultar(
            body.mensaje,
            [m.model_dump() for m in body.historial] if body.historial else None,
            stock_items=stock_items,
            jobs_items=jobs_items,
            user_context=user_context,
            contexto_seccion=seccion_ctx,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=502, detail="Error al contactar con la IA. Inténtalo de nuevo."
        )
    return ConsultaResponse(respuesta=respuesta)
