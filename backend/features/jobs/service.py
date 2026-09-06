import secrets
from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.core.webhooks import fire_webhook
from backend.features.auth.model import User
from backend.features.historial.service import add_event

from .model import Job
from .schemas import CreateJobRequest, UpdateJobRequest


_ESTADO_LABELS = {
    "pendiente": "Pendiente",
    "en_proceso": "En proceso",
    "control": "Control",
    "listo": "Listo",
    "entregado": "Entregado",
}


def _clamp_progress(value: int) -> int:
    return max(0, min(value, 100))


def _validar_operario_del_tenant(db: Session, tenant_id: int | None, operario_id: int) -> None:
    """Guard clause de aislamiento (mismo patrón que rrhh/service.py): comprueba
    que operario_id pertenece al mismo tenant que quien crea/edita la OT — sin
    esto, un admin podría asignar un trabajo a un operario de otro taller solo
    adivinando su id (IDOR de escritura)."""
    operario = db.query(User).filter(User.id == operario_id, User.tenant_id == tenant_id).first()
    if not operario:
        raise ValueError(f"Operario {operario_id} no encontrado")


def _generate_code(db: Session, tenant_id: int | None = None) -> str:
    """Auto-genera el código ORD-YYYY-NNN si el admin no lo rellena."""
    year = date.today().year
    prefix = f"ORD-{year}-"
    q = db.query(Job).filter(Job.code.like(f"{prefix}%"))
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    count = q.count()
    return f"{prefix}{count + 1:03d}"


def get_all_jobs(db: Session, tenant_id: int | None = None) -> list[Job]:
    # joinedload del operario: sin él, pintar el nombre del operario en cada fila
    # del listado dispara una query por trabajo (N+1). Con él, una sola query con JOIN.
    q = db.query(Job).options(joinedload(Job.operario))
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    return q.order_by(Job.created_at.desc()).all()


