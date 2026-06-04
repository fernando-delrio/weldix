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


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Schemas EPIs, Certificados, Reconocimientos, Horas extra
# ══════════════════════════════════════════════════════════════════════════════

TIPOS_EPI = {
    "casco": "Casco de seguridad",
    "guantes": "Guantes",
    "arnes": "Arnés anticaídas",
    "botas": "Botas de seguridad",
    "gafas": "Gafas/pantalla protectora",
    "mascarilla": "Mascarilla / respirador",
    "ropa": "Ropa de trabajo / EPI integral",
    "proteccion_auditiva": "Protección auditiva",
    "chaleco": "Chaleco reflectante",
    "otro": "Otro",
}

TIPOS_CERTIFICADO = {
    "soldadura_homologada": "Soldadura homologada (EN 287 / ISO 9606)",
    "carretillero": "Carretillero elevador",
    "electrico_baja_tension": "Eléctrico baja tensión",
    "trabajo_alturas": "Trabajo en altura",
    "espacios_confinados": "Espacios confinados",
    "prl_basico": "PRL básico (60h)",
    "prl_especifico": "PRL nivel específico",
    "primeros_auxilios": "Primeros auxilios",
    "gruista": "Gruísta / operador de grúa",
    "otro": "Otro",
}


class EpiEntregaResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    tipo_epi: str
    tipo_epi_label: str = ""
    descripcion: Optional[str] = None
    talla: Optional[str] = None
    cantidad: int
    fecha_entrega: date
    fecha_caducidad: Optional[date] = None
    estado: str
    dias_para_caducar: Optional[int] = None  # null si sin caducidad
    alerta: bool = False  # True si caduca en < 30 días

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, epi) -> "EpiEntregaResponse":
        from datetime import date as date_type
        dias = None
        alerta = False
        if epi.fecha_caducidad:
            dias = (epi.fecha_caducidad - date_type.today()).days
            alerta = dias <= 30
        return cls(
            id=epi.id,
            operario_id=epi.operario_id,
            operario_nombre=epi.operario.full_name if epi.operario else None,
            tipo_epi=epi.tipo_epi,
            tipo_epi_label=TIPOS_EPI.get(epi.tipo_epi, epi.tipo_epi),
            descripcion=epi.descripcion,
            talla=epi.talla,
            cantidad=epi.cantidad,
            fecha_entrega=epi.fecha_entrega,
            fecha_caducidad=epi.fecha_caducidad,
            estado=epi.estado,
            dias_para_caducar=dias,
            alerta=alerta,
        )


class EpiEntregaRequest(BaseModel):
    operario_id: int
    tipo_epi: str
    descripcion: Optional[str] = Field(default=None, max_length=300)
    talla: Optional[str] = Field(default=None, max_length=20)
    cantidad: int = Field(default=1, ge=1)
    fecha_entrega: date
    fecha_caducidad: Optional[date] = None

    @field_validator("tipo_epi")
    @classmethod
    def tipo_epi_valido(cls, valor):
        if valor not in TIPOS_EPI:
            raise ValueError(f"Tipo de EPI no válido. Opciones: {list(TIPOS_EPI.keys())}")
        return valor


class CertificadoResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    tipo: str
    tipo_label: str = ""
    descripcion: Optional[str] = None
    entidad_certificadora: Optional[str] = None
    fecha_emision: date
    fecha_caducidad: Optional[date] = None
    estado: str
    dias_para_caducar: Optional[int] = None
    alerta: bool = False
    tiene_archivo: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, cert) -> "CertificadoResponse":
        from datetime import date as date_type
        dias = None
        alerta = False
        if cert.fecha_caducidad:
            dias = (cert.fecha_caducidad - date_type.today()).days
            alerta = dias <= 60
        return cls(
            id=cert.id,
            operario_id=cert.operario_id,
            operario_nombre=cert.operario.full_name if cert.operario else None,
            tipo=cert.tipo,
            tipo_label=TIPOS_CERTIFICADO.get(cert.tipo, cert.tipo),
            descripcion=cert.descripcion,
            entidad_certificadora=cert.entidad_certificadora,
            fecha_emision=cert.fecha_emision,
            fecha_caducidad=cert.fecha_caducidad,
            estado=cert.estado,
            dias_para_caducar=dias,
            alerta=alerta,
            tiene_archivo=bool(cert.archivo_ruta),
        )


class CertificadoRequest(BaseModel):
    operario_id: int
    tipo: str
    descripcion: Optional[str] = Field(default=None, max_length=300)
    entidad_certificadora: Optional[str] = Field(default=None, max_length=200)
    fecha_emision: date
    fecha_caducidad: Optional[date] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, valor):
        if valor not in TIPOS_CERTIFICADO:
            raise ValueError(f"Tipo no válido. Opciones: {list(TIPOS_CERTIFICADO.keys())}")
        return valor


class ReconocimientoMedicoResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    fecha_realizado: date
    fecha_proximo: Optional[date] = None
    resultado: str
    restricciones: Optional[str] = None
    observaciones: Optional[str] = None
    tiene_archivo: bool = False
    dias_para_proximo: Optional[int] = None
    alerta: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, rec) -> "ReconocimientoMedicoResponse":
        from datetime import date as date_type
        dias = None
        alerta = False
        if rec.fecha_proximo:
            dias = (rec.fecha_proximo - date_type.today()).days
            alerta = dias <= 30
        return cls(
            id=rec.id,
            operario_id=rec.operario_id,
            operario_nombre=rec.operario.full_name if rec.operario else None,
            fecha_realizado=rec.fecha_realizado,
            fecha_proximo=rec.fecha_proximo,
            resultado=rec.resultado,
            restricciones=rec.restricciones,
            observaciones=rec.observaciones,
            tiene_archivo=bool(rec.archivo_ruta),
            dias_para_proximo=dias,
            alerta=alerta,
        )


class ReconocimientoRequest(BaseModel):
    operario_id: int
    fecha_realizado: date
    fecha_proximo: Optional[date] = None
    resultado: str = "apto"
    restricciones: Optional[str] = Field(default=None, max_length=500)
    observaciones: Optional[str] = Field(default=None, max_length=500)

    @field_validator("resultado")
    @classmethod
    def resultado_valido(cls, valor):
        opciones = {"apto", "apto_con_restricciones", "no_apto"}
        if valor not in opciones:
            raise ValueError(f"Resultado debe ser uno de: {opciones}")
        return valor


class ResumenHorasResponse(BaseModel):
    operario_id: int
    operario_nombre: str
    mes: str  # "2026-06"
    horas_ordinarias: float
    horas_extra: float
    horas_nocturnas: float
    horas_festivas: float
    horas_total: float
    fichajes_count: int


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-2 — Schemas Turnos
# ══════════════════════════════════════════════════════════════════════════════

TURNOS_VALIDOS = {"manana", "tarde", "noche", "libre", "festivo"}


class TurnoAsignadoResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    fecha: date
    turno: str
    nota: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, turno) -> "TurnoAsignadoResponse":
        return cls(
            id=turno.id,
            operario_id=turno.operario_id,
            operario_nombre=turno.operario.full_name if turno.operario else None,
            fecha=turno.fecha,
            turno=turno.turno,
            nota=turno.nota,
        )


class TurnoAsignadoRequest(BaseModel):
    operario_id: int
    fecha: date
    turno: str
    nota: Optional[str] = Field(default=None, max_length=200)

    @field_validator("turno")
    @classmethod
    def turno_valido(cls, valor):
        if valor not in TURNOS_VALIDOS:
            raise ValueError(f"Turno debe ser uno de: {TURNOS_VALIDOS}")
        return valor


class TurnosBulkRequest(BaseModel):
    turnos: list[TurnoAsignadoRequest]


class SolicitudCambioTurnoResponse(BaseModel):
    id: int
    solicitante_id: int
    solicitante_nombre: Optional[str] = None
    receptor_id: int
    receptor_nombre: Optional[str] = None
    fecha_cedida: Optional[date] = None
    turno_cedido: Optional[str] = None
    fecha_recibida: Optional[date] = None
    turno_recibido: Optional[str] = None
    estado: str
    motivo: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, sol) -> "SolicitudCambioTurnoResponse":
        return cls(
            id=sol.id,
            solicitante_id=sol.solicitante_id,
            solicitante_nombre=sol.solicitante.full_name if sol.solicitante else None,
            receptor_id=sol.receptor_id,
            receptor_nombre=sol.receptor.full_name if sol.receptor else None,
            fecha_cedida=sol.turno_cedido.fecha if sol.turno_cedido else None,
            turno_cedido=sol.turno_cedido.turno if sol.turno_cedido else None,
            fecha_recibida=sol.turno_recibido.fecha if sol.turno_recibido else None,
            turno_recibido=sol.turno_recibido.turno if sol.turno_recibido else None,
            estado=sol.estado,
            motivo=sol.motivo,
            created_at=sol.created_at,
        )


class SolicitudCambioTurnoRequest(BaseModel):
    receptor_id: int
    turno_cedido_id: int
    turno_recibido_id: int
    motivo: Optional[str] = Field(default=None, max_length=300)


class RevisarCambioTurnoRequest(BaseModel):
    estado: str  # aprobada | rechazada
    comentario_admin: Optional[str] = Field(default=None, max_length=300)

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, valor):
        if valor not in {"aprobada", "rechazada"}:
            raise ValueError("El estado debe ser 'aprobada' o 'rechazada'")
        return valor


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Schemas Accidentes y Permisos especiales
# ══════════════════════════════════════════════════════════════════════════════

