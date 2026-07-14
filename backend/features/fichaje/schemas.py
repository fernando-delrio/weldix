from datetime import datetime, timezone

from pydantic import BaseModel


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite devuelve datetimes sin tzinfo. Marcamos explícitamente como UTC
    para que Pydantic serialice con '+00:00' y el browser convierta a hora local."""
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


class FichajeResponse(BaseModel):
    id: int
    operario_id: int
    inicio: datetime
    fin: datetime | None
    horas: float | None
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


class ForzarCierreRequest(BaseModel):
    horas_reales: float  # horas que el admin declara como correctas (0 < horas <= 16)


class ResumenJornadaResponse(BaseModel):
    """Agregado de horas por operario — usado en el panel admin."""

    operario_id: int
    operario_nombre: str
    total_fichajes: int
    total_horas: float
    ultimo_fichaje: datetime | None


class ResumenExtrasResponse(BaseModel):
    """Resumen de horas ordinarias y extras por operario en un rango de fechas.

    Horas extra = horas trabajadas en un día por encima de 8h (jornada ordinaria).
    Útil para calcular complementos salariales y cumplimiento del Estatuto de los Trabajadores.
    """

    operario_id: int
    operario_nombre: str
    email: str
    total_jornadas: int
    total_fichajes: int
    total_horas: float
    horas_ordinarias: float
    horas_extra: float


class BalanceHorasResponse(BaseModel):
    """Saldo de horas por operario: fichadas − esperadas en el rango.

    Positivo = horas a favor del operario; negativo = horas que debe.
    Horas esperadas = días laborables reales (sin festivos ni ausencias) × jornada.
    """

    operario_id: int
    operario_nombre: str
    dias_laborables: int
    horas_esperadas: float
    horas_fichadas: float
    saldo: float
