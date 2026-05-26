from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from backend.core.bootstrap import run_startup_tasks
from backend.core.config import settings
from backend.features.registry import ENABLED_ROUTERS

is_production = settings.environment.lower() in {"prod", "production"}
app = FastAPI(
    title="Weldix API",
    version="1.0.0",
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


@app.on_event("startup")
def on_startup() -> None:
    run_startup_tasks()


for router in ENABLED_ROUTERS:
    app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "weldix-api"}
