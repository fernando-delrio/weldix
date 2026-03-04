from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap import run_startup_tasks
from app.features.auth.router import router as auth_router

app = FastAPI(title="Weldix API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    run_startup_tasks()


app.include_router(auth_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "weldix-api"}
