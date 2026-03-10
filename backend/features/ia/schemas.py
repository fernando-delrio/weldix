from pydantic import BaseModel


class MensajeHistorial(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ConsultaRequest(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] | None = None


class ConsultaResponse(BaseModel):
    respuesta: str
