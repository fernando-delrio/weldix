from datetime import date, datetime

from pydantic import BaseModel

from backend.core.schemas import UTCResponseModel


class CreateEquipoRequest(BaseModel):
    nombre: str
    tipo: str | None = None
    descripcion: str | None = None
    estado: str = "operativo"
    ultimo_mantenimiento: date | None = None
    intervalo_dias: int = 90


class UpdateEquipoRequest(BaseModel):
    nombre: str | None = None
    tipo: str | None = None
    descripcion: str | None = None
    ultimo_mantenimiento: date | None = None
    intervalo_dias: int | None = None


class UpdateEquipoEstadoRequest(BaseModel):
    estado: str


class EquipoResponse(UTCResponseModel):
    id: int
    nombre: str
    tipo: str | None
    descripcion: str | None
    estado: str
    ultimo_mantenimiento: date | None
    intervalo_dias: int
    created_at: datetime
    # días desde el último mantenimiento — calculado en el servicio
    dias_desde_mantenimiento: int | None = None
    # True si supera el intervalo configurado
    alerta_mantenimiento: bool = False

    class Config:
        from_attributes = True
