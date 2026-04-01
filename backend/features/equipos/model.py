from sqlalchemy import Column, Date, DateTime, Integer, String, Text, func

from backend.core.database import Base


class Equipo(Base):
    """
    Herramienta o máquina del taller (soldadora, cortadora, grúa, etc.).
    El sistema lanza alerta cuando días_desde_mantenimiento > intervalo_dias.
    """
    __tablename__ = "equipos"

    id                   = Column(Integer, primary_key=True, index=True)
    nombre               = Column(String(255), nullable=False)
    # tipo libre: "soldadora", "cortadora CNC", "grúa", etc.
    tipo                 = Column(String(100), nullable=True)
    descripcion          = Column(Text, nullable=True)
    # operativo | en_revision | averiado | retirado
    estado               = Column(String(30), nullable=False, default="operativo")
    ultimo_mantenimiento = Column(Date, nullable=True)
    # cada cuántos días hay que hacer mantenimiento
    intervalo_dias       = Column(Integer, nullable=False, default=90)
    created_at           = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
