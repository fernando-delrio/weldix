from sqlalchemy.orm import Session

from backend.features.auth.model import User
from backend.features.jobs.model import Job

_ESTADO_TONE = {
    'pendiente':  'warning',
    'en_proceso': 'info',
    'control':    'secondary',
    'listo':      'success',
    'entregado':  'neutral',
}


def _operario_name(users_by_id: dict, operario_id: int | None) -> str | None:
    if not operario_id:
        return None
    user = users_by_id.get(operario_id)
    return (user.full_name or user.email) if user else None


def _job_item(job: Job, users_by_id: dict) -> dict:
    return {
        'id':            job.id,
        'code':          job.code,
        'titulo':        job.titulo,
        'cliente':       job.cliente,
        'estado':        job.estado,
        'tone':          _ESTADO_TONE.get(job.estado, 'neutral'),
        'progreso':      job.progreso,
        'operario_id':   job.operario_id,
        'operario_name': _operario_name(users_by_id, job.operario_id),
        'fecha_inicio':  str(job.fecha_inicio) if job.fecha_inicio else None,
    }


def _user_item(user: User) -> dict:
    return {
        'id':        user.id,
        'email':     user.email,
        'full_name': user.full_name,
        'role':      user.role,
    }


def get_admin_dashboard(db: Session) -> dict:
    jobs  = db.query(Job).order_by(Job.created_at.desc()).all()
    users = db.query(User).order_by(User.id).all()

    users_by_id = {u.id: u for u in users}

    return {
        'metrics': {
            'total_jobs':      len(jobs),
            'pendiente':       sum(1 for j in jobs if j.estado == 'pendiente'),
            'en_proceso':      sum(1 for j in jobs if j.estado == 'en_proceso'),
            'control':         sum(1 for j in jobs if j.estado == 'control'),
            'listo':           sum(1 for j in jobs if j.estado == 'listo'),
            'entregado':       sum(1 for j in jobs if j.estado == 'entregado'),
            'total_operarios': sum(1 for u in users if u.role == 'operario'),
        },
        'jobs':  [_job_item(j, users_by_id) for j in jobs],
        'users': [_user_item(u) for u in users],
    }
