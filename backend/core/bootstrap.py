import logging
from datetime import date

from backend.features.auth.model import User
from backend.features.jobs.model import Job
from backend.features.stock.model import Material

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
    {"titulo": "Estructura metalica nave industrial", "cliente": "Construcciones Lopez S.L.", "estado": "en_proceso", "fecha_inicio": date.today(),         "progreso": 65,  "descripcion": None},
    {"titulo": "Escalera acero inoxidable",           "cliente": "Reformas Garcia",           "estado": "pendiente",  "fecha_inicio": date(2024, 3, 21),    "progreso": 0,   "descripcion": None},
    {"titulo": "Deposito agua 5000L",                 "cliente": "Agro Hermanos Perez",       "estado": "control",    "fecha_inicio": date(2024, 3, 20),    "progreso": 90,  "descripcion": None},
    {"titulo": "Barandilla terraza inox",             "cliente": "Comunidad Residencial Norte","estado": "listo",     "fecha_inicio": date(2024, 3, 15),    "progreso": 100, "descripcion": None},
    {"titulo": "Tolva acero carbono 3T",              "cliente": "Agro Hermanos Perez",       "estado": "entregado",  "fecha_inicio": date(2024, 3, 10),    "progreso": 100, "descripcion": None},
    {"titulo": "Soporte maquinaria CNC",              "cliente": "Talleres Mendez",            "estado": "pendiente",  "fecha_inicio": date(2024, 3, 28),    "progreso": 0,   "descripcion": None},
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


_SEED_STOCK = [
    {"name": "Varilla soldadura 3.2mm", "quantity": 12,  "minimum": 50,  "unit": "ud"},
    {"name": "Chapa acero 3mm",         "quantity": 36,  "minimum": 10,  "unit": "kg"},
    {"name": "Electrodo basico 4mm",    "quantity": 80,  "minimum": 100, "unit": "ud"},
    {"name": "Hilo MIG 0.8mm",          "quantity": 3,   "minimum": 5,   "unit": "kg"},
    {"name": "Disco corte 230mm",       "quantity": 25,  "minimum": 20,  "unit": "ud"},
    {"name": "Gas argon 99.9%",         "quantity": 2,   "minimum": 3,   "unit": "bote"},
]


def seed_stock() -> None:
    db = SessionLocal()
    try:
        if db.query(Material).count() > 0:
            return
        for data in _SEED_STOCK:
            db.add(Material(**data))
        db.commit()
    finally:
        db.close()


def run_startup_tasks() -> None:
    init_schema()
    seed_admin()
    seed_jobs()
    seed_stock()
