from datetime import datetime, timezone

from pydantic import BaseModel


def _utc(dt: datetime | None) -> datetime | None:
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


class IniciarRegistroRequest(BaseModel):
    job_id: int


class RegistroHorasResponse(BaseModel):
    id: int
    job_id: int
    operario_id: int
    inicio: datetime
    fin: datetime | None
    horas: float | None
    operario_nombre: str | None = None
    job_code: str | None = None
    job_titulo: str | None = None

    @classmethod
    def from_orm(cls, r) -> "RegistroHorasResponse":
        return cls(
            id=r.id,
            job_id=r.job_id,
            operario_id=r.operario_id,
            inicio=_utc(r.inicio),
            fin=_utc(r.fin),
            horas=r.horas,
            operario_nombre=r.operario.full_name if r.operario else None,
            job_code=r.job.code if r.job else None,
            job_titulo=r.job.titulo if r.job else None,
        )


class ResumenHorasOTResponse(BaseModel):
    """Resumen de horas por operario en una OT — para la vista de admin/detalle."""

    operario_id: int
    operario_nombre: str
    total_horas: float
    num_sesiones: int


class HorasOTResponse(BaseModel):
    """Vista completa de horas de una OT: por operario + total global."""

    job_id: int
    job_code: str | None
    total_horas: float
    por_operario: list[ResumenHorasOTResponse]
    registros: list[RegistroHorasResponse]
