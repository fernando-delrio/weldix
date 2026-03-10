from datetime import date, datetime

from sqlalchemy.orm import Session

from backend.features.auth.model import User
from backend.features.jobs.model import Job
from backend.features.stock.model import Material
from backend.features.stock.schemas import StockItemResponse

_DIAS  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

_ESTADO_TONE = {
    'pendiente':  'warning',
    'en_proceso': 'info',
    'control':    'secondary',
    'listo':      'success',
    'entregado':  'neutral',
}

_STAGES = ['Inicio', 'Proceso', 'Control', 'Listo', 'Entregado']

_ESTADO_STAGE = {
    'pendiente':  0,
    'en_proceso': 1,
    'control':    2,
    'listo':      3,
    'entregado':  4,
}


def _format_date_es(dt: datetime) -> str:
    return f"{_DIAS[dt.weekday()]}, {dt.day:02d} {_MESES[dt.month - 1]}. {dt.year}"


def _greeting_label(hour: int) -> str:
    if hour < 12:
        return 'Buenos días'
    if hour < 20:
        return 'Buenas tardes'
    return 'Buenas noches'


def _shift_label(hour: int) -> str:
    return 'Turno mañana' if hour < 14 else 'Turno tarde'


def _due_info(fecha_inicio: date | None) -> tuple[str, str]:
    if not fecha_inicio:
        return 'Sin fecha', 'neutral'
    delta = (fecha_inicio - date.today()).days
    label = f"Entrega: {fecha_inicio.day:02d} {_MESES[fecha_inicio.month - 1]}"
    if delta <= 0:
        return 'Entrega hoy', 'danger'
    if delta <= 3:
        return label, 'warning'
    return label, 'neutral'


def _build_active_job(job: Job) -> dict:
    due_label, due_tone = _due_info(job.fecha_inicio)
    return {
        'id':            job.id,
        'status':        job.estado,
        'status_tone':   _ESTADO_TONE.get(job.estado, 'neutral'),
        'due_label':     due_label,
        'due_tone':      due_tone,
        'title':         job.titulo,
        'client':        job.cliente,
        'progress':      job.progreso,
        'stages':        _STAGES,
        'current_stage': _ESTADO_STAGE.get(job.estado, 0),
    }


def _build_today_job(job: Job) -> dict:
    due_label, _ = _due_info(job.fecha_inicio)
    return {
        'id':     job.id,
        'title':  job.titulo,
        'due':    due_label,
        'status': job.estado,
        'tone':   _ESTADO_TONE.get(job.estado, 'neutral'),
    }


def get_worker_dashboard(db: Session, user: User) -> dict:
    now = datetime.now()

    jobs = (
        db.query(Job)
        .filter((Job.operario_id == user.id) | (Job.operario_id == None))  # noqa: E711
        .order_by(Job.created_at.desc())
        .all()
    )

    active_job = next((j for j in jobs if j.estado in ('en_proceso', 'control')), None)
    # Solo pendientes explícitamente asignados al usuario (Fase 4 añadirá asignación real)
    today_jobs = [j for j in jobs if j.estado == 'pendiente' and j.operario_id == user.id][:5]

    stock = db.query(Material).order_by(Material.name).all()

    return {
        'greeting': {
            'greeting_label': _greeting_label(now.hour),
            'operator_name':  user.full_name or user.email,
            'date_label':     _format_date_es(now),
            'shift_label':    _shift_label(now.hour),
        },
        'metrics': [
            {'key': 'pending',     'label': 'Pendientes',   'value': sum(1 for j in jobs if j.estado == 'pendiente'),                    'tone': 'warning'},
            {'key': 'in_progress', 'label': 'En proceso',   'value': sum(1 for j in jobs if j.estado == 'en_proceso'),                   'tone': 'info'},
            {'key': 'week',        'label': 'Esta semana',  'value': sum(1 for j in jobs if j.estado in ('listo', 'entregado')),          'tone': 'success'},
        ],
        'active_job': _build_active_job(active_job) if active_job else None,
        'today_jobs': [_build_today_job(j) for j in today_jobs],
        'stock':      [StockItemResponse.from_orm_material(m) for m in stock],
    }
