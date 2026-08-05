from pydantic import BaseModel, Field


class AdminJobItem(BaseModel):
    id: int
    code: str | None
    titulo: str
    cliente: str
    estado: str
    tone: str
    progreso: int
    operario_id: int | None
    operario_name: str | None
    fecha_inicio: str | None
    # Sin este campo, Pydantic lo descartaba de la respuesta y el gráfico
    # "OTs creadas por mes" del panel salía siempre a 0.
    created_at: str | None


class AdminUserItem(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    worker_number: int | None = None
    pending_vacaciones_count: int = 0
    pending_vacaciones_dias: int = 0
    active_jobs_count: int = 0
    active_jobs: list[dict] = Field(default_factory=list)
    fichajes: list[dict] = Field(default_factory=list)


class AdminMetrics(BaseModel):
    total_jobs: int
    pendiente: int
    en_proceso: int
    control: int
    listo: int
    entregado: int
    total_operarios: int


class AdminDashboardResponse(BaseModel):
    metrics: AdminMetrics
    jobs: list[AdminJobItem]
    users: list[AdminUserItem]
