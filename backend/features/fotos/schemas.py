from datetime import datetime

from pydantic import BaseModel


class FotoResponse(BaseModel):
    id: int
    job_id: int
    filename: str
    # url pública que el frontend usa directamente para mostrar la imagen
    url: str
    etiqueta: str | None
    created_at: datetime
    uploader_nombre: str | None = None

    @classmethod
    def from_orm_foto(cls, foto, base_url: str = "") -> "FotoResponse":
        return cls(
            id=foto.id,
            job_id=foto.job_id,
            filename=foto.filename,
            url=f"{base_url}/fotos/{foto.id}/archivo",
            etiqueta=foto.etiqueta,
            created_at=foto.created_at,
            uploader_nombre=foto.uploader.full_name if foto.uploader else None,
        )
