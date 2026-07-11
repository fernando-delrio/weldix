import logging
from datetime import date

from sqlalchemy import text

from backend.features.auth.model import Tenant, User
from backend.features.equipos.model import (  # noqa: F401 — necesario para create_all
    Equipo,
)
from backend.features.fichaje.model import (  # noqa: F401 — necesario para create_all
    Fichaje,
)
from backend.features.fotos.model import Foto  # noqa: F401 — necesario para create_all
from backend.features.historial.model import (  # noqa: F401 — necesario para create_all
    JobEvent,
)
from backend.features.jobs.model import Job
from backend.features.registro_horas.model import (  # noqa: F401 — necesario para create_all
    RegistroHoras,
)
from backend.features.nominas.model import Nomina  # noqa: F401 — necesario para create_all
from backend.features.rrhh.model import (  # noqa: F401 — necesario para create_all
    AccidenteLaboral,
    Certificado,
    ConfiguracionLaboral,
    DocumentoJustificante,
    EpiEntrega,
    Festivo,
    PermisoTrabajoEspecial,
    ReconocimientoMedico,
    SolicitudAusencia,
    SolicitudCambioTurno,
    TurnoAsignado,
)
from backend.features.stock.model import Material

from .config import settings
from .database import Base, SessionLocal, engine
from .security import hash_password

logger = logging.getLogger(__name__)


def _sqlite_table_columns(conn, table_name: str) -> set[str]:
    rows = conn.execute(text(f'PRAGMA table_info("{table_name}")')).fetchall()
    return {row[1] for row in rows}


def _sqlite_add_column_if_missing(
    conn, table_name: str, column_name: str, ddl_fragment: str
) -> None:
    columns = _sqlite_table_columns(conn, table_name)
    if column_name in columns:
        return
    conn.execute(
        text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {ddl_fragment}')
    )
    logger.info("SQLite schema sync: added %s.%s", table_name, column_name)


def _sync_sqlite_dev_schema() -> None:
    """
    Compatibilidad de desarrollo para SQLite sin Alembic.
    Si el archivo DB viene de una versión antigua, añade columnas nuevas
    (solo additive changes) para evitar caídas en startup.
    """
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as conn:
        table_names = {
            row[0]
            for row in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()
        }

        additions = [
            ("users", "tenant_id", "INTEGER"),
            ("users", "worker_number", "INTEGER"),
            ("users", "onboarding_done", "BOOLEAN NOT NULL DEFAULT 0"),
            ("users", "reset_token", "VARCHAR(64)"),
            ("users", "reset_token_expires_at", "DATETIME"),
            ("tenants", "trial_expires_at", "DATETIME"),
            ("jobs", "tenant_id", "INTEGER"),
            ("jobs", "is_demo", "BOOLEAN NOT NULL DEFAULT 0"),
            ("jobs", "public_token", "VARCHAR(64)"),
            ("stock", "tenant_id", "INTEGER"),
            ("stock", "is_demo", "BOOLEAN NOT NULL DEFAULT 0"),
            ("fotos", "tenant_id", "INTEGER"),
            ("fichajes", "tenant_id", "INTEGER"),
            ("registro_horas", "tenant_id", "INTEGER"),
            ("equipos", "tenant_id", "INTEGER"),
            ("equipos", "is_demo", "BOOLEAN NOT NULL DEFAULT 0"),
            ("job_events", "tenant_id", "INTEGER"),
            ("configuracion_laboral", "tenant_id", "INTEGER"),
            ("solicitudes_ausencia", "tenant_id", "INTEGER"),
        ]

        for table_name, column_name, ddl_fragment in additions:
            if table_name not in table_names:
                continue
            _sqlite_add_column_if_missing(conn, table_name, column_name, ddl_fragment)


def _sync_postgres_schema() -> None:
    """
    Additive schema sync para PostgreSQL en producción.
    Usa ADD COLUMN IF NOT EXISTS — idempotente y sin riesgo de pérdida de datos.
    NO usa create_all() ni Alembic: solo añade columnas que faltan al arrancar.
    Se ejecuta siempre (independiente de auto_create_tables) en bases no-SQLite.
    """
    if settings.database_url.startswith("sqlite"):
        return

    additions = [
        ("jobs", "public_token", "VARCHAR(64)"),
        ("users", "reset_token", "VARCHAR(64)"),
        ("users", "reset_token_expires_at", "TIMESTAMPTZ"),
    ]

    with engine.begin() as conn:
        for table_name, column_name, ddl_fragment in additions:
            conn.execute(
                text(
                    f'ALTER TABLE "{table_name}" '
                    f'ADD COLUMN IF NOT EXISTS "{column_name}" {ddl_fragment}'
                )
            )
            logger.info("PostgreSQL schema sync: ensured %s.%s", table_name, column_name)

        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_jobs_public_token "
                'ON "jobs" (public_token)'
            )
        )
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_reset_token "
                'ON "users" (reset_token)'
            )
        )


