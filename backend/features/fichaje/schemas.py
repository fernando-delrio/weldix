from datetime import datetime, timezone

from pydantic import BaseModel


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite devuelve datetimes sin tzinfo. Marcamos explícitamente como UTC
    para que Pydantic serialice con '+00:00' y el browser convierta a hora local."""
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


class FichajeResponse(BaseModel):
    id:          int
    operario_id: int
    inicio:      datetime
    fin:         datetime | None
    horas:       float | None
    operario_nombre: str | None = None

    @classmethod
    def from_orm_fichaje(cls, f) -> "FichajeResponse":
        return cls(
            id=f.id,
            operario_id=f.operario_id,
            inicio=_utc(f.inicio),
            fin=_utc(f.fin),
            horas=f.horas,
            operario_nombre=f.operario.full_name if f.operario else None,
        )


class ResumenJornadaResponse(BaseModel):
    """Agregado de horas por operario — usado en el panel admin."""
    operario_id:     int
    operario_nombre: str
    total_fichajes:  int
    total_horas:     float
    # el más reciente primero
    ultimo_fichaje:  datetime | None
