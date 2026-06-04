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
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
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
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
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


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Legal y Prevención
# ══════════════════════════════════════════════════════════════════════════════


class EpiEntrega(Base):
    """
    Registro de entrega de Equipos de Protección Individual (EPIs) a un operario.
    Controla caducidades para cumplir con la Ley 31/1995 de PRL.
    Estados: activo | repuesto | baja
    """

    __tablename__ = "epi_entregas"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    registrado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    tipo_epi = Column(String(60), nullable=False)   # casco | guantes | arnés | botas | gafas | mascarilla | ropa
    descripcion = Column(String(300), nullable=True)
    talla = Column(String(20), nullable=True)
    cantidad = Column(Integer, nullable=False, default=1)

    fecha_entrega = Column(Date, nullable=False)
    fecha_caducidad = Column(Date, nullable=True)   # null = sin caducidad definida

    estado = Column(String(20), nullable=False, default="activo")  # activo | repuesto | baja

    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    registrado_por = relationship("User", foreign_keys=[registrado_por_id])


class Certificado(Base):
    """
    Certificado profesional de un operario (soldadura homologada, carretillero, PRL…).
    Genera alertas cuando faltan menos de 60 días para el vencimiento.
    Estados: vigente | vencido | pendiente_renovacion
    """

    __tablename__ = "certificados_trabajador"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    registrado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Tipos habituales en talleres de soldadura
    tipo = Column(String(60), nullable=False)
    # soldadura_homologada | carretillero | electrico_baja_tension |
    # trabajo_alturas | espacios_confinados | prl_basico | prl_especifico | otro
    descripcion = Column(String(300), nullable=True)
    entidad_certificadora = Column(String(200), nullable=True)

    fecha_emision = Column(Date, nullable=False)
    fecha_caducidad = Column(Date, nullable=True)  # null = sin caducidad (título indefinido)

    estado = Column(String(30), nullable=False, default="vigente")  # vigente | vencido | pendiente_renovacion

    archivo_ruta = Column(String(500), nullable=True)   # ruta relativa en /media/
    archivo_nombre = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    registrado_por = relationship("User", foreign_keys=[registrado_por_id])


class ReconocimientoMedico(Base):
    """
    Reconocimiento médico laboral obligatorio (Ley 31/1995 art. 22).
    Periodicidad habitual: anual en trabajo con riesgos, bienal en trabajo de oficina.
    Resultados: apto | apto_con_restricciones | no_apto
    """

    __tablename__ = "reconocimientos_medicos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    registrado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    fecha_realizado = Column(Date, nullable=False)
    fecha_proximo = Column(Date, nullable=True)

    resultado = Column(String(30), nullable=False, default="apto")
    # apto | apto_con_restricciones | no_apto

    restricciones = Column(String(500), nullable=True)  # solo si apto_con_restricciones
    observaciones = Column(String(500), nullable=True)

    archivo_ruta = Column(String(500), nullable=True)
    archivo_nombre = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    registrado_por = relationship("User", foreign_keys=[registrado_por_id])


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-2 — Planificación de turnos
# ══════════════════════════════════════════════════════════════════════════════


class TurnoAsignado(Base):
    """
    Asignación de turno de un operario para un día concreto.
    Un admin o encargado crea el cuadrante asignando turnos semana a semana.
    Turnos: manana | tarde | noche | libre | festivo
    """

    __tablename__ = "turnos_asignados"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    creado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    fecha = Column(Date, nullable=False, index=True)
    turno = Column(String(20), nullable=False)  # manana | tarde | noche | libre | festivo
    nota = Column(String(200), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    creado_por = relationship("User", foreign_keys=[creado_por_id])


class SolicitudCambioTurno(Base):
    """
    Solicitud de intercambio de turno entre dos operarios.
    Flujo: pendiente → aprobada | rechazada (admin o encargado)
    """

    __tablename__ = "solicitudes_cambio_turno"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    solicitante_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receptor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Los dos turnos que se intercambian
    turno_cedido_id = Column(Integer, ForeignKey("turnos_asignados.id"), nullable=False)
    turno_recibido_id = Column(Integer, ForeignKey("turnos_asignados.id"), nullable=False)

    estado = Column(String(20), nullable=False, default="pendiente")  # pendiente | aprobada | rechazada
    motivo = Column(String(300), nullable=True)

    aprobado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    aprobado_en = Column(DateTime, nullable=True)
    comentario_admin = Column(String(300), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    solicitante = relationship("User", foreign_keys=[solicitante_id])
    receptor = relationship("User", foreign_keys=[receptor_id])
    turno_cedido = relationship("TurnoAsignado", foreign_keys=[turno_cedido_id])
    turno_recibido = relationship("TurnoAsignado", foreign_keys=[turno_recibido_id])
    aprobado_por = relationship("User", foreign_keys=[aprobado_por_id])


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Seguridad y siniestralidad
# ══════════════════════════════════════════════════════════════════════════════


class AccidenteLaboral(Base):
    """
    Parte de accidente o incidente laboral.
    Obligatorio notificar a la mutua dentro de las 5 primeras jornadas (RD 1299/2006).
    Tipos: accidente | incidente | casi_accidente (near miss)
    Estados: abierto → en_investigacion → cerrado
    """

    __tablename__ = "accidentes_laborales"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    afectado_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reportado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    fecha_hora = Column(DateTime(timezone=True), nullable=False)
    tipo = Column(String(30), nullable=False)  # accidente | incidente | casi_accidente

    lugar = Column(String(200), nullable=True)
    descripcion = Column(String(2000), nullable=False)
    causa_raiz = Column(String(500), nullable=True)

    dias_baja = Column(Integer, nullable=True, default=0)
    requiere_hospitalizacion = Column(Boolean, nullable=False, default=False)

    estado = Column(String(25), nullable=False, default="abierto")  # abierto | en_investigacion | cerrado
    medidas_correctoras = Column(String(1000), nullable=True)
    fecha_cierre = Column(Date, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    afectado = relationship("User", foreign_keys=[afectado_id])
    reportado_por = relationship("User", foreign_keys=[reportado_por_id])


class PermisoTrabajoEspecial(Base):
    """
    Permiso de trabajo para actividades de alto riesgo:
    trabajos en altura, espacios confinados, trabajos en caliente, etc.
    Obligatorio bajo el art. 16 de la Ley 31/1995 PRL.
    """

    __tablename__ = "permisos_trabajo_especial"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    autorizado_por_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    tipo = Column(String(60), nullable=False)
    # alturas | espacios_confinados | trabajos_caliente | electrico | excavacion | otro

    descripcion_trabajo = Column(String(500), nullable=True)

    fecha_emision = Column(Date, nullable=False)
    fecha_caducidad = Column(Date, nullable=True)

    archivo_ruta = Column(String(500), nullable=True)   # PDF del permiso firmado
    archivo_nombre = Column(String(255), nullable=True)

    estado = Column(String(20), nullable=False, default="activo")  # activo | vencido | revocado

    created_at = Column(DateTime, server_default=func.now())

    operario = relationship("User", foreign_keys=[operario_id])
    autorizado_por = relationship("User", foreign_keys=[autorizado_por_id])
