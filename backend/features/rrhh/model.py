from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from backend.core.database import Base


class ConfiguracionLaboral(Base):
    """
    Configuración laboral de un operario.
    El admin la crea al dar de alta al operario.
    Si no existe, se usan los valores por defecto del convenio.
    """

    __tablename__ = "configuracion_laboral"

    id = Column(Integer, primary_key=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    dias_vacaciones_anuales = Column(Integer, nullable=False, default=22)
    horas_jornada = Column(Float, nullable=False, default=8.0)
    # "LMXJV" = lunes a viernes | "LMXJVS" incluye sábado
    dias_laborables = Column(String(10), nullable=False, default="LMXJV")
    # turno: manana (07:00-15:00), tarde (15:00-23:00), noche (23:00-07:00), flexible
    turno = Column(String(20), nullable=False, default="manana")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    operario = relationship("User", foreign_keys=[operario_id])


class SolicitudAusencia(Base):
    """
    Solicitud de ausencia de un operario.

    Flujo de estados:
    pendiente → aprobada  (admin aprueba)
    pendiente → rechazada (admin rechaza con motivo)
    pendiente → cancelada (operario cancela antes de que se revise)

    Tipos de ausencia contemplados en el convenio colectivo español:
    - vacaciones: 22 días laborables/año
    - asuntos_propios: días sin justificante
    - baja_medica: requiere justificante médico
    - permiso_matrimonio: 15 días naturales
    - permiso_nacimiento: por nacimiento de hijo
    - permiso_fallecimiento: 2-4 días según parentesco
    - permiso_mudanza: 1 día
    - formacion: curso o certificación
    - maternidad_paternidad: baja oficial
    - erte: suspensión de contrato
    """

    __tablename__ = "solicitudes_ausencia"

    id = Column(Integer, primary_key=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Tipo y fechas
    tipo = Column(String(40), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    dias_solicitados = Column(Integer, nullable=False)  # calculado al crear

    # Estado del flujo de aprobación
    estado = Column(String(20), nullable=False, default="pendiente")

    # Datos del operario
    motivo = Column(String(500), nullable=True)

    # Datos de la revisión del admin
    comentario_admin = Column(String(500), nullable=True)
    revisado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    revisado_en = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    revisor = relationship("User", foreign_keys=[revisado_por_id])
    justificantes = relationship(
        "DocumentoJustificante",
        back_populates="solicitud",
        cascade="all, delete-orphan",
    )


class DocumentoJustificante(Base):
    """
    Archivo adjunto a una solicitud de ausencia.
    Puede ser un PDF médico, foto del justificante, etc.
    Se guarda en /media/justificantes/.
    """

    __tablename__ = "documentos_justificante"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_ausencia.id"), nullable=False
    )
    nombre_archivo = Column(String(255), nullable=False)  # nombre original del archivo
    ruta = Column(String(500), nullable=False)  # ruta relativa en /media/
    content_type = Column(String(100), nullable=True)  # image/jpeg, application/pdf...
    uploaded_at = Column(DateTime, server_default=func.now())

    solicitud = relationship("SolicitudAusencia", back_populates="justificantes")


class Festivo(Base):
    """
    Festivo nacional cacheado desde la API de nager.at.
    Se guarda en BD para no depender de la API en producción.
    Se refresca automáticamente si no hay datos del año solicitado.
    """

    __tablename__ = "festivos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    nombre_local = Column(String(200), nullable=True)
    year = Column(Integer, nullable=False, index=True)
    es_global = Column(Boolean, nullable=False, default=True)  # nacional vs autonómico