def init_schema() -> None:
    if not settings.auto_create_tables:
        return
    Base.metadata.create_all(bind=engine)
    _sync_sqlite_dev_schema()


def _get_or_create_default_tenant(db) -> Tenant:
    """Obtiene o crea el tenant por defecto para el entorno de desarrollo."""
    tenant = db.query(Tenant).filter(Tenant.slug == "weldix-default").first()
    if not tenant:
        tenant = Tenant(
            nombre="Weldix (Dev)",
            slug="weldix-default",
            plan="pro",
        )
        db.add(tenant)
        db.flush()
    return tenant


def _assign_missing_worker_numbers(db) -> None:
    """
    Asigna numero correlativo a operarios sin numero dentro de su tenant.
    Mantiene los existentes y completa los huecos para reporting anual.
    """
    changed = False

    tenant_ids = [
        row[0]
        for row in db.query(User.tenant_id)
        .filter(User.role == "operario", User.tenant_id.isnot(None))
        .distinct()
        .all()
        if row[0] is not None
    ]

    for tenant_id in tenant_ids:
        max_row = (
            db.query(User.worker_number)
            .filter(
                User.tenant_id == tenant_id,
                User.role == "operario",
                User.worker_number.isnot(None),
            )
            .order_by(User.worker_number.desc())
            .first()
        )
        next_number = (max_row[0] if max_row and max_row[0] is not None else 0) + 1

        missing = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_id,
                User.role == "operario",
                User.worker_number.is_(None),
            )
            .order_by(User.id.asc())
            .all()
        )
        for operario in missing:
            operario.worker_number = next_number
            next_number += 1
            changed = True

    if changed:
        db.commit()


def seed_admin() -> None:
    if not settings.seed_admin_on_startup:
        return

    if not settings.seed_admin_email or not settings.seed_admin_password:
        logger.warning(
            "seed_admin_on_startup=true but seed_admin_email/password are missing. Skipping admin seed."
        )
        return

    db = SessionLocal()
    try:
        existing = (
            db.query(User)
            .filter(User.email == settings.seed_admin_email.lower().strip())
            .first()
        )
        if existing:
            # Si el admin ya existe pero no tiene tenant_id, asignárselo
            if existing.tenant_id is None:
                tenant = _get_or_create_default_tenant(db)
                existing.tenant_id = tenant.id
                # Asignar tenant a todos los datos huérfanos (migraciones de datos existentes)
                db.query(Job).filter(Job.tenant_id.is_(None)).update(
                    {"tenant_id": tenant.id}
                )
                db.query(Material).filter(Material.tenant_id.is_(None)).update(
                    {"tenant_id": tenant.id}
                )
                db.query(Fichaje).filter(Fichaje.tenant_id.is_(None)).update(
                    {"tenant_id": tenant.id}
                )
                db.query(Equipo).filter(Equipo.tenant_id.is_(None)).update(
                    {"tenant_id": tenant.id}
                )
                db.query(User).filter(User.tenant_id.is_(None)).update(
                    {"tenant_id": tenant.id}
                )
                db.commit()
            _assign_missing_worker_numbers(db)
            return

        tenant = _get_or_create_default_tenant(db)
        admin = User(
            tenant_id=tenant.id,
            email=settings.seed_admin_email.lower().strip(),
            full_name=settings.seed_admin_full_name,
            role="admin",
            password_hash=hash_password(settings.seed_admin_password),
        )
        db.add(admin)
        db.commit()
        _assign_missing_worker_numbers(db)
    finally:
        db.close()


_SEED_JOBS = [
    {
        "code": "ORD-2026-001",
        "titulo": "Estructura metalica nave industrial",
        "cliente": "Construcciones Lopez S.L.",
        "estado": "en_proceso",
        "fecha_inicio": date(2026, 3, 18),
        "progreso": 65,
        "descripcion": None,
    },
    {
        "code": "ORD-2026-002",
        "titulo": "Escalera acero inoxidable",
        "cliente": "Reformas Garcia",
        "estado": "pendiente",
        "fecha_inicio": date(2026, 3, 21),
        "progreso": 0,
        "descripcion": None,
    },
    {
        "code": "ORD-2026-003",
        "titulo": "Deposito agua 5000L",
        "cliente": "Agro Hermanos Perez",
        "estado": "control",
        "fecha_inicio": date(2026, 3, 20),
        "progreso": 90,
        "descripcion": None,
    },
    {
        "code": "ORD-2026-004",
        "titulo": "Barandilla terraza inox",
        "cliente": "Comunidad Residencial Norte",
        "estado": "listo",
        "fecha_inicio": date(2026, 3, 15),
        "progreso": 100,
        "descripcion": None,
    },
    {
        "code": "ORD-2026-005",
        "titulo": "Tolva acero carbono 3T",
        "cliente": "Agro Hermanos Perez",
        "estado": "entregado",
        "fecha_inicio": date(2026, 3, 10),
        "progreso": 100,
        "descripcion": None,
    },
    {
        "code": "ORD-2026-006",
        "titulo": "Soporte maquinaria CNC",
        "cliente": "Talleres Mendez",
        "estado": "pendiente",
        "fecha_inicio": date(2026, 3, 28),
        "progreso": 0,
        "descripcion": None,
    },
]


