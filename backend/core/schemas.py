"""
Base compartida para schemas de respuesta con campos datetime.

SQLite no tiene tipo de zona horaria de verdad: aunque el código escriba un
datetime consciente de zona (UTC), al releerlo desde la base de datos vuelve
"naive" (sin tzinfo). Si ese datetime naive se serializa tal cual, Pydantic
lo manda sin sufijo de zona y el navegador lo interpreta como HORA LOCAL DEL
NAVEGADOR en vez de UTC — el fichaje de las 13:09 llegaba al kiosko como
"11:09" (el desfase horario de España respecto a UTC).

UTCResponseModel corrige esto en el punto de entrada: cualquier campo
datetime naive se marca explícitamente como UTC antes de validar. Los
datetimes que ya llevan zona (o los campos que no son datetime, como un
`date`) pasan sin tocar.
"""
from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class UTCResponseModel(BaseModel):
    """Todo schema de respuesta con un campo `datetime` debe heredar de aquí
    en vez de `BaseModel` directamente."""

    @field_validator("*", mode="before")
    @classmethod
    def _tag_naive_datetimes_as_utc(cls, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
