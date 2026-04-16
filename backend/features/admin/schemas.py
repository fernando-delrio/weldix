from pydantic import BaseModel


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


class AdminUserItem(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str


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
