from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Fichaje(Base):
    """
    Jornada laboral de un operario.
    Un fichaje representa el bloque de tiempo desde que el operario
    llega al taller hasta que se va — independientemente de los trabajos que haga.
    """

    __tablename__ = "fichajes"

    id = Column(Integer, primary_key=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inicio = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fin = Column(DateTime(timezone=True), nullable=True)
    # horas se calcula y guarda al finalizar
    horas = Column(Float, nullable=True)

    operario = relationship("User", foreign_keys=[operario_id])
