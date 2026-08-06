from datetime import date, timedelta

from sqlalchemy.orm import Session, joinedload

from backend.features.auth.model import User
from backend.features.equipos.model import Equipo
from backend.features.fichaje.model import Fichaje
from backend.features.jobs.model import Job
from backend.features.nominas.model import Nomina
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
            saldo = rrhh_service.get_saldo_vacaciones(db, user.tenant_id, user.id, date.today().year)
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


def _fecha_de(fichaje: Fichaje) -> date:
    """Devuelve la fecha del inicio, tolerando datetime naive o tz-aware."""
    inicio = fichaje.inicio
    return inicio.date() if hasattr(inicio, "date") else inicio


def build_equipos_context(db: Session, user: User) -> str:
    """Estado de la maquinaria del taller, resaltando el mantenimiento vencido."""
    equipos = (
        db.query(Equipo)
        .filter(_tenant_filter(Equipo, user.tenant_id))
        .order_by(Equipo.nombre)
        .all()
    )
    if not equipos:
        return ""

    today = date.today()
    lines = []
    for e in equipos:
        flag = ""
        if e.ultimo_mantenimiento and e.intervalo_dias and e.intervalo_dias > 0:
            dias = (today - e.ultimo_mantenimiento).days
            if dias > e.intervalo_dias:
                flag = (
                    f" ⚠ MANTENIMIENTO VENCIDO (hace {dias} días, "
                    f"intervalo {e.intervalo_dias} días)"
                )
        tipo = f" [{e.tipo}]" if e.tipo else ""
        lines.append(f"- {e.nombre}{tipo}: {e.estado}{flag}")
    return "\n".join(lines)


def build_fichaje_context(db: Session, user: User) -> str:
    """Operario: su jornada activa + horas de la semana. Admin: jornadas abiertas del equipo."""
    if user.role == "operario":
        activa = (
            db.query(Fichaje)
            .filter(
                Fichaje.operario_id == user.id,
                Fichaje.fin.is_(None),
                _tenant_filter(Fichaje, user.tenant_id),
            )
            .first()
        )
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        cerrados = (
            db.query(Fichaje)
            .filter(
                Fichaje.operario_id == user.id,
                Fichaje.horas.isnot(None),
                _tenant_filter(Fichaje, user.tenant_id),
            )
            .all()
        )
        horas_semana = sum(f.horas for f in cerrados if _fecha_de(f) >= week_start)
        estado = (
            "Tienes una jornada ABIERTA ahora mismo (aún no has fichado la salida)."
            if activa
            else "No tienes ninguna jornada abierta en este momento."
        )
        return f"{estado}\nHoras fichadas esta semana: {round(horas_semana, 1)} h"

    abiertas = (
        db.query(Fichaje)
        .filter(Fichaje.fin.is_(None), _tenant_filter(Fichaje, user.tenant_id))
        .count()
    )
    return f"Jornadas abiertas ahora mismo en el taller: {abiertas}"


def build_nominas_context(db: Session, user: User) -> str:
    """Operario: nóminas disponibles y la última. Admin: total subido al taller."""
    if user.role == "operario":
        nominas = (
            db.query(Nomina)
            .filter(
                Nomina.operario_id == user.id,
                _tenant_filter(Nomina, user.tenant_id),
            )
            .order_by(Nomina.year.desc(), Nomina.month.desc())
            .all()
        )
        if not nominas:
            return "No tienes nóminas subidas todavía. El administrador las publica cada mes."
        ultima = nominas[0]
        return (
            f"Tienes {len(nominas)} nómina(s) disponibles para descargar. "
            f"La más reciente es la de {ultima.month:02d}/{ultima.year}."
        )

    total = db.query(Nomina).filter(_tenant_filter(Nomina, user.tenant_id)).count()
    return (
        f"Nóminas subidas al taller: {total}. Como administrador subes las nóminas "
        "y cada operario descarga las suyas."
    )


def build_ai_context(db: Session, user: User) -> dict:
    return {
        "stock_items": get_stock_context_items(db, user),
        "jobs_items": get_job_context_items(db, user),
        "user_context": build_user_context(db, user),
        "equipos_context": build_equipos_context(db, user),
        "fichaje_context": build_fichaje_context(db, user),
        "nominas_context": build_nominas_context(db, user),
    }
