from datetime import datetime

from pydantic import BaseModel


class JobEventResponse(BaseModel):
    id: int
    trabajo_id: int
    tipo: str
    descripcion: str
    usuario: str
    created_at: datetime

    model_config = {"from_attributes": True}
