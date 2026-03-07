from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, func

from backend.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id          = Column(Integer, primary_key=True, index=True)
    titulo      = Column(String(255), nullable=False)
    cliente     = Column(String(255), nullable=False)
    estado      = Column(String(30), nullable=False, default="pendiente")
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    fecha_inicio = Column(Date, nullable=True)
    progreso    = Column(Integer, nullable=False, default=0)
    descripcion = Column(Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