def seed_jobs() -> None:
    if not settings.seed_demo_data:
        return
    db = SessionLocal()
    try:
        if db.query(Job).count() > 0:
            return
        tenant = _get_or_create_default_tenant(db)
        for data in _SEED_JOBS:
            db.add(Job(tenant_id=tenant.id, **data))
        db.commit()
    finally:
        db.close()


_SEED_STOCK = [
    {"name": "Varilla soldadura 3.2mm", "quantity": 12, "minimum": 50, "unit": "ud"},
    {"name": "Chapa acero 3mm", "quantity": 36, "minimum": 10, "unit": "kg"},
    {"name": "Electrodo basico 4mm", "quantity": 80, "minimum": 100, "unit": "ud"},
    {"name": "Hilo MIG 0.8mm", "quantity": 3, "minimum": 5, "unit": "kg"},
    {"name": "Disco corte 230mm", "quantity": 25, "minimum": 20, "unit": "ud"},
    {"name": "Gas argon 99.9%", "quantity": 2, "minimum": 3, "unit": "bote"},
]


def seed_stock() -> None:
    if not settings.seed_demo_data:
        return
    db = SessionLocal()
    try:
        if db.query(Material).count() > 0:
            return
        tenant = _get_or_create_default_tenant(db)
        for data in _SEED_STOCK:
            db.add(Material(tenant_id=tenant.id, **data))
        db.commit()
    finally:
        db.close()


def _check_security_warnings() -> None:
    is_production = settings.environment.lower() in {"prod", "production"}
    insecure_jwt_secret = settings.jwt_secret_key == "dev-secret-change-me"

    if is_production and insecure_jwt_secret:
        raise RuntimeError(
            "JWT_SECRET_KEY usa el valor inseguro de desarrollo. "
            "Define una clave segura antes de arrancar en produccion."
        )
    if is_production and settings.auto_create_tables:
        raise RuntimeError(
            "AUTO_CREATE_TABLES debe ser false en produccion. "
            "Usa Alembic para aplicar cambios de schema."
        )
    if is_production and "*" in settings.allowed_hosts:
        raise RuntimeError("ALLOWED_HOSTS no puede contener '*' en produccion.")
    if is_production and any(
        origin.startswith(("http://localhost", "http://127.0.0.1"))
        for origin in settings.allowed_origins
    ):
        raise RuntimeError(
            "ALLOWED_ORIGINS contiene origenes locales en produccion. "
            "Configura el dominio HTTPS del frontend."
        )

    if insecure_jwt_secret:
        logger.warning(
            "⚠️  JWT_SECRET_KEY usa el valor por defecto de desarrollo. "
            "Define una clave segura en .env antes de desplegar a producción."
        )


_SEED_EQUIPOS = [
    {
        "nombre": "Soldadora MIG Lincoln 300A",
        "tipo": "Soldadora",
        "estado": "operativo",
        "intervalo_dias": 90,
    },
    {
        "nombre": "Cortadora plasma CNC",
        "tipo": "Cortadora",
        "estado": "en_revision",
        "intervalo_dias": 60,
    },
    {
        "nombre": "Grua puente 5T",
        "tipo": "Elevacion",
        "estado": "operativo",
        "intervalo_dias": 180,
    },
    {
        "nombre": "Soldadora TIG Fronius 200",
        "tipo": "Soldadora",
        "estado": "operativo",
        "intervalo_dias": 90,
    },
    {
        "nombre": "Amoladora angular 230mm",
        "tipo": "Herramienta",
        "estado": "averiado",
        "intervalo_dias": 30,
    },
]


def seed_equipos() -> None:
    if not settings.seed_demo_data:
        return
    db = SessionLocal()
    try:
        if db.query(Equipo).count() > 0:
            return
        tenant = _get_or_create_default_tenant(db)
        for data in _SEED_EQUIPOS:
            db.add(Equipo(tenant_id=tenant.id, **data))
        db.commit()
    finally:
        db.close()


def run_startup_tasks() -> None:
    _check_security_warnings()
    init_schema()
    _sync_postgres_schema()
    seed_admin()
    seed_jobs()
    seed_stock()
    seed_equipos()
    db = SessionLocal()
    try:
        _assign_missing_worker_numbers(db)
    finally:
        db.close()
