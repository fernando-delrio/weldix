from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

_ESTADO_TONE = {
    "pendiente":  "warning",
    "en_proceso": "info",
    "control":    "secondary",
    "listo":      "success",
    "entregado":  "neutral",
}

def _tone_for(estado: str) -> str:
    return _ESTADO_TONE.get(estado, "neutral")


class JobResponse(BaseModel):
    id:           int
    titulo:       str
    cliente:      str
    estado:       str
    operario_id:  int | None
    fecha_inicio: date | None
    progreso:     int
    descripcion:  str | None
    created_at:   datetime
    tone:         str = ""

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_job(cls, job: object) -> "JobResponse":
        instance = cls.model_validate(job)
        instance.tone = _tone_for(instance.estado)
        return instance


class CreateJobRequest(BaseModel):
    titulo:       str = Field(min_length=1)
    cliente:      str = Field(min_length=1)
    estado:       str = "pendiente"
    operario_id:  Optional[int] = None
    fecha_inicio: Optional[date] = None
    progreso:     int = Field(default=0, ge=0, le=100)
    descripcion:  Optional[str] = None


class UpdateEstadoRequest(BaseModel):
    estado:   str
    progreso: int = Field(ge=0, le=100)


class UpdateJobRequest(BaseModel):
    titulo:       Optional[str] = None
    cliente:      Optional[str] = None
    operario_id:  Optional[int] = None
    fecha_inicio: Optional[date] = None
    progreso:     Optional[int] = Field(default=None, ge=0, le=100)
    descripcion:  Optional[str] = None
