import logging
from datetime import date

from backend.features.auth.model import User
from backend.features.jobs.model import Job

from .config import settings
from .database import Base, SessionLocal, engine
from .security import hash_password

logger = logging.getLogger(__name__)


def init_schema() -> None:
    if not settings.auto_create_tables:
        return
    Base.metadata.create_all(bind=engine)


def seed_admin() -> None:
    if not settings.seed_admin_on_startup:
        return

    if not settings.seed_admin_email or not settings.seed_admin_password:
        logger.warning("seed_admin_on_startup=true but seed_admin_email/password are missing. Skipping admin seed.")
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.seed_admin_email.lower().strip()).first()
        if existing:
            return

        admin = User(
            email=settings.seed_admin_email.lower().strip(),
            full_name=settings.seed_admin_full_name,
            role="admin",
            password_hash=hash_password(settings.seed_admin_password),
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


_SEED_JOBS = [
    {"code": "ORD-2024-087", "title": "Estructura metalica nave industrial", "client": "Construcciones Lopez S.L.", "type": "Estructura Metalica", "area": "Soldadura estructural", "due_date": date.today(), "status": "En proceso", "progress": 65},
    {"code": "ORD-2024-089", "title": "Escalera acero inoxidable",           "client": "Reformas Garcia",            "type": "Inox",                 "area": "Soldadura fina",        "due_date": date(2024, 3, 21), "status": "Pendiente",  "progress": 0},
    {"code": "ORD-2024-085", "title": "Deposito agua 5000L",                 "client": "Agro Hermanos Perez",        "type": "Caldereria Industrial", "area": "Caldereria",            "due_date": date(2024, 3, 20), "status": "Control",    "progress": 90},
    {"code": "ORD-2024-081", "title": "Barandilla terraza inox",             "client": "Comunidad Residencial Norte","type": "Inox",                 "area": "Soldadura fina",        "due_date": date(2024, 3, 15), "status": "Completado", "progress": 100},
    {"code": "ORD-2024-078", "title": "Tolva acero carbono 3T",              "client": "Agro Hermanos Perez",        "type": "Caldereria Industrial", "area": "Caldereria",            "due_date": date(2024, 3, 10), "status": "Completado", "progress": 100},
    {"code": "ORD-2024-091", "title": "Soporte maquinaria CNC",              "client": "Talleres Mendez",            "type": "Estructura Metalica",  "area": "Soldadura estructural", "due_date": date(2024, 3, 28), "status": "Pendiente",  "progress": 0},
]


def seed_jobs() -> None:
    db = SessionLocal()
    try:
        if db.query(Job).count() > 0:
            return
        for data in _SEED_JOBS:
            db.add(Job(**data))
        db.commit()
    finally:
        db.close()


def run_startup_tasks() -> None:
    init_schema()
    seed_admin()
    seed_jobs()
