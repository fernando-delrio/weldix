from pydantic import BaseModel


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