def get_jobs_for_user(
    db: Session, user_id: int, tenant_id: int | None = None
) -> list[Job]:
    q = db.query(Job).options(joinedload(Job.operario)).filter(Job.operario_id == user_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    return q.order_by(Job.created_at.desc()).all()


def get_job_by_id(db: Session, job_id: int, tenant_id: int | None = None) -> Job:
    q = db.query(Job).filter(Job.id == job_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise ValueError(f"Trabajo {job_id} no encontrado")
    return job


def get_job_by_code(db: Session, code: str, tenant_id: int | None = None) -> Job:
    q = db.query(Job).filter(Job.code == code.strip().upper())
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise ValueError(f"No se encontró ninguna OT con código {code}")
    if job.estado != "pendiente":
        raise ValueError(
            f"La OT {code} ya está en estado '{job.estado}' y no puede iniciarse"
        )
    return job


def create_job(
    db: Session, data: CreateJobRequest, tenant_id: int | None = None
) -> Job:
    if data.operario_id is not None:
        _validar_operario_del_tenant(db, tenant_id, data.operario_id)

    job = Job(
        tenant_id=tenant_id,
        code=data.code or _generate_code(db, tenant_id),
        titulo=data.titulo,
        cliente=data.cliente,
        estado=data.estado,
        operario_id=data.operario_id,
        fecha_inicio=data.fecha_inicio,
        progreso=_clamp_progress(data.progreso),
        descripcion=data.descripcion,
        public_token=secrets.token_urlsafe(32),
    )
    db.add(job)
    db.flush()  # obtiene job.id sin commitear — evento y job van en el mismo commit
    add_event(
        db,
        job.id,
        "creado",
        f"Trabajo {job.code} creado",
        "Sistema",
        tenant_id=tenant_id,
    )
    db.commit()
    db.refresh(job)
    return job


def _is_starting_job(current_estado: str, new_estado: str) -> bool:
    return current_estado == "pendiente" and new_estado == "en_proceso"


# Strategy Pattern (OCP) — mismo criterio que frontend/modules/core/lib/statusConfig.js
# (campo `next` de STATUS_CONFIG). Cada estado solo puede avanzar al siguiente de la
# cadena; 'entregado' es terminal y no tiene salida. Añadir un estado nuevo es una
# línea aquí, no un if/elif nuevo — igual que en el frontend.
_NEXT_ESTADO = {
    "pendiente": "en_proceso",
    "en_proceso": "control",
    "control": "listo",
    "listo": "entregado",
    "entregado": None,
}


def _is_valid_transition(current_estado: str, new_estado: str) -> bool:
    return _NEXT_ESTADO.get(current_estado) == new_estado


def _requires_admin_approval(current_estado: str, new_estado: str) -> bool:
    """El paso de control de calidad (control -> listo) es cosa del admin/
    encargado, nunca del operario que hizo el trabajo — si no, nadie más
    revisa el trabajo antes de darlo por bueno."""
    return current_estado == "control" and new_estado == "listo"


def update_estado(
    db: Session,
    job_id: int,
    estado: str,
    progreso: int | None = None,
    current_user_id: int | None = None,
    current_user_role: str = "operario",
    current_user_name: str = "Operario",
    tenant_id: int | None = None,
) -> Job:
    job = get_job_by_id(db, job_id, tenant_id)
    # Un operario solo puede modificar sus propios trabajos
    if (
        current_user_role != "admin"
        and job.operario_id
        and job.operario_id != current_user_id
    ):
        raise PermissionError("No tienes permiso para modificar este trabajo")
    current_estado = str(job.estado)
    # Control de calidad: pasar de 'control' a 'listo' solo lo puede hacer un
    # admin — el operario que hizo el trabajo no puede autoaprobarse.
    if current_user_role != "admin" and _requires_admin_approval(current_estado, estado):
        raise PermissionError(
            "Solo un admin puede pasar un trabajo de control a listo"
        )
    # Guard clause: solo se permite avanzar al siguiente estado de la cadena.
    # 'entregado' es terminal — nunca puede volver a un estado anterior ni saltar etapas.
    if not _is_valid_transition(current_estado, estado):
        siguiente = _NEXT_ESTADO.get(current_estado)
        detalle_siguiente = f"'{siguiente}'" if siguiente else "ninguna: es un estado final"
        raise ValueError(
            f"No se puede cambiar de '{current_estado}' a '{estado}'. "
            f"Transición siguiente válida: {detalle_siguiente}"
        )
    # Auto-asignar operario al iniciar: si no tenía asignado, queda bloqueado a quien lo inicia
    if _is_starting_job(job.estado, estado) and not job.operario_id and current_user_id:
        job.operario_id = current_user_id
    if _is_starting_job(job.estado, estado):
        job.urgente = False
        job.motivo_rechazo = None
    job.estado = estado
    # Solo actualizamos el progreso si el llamante lo envía (el Kanban no lo hace).
    if progreso is not None:
        job.progreso = _clamp_progress(progreso)
    add_event(
        db,
        job.id,
        "estado_cambiado",
        f"Estado cambiado a '{_ESTADO_LABELS.get(estado, estado)}'",
        current_user_name,
        tenant_id=tenant_id,
    )
    db.commit()
    db.refresh(job)

    if estado == "listo":
        fire_webhook(
            "job_listo",
            {
                "job_id": job.id,
                "job_code": job.code,
                "titulo": job.titulo,
                "cliente": job.cliente,
                "tenant_id": job.tenant_id,
            },
        )

    return job


def rechazar_job(
    db: Session,
    job_id: int,
    motivo: str,
    tenant_id: int | None = None,
    current_user_name: str = "Admin",
) -> Job:
    """Devuelve un trabajo de 'control' a 'pendiente' por una incidencia de
    calidad. Solo válido desde 'control' — a diferencia de update_estado,
    esta es la única transición hacia atrás permitida, y solo la ejecuta
    un admin (garantizado por el router con require_role("admin"))."""
    job = get_job_by_id(db, job_id, tenant_id)
    if job.estado != "control":
        raise ValueError(
            f"Solo se puede rechazar un trabajo que está en 'control' "
            f"(este está en '{job.estado}')"
        )
    job.estado = "pendiente"
    job.urgente = True
    job.motivo_rechazo = motivo
    add_event(
        db,
        job.id,
        "trabajo_rechazado",
        f"Rechazado: {motivo}",
        current_user_name,
        tenant_id=tenant_id,
    )
    db.commit()
    db.refresh(job)
    return job


def update_job(
    db: Session, job_id: int, data: UpdateJobRequest, tenant_id: int | None = None
) -> Job:
    """Actualización parcial: solo toca los campos que el llamante envió
    (mismo criterio que antes con los `is not None` — un campo ausente y uno
    enviado como null se tratan igual, no se pisa nada). Añadir un campo
    actualizable nuevo a UpdateJobRequest no requiere tocar esta función,
    salvo que necesite una transformación especial como `progreso`."""
    job = get_job_by_id(db, job_id, tenant_id)
    updates = data.model_dump(exclude_none=True)
    if "progreso" in updates:
        updates["progreso"] = _clamp_progress(updates["progreso"])
    if "operario_id" in updates:
        _validar_operario_del_tenant(db, tenant_id, updates["operario_id"])
    for field, value in updates.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: int, tenant_id: int | None = None) -> None:
    job = get_job_by_id(db, job_id, tenant_id)
    db.delete(job)
    db.commit()


def get_or_create_public_token(
    db: Session, job_id: int, tenant_id: int | None = None
) -> str:
    """Devuelve el token público del job, generándolo si aún no tiene uno."""
    job = get_job_by_id(db, job_id, tenant_id)
    if job.public_token is None:  # type: ignore[comparison-overlap]
        job.public_token = secrets.token_urlsafe(32)  # type: ignore[assignment]
        db.commit()
        db.refresh(job)
    return str(job.public_token)


def search_jobs(
    db: Session,
    q: str,
    user_id: int | None,
    user_role: str,
    tenant_id: int | None = None,
) -> list[Job]:
    """Búsqueda rápida — ILIKE en título, cliente y código OT. Limitado a 10 resultados."""
    term = f"%{q.strip()}%"
    query = db.query(Job).options(joinedload(Job.operario)).filter(
        or_(
            Job.titulo.ilike(term),
            Job.cliente.ilike(term),
            Job.code.ilike(term),
        )
    )
    if tenant_id is not None:
        query = query.filter(Job.tenant_id == tenant_id)
    # El operario solo puede ver sus propios trabajos
    if user_role != "admin":
        query = query.filter(Job.operario_id == user_id)
    return query.order_by(Job.created_at.desc()).limit(10).all()
