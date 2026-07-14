from pydantic import BaseModel, Field


class MensajeHistorial(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ConsultaRequest(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] | None = None
    contexto_trabajo: str | None = None  # legacy: trabajo activo
    contexto_seccion: str | None = None  # nuevo: qué sección está viendo el usuario


class ConsultaResponse(BaseModel):
    respuesta: str


class LandingChatRequest(BaseModel):
    """Chat público del landing — solo mensaje + historial, sin contexto de taller."""

    mensaje: str = Field(min_length=1, max_length=500)
    historial: list[MensajeHistorial] | None = None
