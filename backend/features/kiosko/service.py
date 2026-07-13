"""
Modo Kiosko — fichaje desde una tablet compartida del taller, sin login individual.

El operario teclea su número y ficha. La tablet se identifica con un token opaco
del taller (kiosk_token), igual que el portal público de seguimiento con su token.
Reutiliza el service de fichaje para la lógica de jornada (no la duplica).
"""
import secrets

from sqlalchemy.orm import Session

from backend.features.auth.model import Tenant, User
from backend.features.fichaje import service as fichaje_service


def generate_kiosk_link(db: Session, tenant_id: int | None) -> str:
    """Devuelve el token de kiosko del taller, generándolo si aún no tiene uno."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise ValueError("Taller no encontrado")
    if tenant.kiosk_token is None:  # type: ignore[comparison-overlap]
        tenant.kiosk_token = secrets.token_urlsafe(32)  # type: ignore[assignment]
        db.commit()
        db.refresh(tenant)
    return str(tenant.kiosk_token)


def get_tenant_by_token(db: Session, token: str) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.kiosk_token == token).first()  # type: ignore[arg-type]
    if not tenant:
        raise ValueError("Kiosko no válido")
    return tenant


def fichar_por_pin(db: Session, token: str, pin: str) -> dict:
    """
    Ficha por PIN. Es un toggle: si hay jornada abierta la cierra (salida),
    si no la abre (entrada). Vale para operarios y admins (ambos tienen PIN).
    El PIN se busca SOLO dentro del taller del token → nunca se cruza entre talleres.
    """
    tenant = get_tenant_by_token(db, token)

    user = (
        db.query(User)
        .filter(User.tenant_id == tenant.id, User.pin == pin)
        .first()
    )
    if not user:
        raise ValueError("PIN no válido")

    nombre = user.full_name or user.email
    activa = fichaje_service.get_jornada_activa(db, user.id)

    if activa:
        fichaje = fichaje_service.finalizar_jornada(db, activa.id, user.id)
        return {
            "operario": nombre,
            "accion": "salida",
            "hora": fichaje.fin,
            "horas": fichaje.horas,
        }

    fichaje = fichaje_service.iniciar_jornada(db, user.id, tenant_id=tenant.id)
    return {
        "operario": nombre,
        "accion": "entrada",
        "hora": fichaje.inicio,
        "horas": None,
    }
