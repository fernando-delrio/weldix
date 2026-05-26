from datetime import date

from sqlalchemy.orm import Session, joinedload

from backend.features.auth.model import User
from backend.features.jobs.model import Job
from backend.features.rrhh import service as rrhh_service
from backend.features.rrhh.model import SolicitudAusencia
from backend.features.stock.model import Material


def _tenant_filter(model, tenant_id: int | None):
    return model.tenant_id == tenant_id if tenant_id is not None else True


def build_user_context(db: Session, user: User) -> str:
    lines = [
        f"Usuario activo: {user.full_name}",
        f"Rol: {'Administrador' if user.role == 'admin' else 'Operario'}",
    ]

    if user.role == "operario":
        try:
            saldo = rrhh_service.get_saldo_vacaciones(db, user.id, date.today().year)
            lines.append(
                f"Vacaciones {saldo.year}: {saldo.dias_disponibles} dias disponibles "
                f"de {saldo.dias_totales} totales "
                f"({saldo.dias_aprobados} aprobados, {saldo.dias_pendientes} en espera)"
            )
        except Exception:
            pass

        pendientes = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.operario_id == user.id,
                SolicitudAusencia.estado == "pendiente",
                _tenant_filter(SolicitudAusencia, user.tenant_id),
            )
            .count()
        )
        if pendientes:
            lines.append(
                f"Solicitudes de ausencia pendientes de revision: {pendientes}"
            )

    if user.role == "admin":
        total_pendientes = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.estado == "pendiente",
                _tenant_filter(SolicitudAusencia, user.tenant_id),
            )
            .count()
        )
        if total_pendientes:
            lines.append(
                f"Solicitudes de ausencia del equipo pendientes de revision: {total_pendientes}"
            )

    return "\n".join(lines)


def get_stock_context_items(db: Session, user: User) -> list[Material]:
    return (
        db.query(Material)
        .filter(_tenant_filter(Material, user.tenant_id))
        .order_by(Material.name)
        .all()
    )


def get_job_context_items(db: Session, user: User) -> list[Job]:
    return (
        db.query(Job)
        .options(joinedload(Job.operario))
        .filter(_tenant_filter(Job, user.tenant_id))
        .order_by(Job.created_at.desc())
        .all()
    )


def build_ai_context(db: Session, user: User) -> dict:
    return {
        "stock_items": get_stock_context_items(db, user),
        "jobs_items": get_job_context_items(db, user),
        "user_context": build_user_context(db, user),
    }
