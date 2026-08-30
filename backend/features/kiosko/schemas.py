from datetime import datetime

from pydantic import BaseModel, Field

from backend.core.schemas import UTCResponseModel


class KioskInfoResponse(BaseModel):
    tenant_nombre: str


class KioskLinkResponse(BaseModel):
    token: str
    url: str


class FicharKioskoRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")


class FicharKioskoResponse(UTCResponseModel):
    operario: str
    accion: str  # "entrada" | "salida"
    hora: datetime
    horas: float | None = None
