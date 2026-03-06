from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

_STATUS_TONE = {
    "Pendiente":  "warning",
    "En proceso": "info",
    "Control":    "secondary",
    "Completado": "success",
}

def _tone_for(status: str) -> str:
    return _STATUS_TONE.get(status, "neutral")

def _due_label(due_date: date | None) -> str:
    if due_date is None:
        return "-"
    today = date.today()
    if due_date == today:
        return "Entrega hoy"
    return due_date.strftime("Entrega: %d %b").replace(" 0", " ")


class JobResponse(BaseModel):
    id:         int
    code:       str
    title:      str
    client:     str
    type:       str
    area:       str
    due_date:   date | None
    status:     str
    progress:   int
    created_at: datetime

    # Campos computados — compatibles con el modelo del frontend
    tone: str = ""
    due:  str = ""

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_job(cls, job: object) -> "JobResponse":
        instance = cls.model_validate(job)
        instance.tone = _tone_for(instance.status)
        instance.due  = _due_label(instance.due_date)
        return instance


class CreateJobRequest(BaseModel):
    title:    str = Field(min_length=1)
    client:   str = Field(min_length=1)
    type:     str = Field(min_length=1)
    area:     str = Field(min_length=1)
    due_date: Optional[date] = None
    status:   str = "Pendiente"
    progress: int = Field(default=0, ge=0, le=100)


class UpdateJobStatusRequest(BaseModel):
    status:   str
    progress: int = Field(ge=0, le=100)


class UpdateJobRequest(BaseModel):
    title:    Optional[str] = None
    client:   Optional[str] = None
    type:     Optional[str] = None
    area:     Optional[str] = None
    due_date: Optional[date] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
