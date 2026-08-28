from collections import defaultdict
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.features.auth.model import User
from backend.features.fichaje.model import Fichaje
from backend.features.jobs.model import Job
from backend.features.rrhh.model import SolicitudAusencia
from backend.features.rrhh.schemas import TIPOS_AUSENCIA

_ESTADO_TONE = {
    "pendiente": "warning",
    "en_proceso": "info",
    "control": "secondary",
    "listo": "success",
    "entregado": "neutral",
}


def _operario_name(users_by_id: dict, operario_id: int | None) -> str | None:
    if not operario_id:
        return None
    user = users_by_id.get(operario_id)
    return (user.full_name or user.email) if user else None


def _job_item(job: Job, users_by_id: dict) -> dict:
    return {
        "id": job.id,
        "code": job.code,
        "titulo": job.titulo,
        "cliente": job.cliente,
        "estado": job.estado,
        "tone": _ESTADO_TONE.get(job.estado, "neutral"),
        "progreso": job.progreso,
        "operario_id": job.operario_id,
        "operario_name": _operario_name(users_by_id, job.operario_id),
        "fecha_inicio": str(job.fecha_inicio) if job.fecha_inicio else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "urgente": job.urgente,
        "motivo_rechazo": job.motivo_rechazo,
    }


def _user_item(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "worker_number": user.worker_number,
        "pin": user.pin,
    }


def _fichaje_brief(fichaje: Fichaje) -> dict:
    return {
        "id": fichaje.id,
        "inicio": fichaje.inicio,
        "fin": fichaje.fin,
        "horas": fichaje.horas,
    }


def get_admin_dashboard(db: Session, tenant_id: int | None = None) -> dict:
    q_jobs = db.query(Job)
    q_users = db.query(User)
    if tenant_id is not None:
        q_jobs = q_jobs.filter(Job.tenant_id == tenant_id)
        q_users = q_users.filter(User.tenant_id == tenant_id)

    q_fichajes = db.query(Fichaje)
    q_solicitudes = db.query(SolicitudAusencia)
    if tenant_id is not None:
        q_fichajes = q_fichajes.filter(Fichaje.tenant_id == tenant_id)
        q_solicitudes = q_solicitudes.filter(SolicitudAusencia.tenant_id == tenant_id)

    jobs = q_jobs.order_by(Job.created_at.desc()).all()
    users = sorted(q_users.all(), key=lambda u: (u.full_name or u.email or "").lower())
    users_by_id = {u.id: u for u in users}

    fichajes = q_fichajes.order_by(Fichaje.inicio.desc()).limit(800).all()
    fichajes_by_operario: dict[int, list[dict]] = defaultdict(list)
    for fichaje in fichajes:
        if len(fichajes_by_operario[fichaje.operario_id]) >= 20:
            continue
        fichajes_by_operario[fichaje.operario_id].append(_fichaje_brief(fichaje))

    active_by_operario: dict[int, list[dict]] = defaultdict(list)
    for job in jobs:
        if job.operario_id is None or job.estado not in {"en_proceso", "control"}:
            continue
        if len(active_by_operario[job.operario_id]) >= 5:
            continue
        active_by_operario[job.operario_id].append(
            {
                "id": job.id,
                "code": job.code,
                "titulo": job.titulo,
                "estado": job.estado,
                "tone": _ESTADO_TONE.get(job.estado, "neutral"),
            }
        )

    # Tarjeta "quién está en el taller" (Inicio del admin): fichaje abierto ahora
    # mismo, o ausencia aprobada que cubre hoy. Query aparte (no reutiliza el
    # `fichajes` de arriba, que está recortado a 800 filas por rendimiento) para
    # que un fichaje abierto nunca se pierda por ese recorte.
    q_open_fichajes = db.query(Fichaje).filter(Fichaje.fin.is_(None))
    if tenant_id is not None:
        q_open_fichajes = q_open_fichajes.filter(Fichaje.tenant_id == tenant_id)
    en_taller_ids = {f.operario_id for f in q_open_fichajes.all()}

    hoy = date.today()
    ausencias_hoy = q_solicitudes.filter(
        SolicitudAusencia.estado == "aprobada",
        SolicitudAusencia.fecha_inicio <= hoy,
        SolicitudAusencia.fecha_fin >= hoy,
    ).all()
    ausente_hoy_by_operario = {
        a.operario_id: TIPOS_AUSENCIA.get(a.tipo, a.tipo) for a in ausencias_hoy
    }

    pending_vac_rows = (
        q_solicitudes.with_entities(
            SolicitudAusencia.operario_id,
            func.count(SolicitudAusencia.id),
            func.coalesce(func.sum(SolicitudAusencia.dias_solicitados), 0),
        )
        .filter(SolicitudAusencia.estado == "pendiente")
        .group_by(SolicitudAusencia.operario_id)
        .all()
    )
    pending_vac_by_operario = {
        operario_id: {"count": int(count), "dias": int(dias)}
        for operario_id, count, dias in pending_vac_rows
    }

    users_payload = []
    for user in users:
        item = _user_item(user)
        vac = pending_vac_by_operario.get(user.id, {"count": 0, "dias": 0})
        item["pending_vacaciones_count"] = vac["count"]
        item["pending_vacaciones_dias"] = vac["dias"]
        item["active_jobs"] = active_by_operario.get(user.id, [])
        item["active_jobs_count"] = len(item["active_jobs"])
        item["fichajes"] = fichajes_by_operario.get(user.id, [])
        item["en_taller"] = user.id in en_taller_ids
        item["ausente_hoy"] = ausente_hoy_by_operario.get(user.id)
        users_payload.append(item)

    return {
        "metrics": {
            "total_jobs": len(jobs),
            "pendiente": sum(1 for j in jobs if j.estado == "pendiente"),
            "en_proceso": sum(1 for j in jobs if j.estado == "en_proceso"),
            "control": sum(1 for j in jobs if j.estado == "control"),
            "listo": sum(1 for j in jobs if j.estado == "listo"),
            "entregado": sum(1 for j in jobs if j.estado == "entregado"),
            "total_operarios": sum(1 for u in users if u.role == "operario"),
        },
        "jobs": [_job_item(j, users_by_id) for j in jobs],
        "users": users_payload,
    }
