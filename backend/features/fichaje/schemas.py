from datetime import datetime

from pydantic import BaseModel


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
            inicio=f.inicio,
            fin=f.fin,
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