TIPOS_ACCIDENTE = {"accidente", "incidente", "casi_accidente"}

TIPOS_PERMISO_ESPECIAL = {
    "alturas": "Trabajo en altura",
    "espacios_confinados": "Espacio confinado",
    "trabajos_caliente": "Trabajos en caliente",
    "electrico": "Trabajo eléctrico",
    "excavacion": "Excavación / demolición",
    "otro": "Otro",
}


class AccidenteLaboralResponse(BaseModel):
    id: int
    afectado_id: int
    afectado_nombre: Optional[str] = None
    reportado_por_nombre: Optional[str] = None
    fecha_hora: datetime
    tipo: str
    lugar: Optional[str] = None
    descripcion: str
    causa_raiz: Optional[str] = None
    dias_baja: int
    requiere_hospitalizacion: bool
    estado: str
    medidas_correctoras: Optional[str] = None
    fecha_cierre: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, acc) -> "AccidenteLaboralResponse":
        return cls(
            id=acc.id,
            afectado_id=acc.afectado_id,
            afectado_nombre=acc.afectado.full_name if acc.afectado else None,
            reportado_por_nombre=acc.reportado_por.full_name if acc.reportado_por else None,
            fecha_hora=acc.fecha_hora,
            tipo=acc.tipo,
            lugar=acc.lugar,
            descripcion=acc.descripcion,
            causa_raiz=acc.causa_raiz,
            dias_baja=acc.dias_baja or 0,
            requiere_hospitalizacion=acc.requiere_hospitalizacion,
            estado=acc.estado,
            medidas_correctoras=acc.medidas_correctoras,
            fecha_cierre=acc.fecha_cierre,
            created_at=acc.created_at,
        )


class AccidenteRequest(BaseModel):
    afectado_id: int
    fecha_hora: datetime
    tipo: str
    lugar: Optional[str] = Field(default=None, max_length=200)
    descripcion: str = Field(min_length=10, max_length=2000)
    causa_raiz: Optional[str] = Field(default=None, max_length=500)
    dias_baja: int = Field(default=0, ge=0)
    requiere_hospitalizacion: bool = False

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, valor):
        if valor not in TIPOS_ACCIDENTE:
            raise ValueError(f"Tipo debe ser uno de: {TIPOS_ACCIDENTE}")
        return valor


class ActualizarAccidenteRequest(BaseModel):
    estado: Optional[str] = None
    causa_raiz: Optional[str] = Field(default=None, max_length=500)
    medidas_correctoras: Optional[str] = Field(default=None, max_length=1000)
    dias_baja: Optional[int] = Field(default=None, ge=0)
    fecha_cierre: Optional[date] = None


class IndicesSiniestralidad(BaseModel):
    year: int
    horas_trabajadas: float
    total_accidentes: int
    total_incidentes: int
    total_casi_accidentes: int
    total_dias_baja: int
    indice_frecuencia: float   # (accidentes × 10^6) / horas
    indice_gravedad: float     # (días baja × 10^3) / horas
    indice_incidencia: float   # (accidentes × 10^3) / trabajadores


class PermisoTrabajoResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: Optional[str] = None
    tipo: str
    tipo_label: str = ""
    descripcion_trabajo: Optional[str] = None
    fecha_emision: date
    fecha_caducidad: Optional[date] = None
    estado: str
    dias_para_caducar: Optional[int] = None
    alerta: bool = False
    tiene_archivo: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, permiso) -> "PermisoTrabajoResponse":
        from datetime import date as date_type
        dias = None
        alerta = False
        if permiso.fecha_caducidad:
            dias = (permiso.fecha_caducidad - date_type.today()).days
            alerta = dias <= 30
        return cls(
            id=permiso.id,
            operario_id=permiso.operario_id,
            operario_nombre=permiso.operario.full_name if permiso.operario else None,
            tipo=permiso.tipo,
            tipo_label=TIPOS_PERMISO_ESPECIAL.get(permiso.tipo, permiso.tipo),
            descripcion_trabajo=permiso.descripcion_trabajo,
            fecha_emision=permiso.fecha_emision,
            fecha_caducidad=permiso.fecha_caducidad,
            estado=permiso.estado,
            dias_para_caducar=dias,
            alerta=alerta,
            tiene_archivo=bool(permiso.archivo_ruta),
        )


class PermisoTrabajoRequest(BaseModel):
    operario_id: int
    tipo: str
    descripcion_trabajo: Optional[str] = Field(default=None, max_length=500)
    fecha_emision: date
    fecha_caducidad: Optional[date] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, valor):
        if valor not in TIPOS_PERMISO_ESPECIAL:
            raise ValueError(f"Tipo debe ser uno de: {list(TIPOS_PERMISO_ESPECIAL.keys())}")
        return valor
