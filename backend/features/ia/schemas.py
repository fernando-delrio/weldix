from pydantic import BaseModel


class MensajeHistorial(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ConsultaRequest(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] | None = None
    contexto_trabajo: str | None = None   # título, cliente y estado del trabajo activo


class ConsultaResponse(BaseModel):
    respuesta: str
