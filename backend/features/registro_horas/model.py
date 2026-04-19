from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class RegistroHoras(Base):
    """
    Tiempo que un operario dedica a una OT concreta.
    Distinto de la jornada laboral (Fichaje): aquí el contexto es el trabajo, no el día.

    Una OT grande puede tener varios registros de distintos operarios.
    Un operario puede abrir/cerrar registros en la misma OT en días diferentes.
    Regla de negocio: un operario solo puede tener UN registro abierto a la vez.
    """

    __tablename__ = "registro_horas"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inicio = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fin = Column(DateTime(timezone=True), nullable=True)
    horas = Column(Float, nullable=True)  # calculado al cerrar

    job = relationship("Job", foreign_keys=[job_id])
    operario = relationship("User", foreign_keys=[operario_id])
