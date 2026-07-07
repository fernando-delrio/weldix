from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings


def _normalize_db_url(url: str) -> str:
    # Render provides postgresql:// — SQLAlchemy needs postgresql+psycopg:// for psycopg3
    if url.startswith("postgres://"):
        url = "postgresql+psycopg" + url[len("postgres"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg" + url[len("postgresql"):]
    return url


def _build_engine():
    url = _normalize_db_url(settings.database_url)
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
