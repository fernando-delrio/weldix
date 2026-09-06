"""
Dimensionado del pool de conexiones y su relación con el threadpool de FastAPI.

Contexto (bug real, 18/08/2026): /rrhh/solicitudes devolvió 500 con
"QueuePool limit of size 5 overflow 10 reached, connection timed out".

La causa no era una query lenta ni una fuga de sesiones, sino un desajuste
estructural entre dos números que nadie había puesto a mano:

  - SQLAlchemy, sin configurar, da pool_size=5 + max_overflow=10 → 15 conexiones.
  - FastAPI atiende cada endpoint síncrono (`def`) en un hilo de anyio — 40 por
    defecto — y cada petición retiene una conexión durante toda su vida vía
    Depends(get_db).

40 hilos peleando por 15 conexiones: el sobrante espera en el pool hasta agotar
pool_timeout y muere con TimeoutError. Estos tests fijan la invariante que lo
impide, para que un refactor futuro no vuelva a dejar los dos números sueltos.
"""

import anyio
from anyio import to_thread

from backend.core.database import (
    MAX_OVERFLOW,
    POOL_CAPACITY,
    POOL_RECYCLE,
    POOL_SIZE,
    POOL_TIMEOUT,
    _build_engine,
)
from backend.main import _HTTP_THREAD_LIMIT, _limit_threadpool_to_pool_capacity

_POSTGRES_URL = "postgresql://user:pass@ep-fake.eu-west-2.aws.neon.tech/db?sslmode=require"


def _postgres_engine(monkeypatch):
    """Construye el engine de producción sin tocar ninguna base de datos real."""
    from backend.core import database

    monkeypatch.setattr(database.settings, "database_url", _POSTGRES_URL)
    return _build_engine()


# ── La invariante que evita el bug ───────────────────────────────────────────


def test_http_threads_never_outnumber_the_connections_they_need():
    """
    Cada hilo que atiende una petición síncrona reclama una conexión del pool.
    Si pueden pedir más conexiones de las que existen, el sobrante muere con
    TimeoutError en vez de hacer cola. El límite debe quedar POR DEBAJO de la
    capacidad, no igualarla: el WebSocket de alertas y las tareas de arranque
    también abren sesiones y necesitan margen.
    """
    assert _HTTP_THREAD_LIMIT < POOL_CAPACITY


def test_pool_capacity_is_the_sum_of_its_two_halves():
    # ARRANGE / ACT / ASSERT — POOL_CAPACITY es el número que main.py usa para
    # dimensionar el threadpool; si deja de reflejar el pool real, la invariante
    # de arriba pasaría en verde midiendo un número que ya no significa nada.
    assert POOL_CAPACITY == POOL_SIZE + MAX_OVERFLOW


def test_threadpool_limiter_is_lowered_when_the_app_starts():
    # ARRANGE — el limiter de anyio es un RunVar: solo existe dentro de un event
    # loop, así que hay que fijarlo y leerlo en el MISMO loop para probar nada.
    async def _apply_and_read() -> int:
        _limit_threadpool_to_pool_capacity()
        return to_thread.current_default_thread_limiter().total_tokens

    # ACT
    tokens = anyio.run(_apply_and_read)

    # ASSERT
    assert tokens == _HTTP_THREAD_LIMIT


# ── El pool de producción está configurado a mano, no heredado ───────────────


def test_postgres_pool_is_explicitly_sized_not_left_to_defaults(monkeypatch):
    # ARRANGE
    engine = _postgres_engine(monkeypatch)

    # ACT
    pool = engine.pool

    # ASSERT — los defaults de SQLAlchemy (5 y 10) son justo los que reventaron
    assert pool.size() == POOL_SIZE
    assert pool._max_overflow == MAX_OVERFLOW
    assert POOL_CAPACITY > 15


def test_postgres_pool_fails_fast_instead_of_hanging(monkeypatch):
    # ARRANGE
    engine = _postgres_engine(monkeypatch)

    # ACT / ASSERT — 30s (el default) deja al operario mirando una pantalla
    # congelada antes de recibir el error igualmente.
    assert engine.pool._timeout == POOL_TIMEOUT
    assert POOL_TIMEOUT < 30


def test_postgres_pool_recycles_before_neon_drops_idle_connections(monkeypatch):
    # ARRANGE
    engine = _postgres_engine(monkeypatch)

    # ACT / ASSERT — Neon y PgBouncer cierran las ociosas sobre los 5 minutos;
    # reciclar después sería sacar del pool una conexión ya muerta.
    assert engine.pool._recycle == POOL_RECYCLE
    assert POOL_RECYCLE < 300
    assert engine.pool._pre_ping is True


def test_sqlite_engine_skips_pool_sizing(monkeypatch):
    """
    Dev y tests corren sobre SQLite, que no usa QueuePool: pasarle los
    parámetros de dimensionado revienta con TypeError al construir el engine.
    """
    # ARRANGE
    from backend.core import database

    monkeypatch.setattr(database.settings, "database_url", "sqlite:///./_pool_check.db")

    # ACT — que no lance ya es el resultado que importa
    engine = _build_engine()

    # ASSERT
    assert engine.dialect.name == "sqlite"
