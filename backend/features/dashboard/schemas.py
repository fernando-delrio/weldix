from typing import Optional

from pydantic import BaseModel

from backend.features.stock.schemas import StockItemResponse


class GreetingSchema(BaseModel):
    greeting_label: str
    operator_name: str
    date_label: str
    shift_label: str


class MetricSchema(BaseModel):
    key: str
    label: str
    value: int
    tone: str


class ActiveJobSchema(BaseModel):
    id: int
    code: str | None = None
    status: str
    status_tone: str
    due_label: str
    due_tone: str
    title: str
    client: str
    progress: int
    stages: list[str]
    current_stage: int


class TodayJobSchema(BaseModel):
    id: int
    code: str | None = None
    title: str
    due: str
    status: str
    tone: str
    urgente: bool = False
    motivo_rechazo: str | None = None


class WorkerDashboardResponse(BaseModel):
    greeting: GreetingSchema
    metrics: list[MetricSchema]
    active_job: Optional[ActiveJobSchema] = None
    today_jobs: list[TodayJobSchema]
    stock: list[StockItemResponse]
