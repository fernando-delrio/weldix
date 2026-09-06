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


# ── Dimensionado del pool de conexiones ──────────────────────────────────────
# Sin estos valores SQLAlchemy aplica sus defaults: pool_size=5 + max_overflow=10,
# o sea 15 conexiones. Pero FastAPI atiende cada endpoint síncrono (`def`) en un
# hilo del threadpool de anyio — 40 por defecto — y cada petición retiene una
# conexión durante toda su vida vía Depends(get_db). 40 hilos peleando por 15
# conexiones significa que el sobrante espera hasta agotar pool_timeout y muere
# con TimeoutError (visto en producción: 500 en /rrhh/solicitudes, 18/08/2026).
# main.py limita el threadpool por debajo de POOL_CAPACITY para que el exceso
# haga cola en el threadpool (barato) en vez de reventar contra la base de datos.
POOL_SIZE = 10
MAX_OVERFLOW = 10
POOL_CAPACITY = POOL_SIZE + MAX_OVERFLOW

# Fallar rápido: con el pool saturado es mejor devolver el error en 10s que
# dejar al operario 30s (el default) mirando una pantalla congelada.
POOL_TIMEOUT = 10

# Neon y PgBouncer cierran las conexiones ociosas alrededor de los 5 minutos.
# Reciclarlas antes evita sacar del pool una conexión ya muerta.
POOL_RECYCLE = 280


def _build_engine():
    url = _normalize_db_url(settings.database_url)

    # SQLite (dev y tests) no usa QueuePool, así que los parámetros de
    # dimensionado no aplican — pasarlos revienta con TypeError.
    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    # psycopg3 activa prepared statements de servidor tras 5 usos de la
    # misma query (prepare_threshold=5 por defecto). El endpoint "pooled"
    # de Neon usa PgBouncer en modo transacción: cada transacción puede
    # acabar en una conexión física distinta del servidor real, así que un
    # prepared statement creado en una no existe en otra — psycopg lanza
    # "prepared statement ... does not exist". Se desactiva explícitamente.
    return create_engine(
        url,
        connect_args={"prepare_threshold": None},
        pool_pre_ping=True,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_timeout=POOL_TIMEOUT,
        pool_recycle=POOL_RECYCLE,
    )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
