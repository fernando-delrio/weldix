from contextlib import asynccontextmanager

import sentry_sdk
from anyio import to_thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from backend.core.bootstrap import run_startup_tasks
from backend.core.config import settings
from backend.core.database import POOL_CAPACITY
from backend.features.registry import ENABLED_ROUTERS

# Conexiones que NO consume una petición HTTP síncrona y hay que dejarle libres:
# el WebSocket de alertas y las tareas de arranque abren sus propias sesiones.
_RESERVED_CONNECTIONS = 5
_HTTP_THREAD_LIMIT = POOL_CAPACITY - _RESERVED_CONNECTIONS

is_production = settings.environment.lower() in {"prod", "production"}

# Silencioso si SENTRY_DSN no está configurado -- mismo criterio que
# fire_webhook() con N8N_WEBHOOK_URL, no rompe nada en dev/tests.
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment, traces_sample_rate=0.1)


def _limit_threadpool_to_pool_capacity() -> None:
    """
    Alinea el threadpool de FastAPI con la capacidad del pool de conexiones.

    Cada endpoint síncrono (`def`) se atiende en un hilo de anyio y retiene una
    conexión de BD durante toda la petición. Si hay más hilos que conexiones, el
    exceso espera en el pool hasta agotar pool_timeout y muere con TimeoutError.
    Con el límite por debajo de POOL_CAPACITY, ese exceso hace cola en el
    threadpool — que es gratis y no devuelve un 500 al operario.
    """
    to_thread.current_default_thread_limiter().total_tokens = _HTTP_THREAD_LIMIT


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _limit_threadpool_to_pool_capacity()
    run_startup_tasks()
    yield


app = FastAPI(
    title="Weldix API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

if settings.allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

if settings.force_https:
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in ENABLED_ROUTERS:
    app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "weldix-api"}
