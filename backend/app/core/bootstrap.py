import logging

from app.features.auth.model import User

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


def run_startup_tasks() -> None:
    init_schema()
    seed_admin()
