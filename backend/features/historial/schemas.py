from datetime import datetime

from backend.core.schemas import UTCResponseModel


class JobEventResponse(UTCResponseModel):
    id: int
    trabajo_id: int
    tipo: str
    descripcion: str
    usuario: str
    created_at: datetime

    model_config = {"from_attributes": True}
