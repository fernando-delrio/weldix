from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.bootstrap import run_startup_tasks
from backend.core.config import settings
from backend.features.admin.router import router as admin_router
from backend.features.auth.router import router as auth_router
from backend.features.historial.router import router as historial_router
from backend.features.dashboard.router import router as dashboard_router
from backend.features.ia.router import router as ia_router
from backend.features.jobs.router import router as jobs_router
from backend.features.stock.router import router as stock_router

app = FastAPI(title="Weldix API", version="1.0.0")

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


app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(historial_router)
app.include_router(ia_router)
app.include_router(jobs_router)
app.include_router(stock_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "weldix-api"}
