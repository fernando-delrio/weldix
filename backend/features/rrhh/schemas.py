from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

# ─── Tipos válidos de ausencia ────────────────────────────────────────────────

TIPOS_AUSENCIA = {
    "vacaciones": "Vacaciones",
    "asuntos_propios": "Asuntos propios",
    "baja_medica": "Baja médica",
    "permiso_matrimonio": "Permiso por matrimonio",
    "permiso_nacimiento": "Permiso por nacimiento",
    "permiso_fallecimiento": "Permiso por fallecimiento",
    "permiso_mudanza": "Permiso por mudanza",
    "formacion": "Formación / curso",
    "maternidad_paternidad": "Maternidad / paternidad",
    "erte": "ERTE",
}

ESTADOS_SOLICITUD = {"pendiente", "aprobada", "rechazada", "cancelada"}

TIPOS_REQUIEREN_JUSTIFICANTE = {
    "baja_medica",
    "permiso_matrimonio",
    "permiso_nacimiento",
    "permiso_fallecimiento",
    "maternidad_paternidad",
    "erte",
}


# ─── Configuración laboral ────────────────────────────────────────────────────


class ConfiguracionLaboralResponse(BaseModel):
    id: int
    operario_id: int
    dias_vacaciones_anuales: int
    horas_jornada: float
    dias_laborables: str
    turno: str

    model_config = {"from_attributes": True}


class ConfiguracionLaboralRequest(BaseModel):
    operario_id: int
    dias_vacaciones_anuales: int = Field(default=22, ge=1, le=30)
    horas_jornada: float = Field(default=8.0, ge=1.0, le=12.0)
    dias_laborables: str = Field(default="LMXJV")
    turno: str = Field(default="manana")

    @field_validator("turno")
    @classmethod
    def turno_valido(cls, v):
        opciones = {"manana", "tarde", "noche", "flexible"}
        if v not in opciones:
            raise ValueError(f"Turno debe ser uno de: {opciones}")
        return v


# ─── Solicitud de ausencia ────────────────────────────────────────────────────


class SolicitudAusenciaResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    tipo: str
    tipo_label: str = ""
    fecha_inicio: date
    fecha_fin: date
    dias_solicitados: int
    estado: str
    motivo: Optional[str] = None
    comentario_admin: Optional[str] = None
    revisado_por_nombre: Optional[str] = None
    revisado_en: Optional[datetime] = None
    tiene_justificante: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, s) -> "SolicitudAusenciaResponse":
        return cls(
            id=s.id,
            operario_id=s.operario_id,
            operario_nombre=s.operario.full_name if s.operario else None,
            tipo=s.tipo,
            tipo_label=TIPOS_AUSENCIA.get(s.tipo, s.tipo),
            fecha_inicio=s.fecha_inicio,
            fecha_fin=s.fecha_fin,
            dias_solicitados=s.dias_solicitados,
            estado=s.estado,
            motivo=s.motivo,
            comentario_admin=s.comentario_admin,
            revisado_por_nombre=s.revisor.full_name if s.revisor else None,
            revisado_en=s.revisado_en,
            tiene_justificante=len(s.justificantes) > 0,
            created_at=s.created_at,
        )


class CrearSolicitudRequest(BaseModel):
    tipo: str
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = Field(default=None, max_length=500)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v):
        if v not in TIPOS_AUSENCIA:
            raise ValueError(
                f"Tipo de ausencia no válido. Opciones: {list(TIPOS_AUSENCIA.keys())}"
            )
        return v

    @field_validator("fecha_fin")
    @classmethod
    def fin_despues_de_inicio(cls, v, info):
        if "fecha_inicio" in info.data and v < info.data["fecha_inicio"]:
            raise ValueError(
                "La fecha de fin debe ser posterior o igual a la de inicio"
            )
        return v


class RevisarSolicitudRequest(BaseModel):
    estado: str  # aprobada | rechazada
    comentario_admin: Optional[str] = Field(default=None, max_length=500)

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v):
        if v not in {"aprobada", "rechazada"}:
            raise ValueError("El estado debe ser 'aprobada' o 'rechazada'")
        return v


# ─── Saldo de vacaciones ──────────────────────────────────────────────────────


class SaldoVacacionesResponse(BaseModel):
    operario_id: int
    operario_nombre: str
    year: int
    dias_totales: int
    dias_aprobados: int
    dias_pendientes: int
    dias_disponibles: int


# ─── Festivos ─────────────────────────────────────────────────────────────────


class FestivoResponse(BaseModel):
    id: int
    fecha: date
    nombre: str
    nombre_local: Optional[str] = None
    es_global: bool

    model_config = {"from_attributes": True}


# ─── Calendario ───────────────────────────────────────────────────────────────


class EventoCalendarioResponse(BaseModel):
    """Un evento en el calendario — puede ser festivo o ausencia."""

    tipo: str  # "festivo" | "ausencia"
    fecha_inicio: date
    fecha_fin: date
    titulo: str
    subtitulo: Optional[str] = None
    estado: Optional[str] = None  # solo para ausencias
    operario_id: Optional[int] = None
    operario_nombre: Optional[str] = None
    es_propio: bool = False  # True si es del usuario que consulta


# ─── Informe mensual ──────────────────────────────────────────────────────────


class InformeMensualOperario(BaseModel):
    operario_id: int
    operario_nombre: str
    dias_ausencia_aprobados: int
    dias_ausencia_pendientes: int
    horas_fichadas: float
    ausencias: list[SolicitudAusenciaResponse]


class InformeMensualResponse(BaseModel):
    year: int
    month: int
    total_operarios: int
    operarios: list[InformeMensualOperario]
