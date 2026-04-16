from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


class JobEvent(Base):
    __tablename__ = "job_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trabajo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(
        String, nullable=False
    )  # "creado" | "estado_cambiado"
    descripcion: Mapped[str] = mapped_column(
        String, nullable=False
    )  # texto legible para la UI
    usuario: Mapped[str] = mapped_column(
        String, nullable=False
    )  # nombre del operario o "Sistema"
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
