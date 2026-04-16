from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Foto(Base):
    """
    Foto adjunta a un trabajo. Puede etiquetarse como 'antes', 'durante' o 'despues'.
    El archivo físico se guarda en /media/fotos/<filename>.
    """

    __tablename__ = "fotos"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    # filepath relativo a la raíz del proyecto — sirve para construir la URL pública
    filepath = Column(String(500), nullable=False)
    # etiqueta permite clasificar: antes del trabajo, durante, o después
    etiqueta = Column(String(50), nullable=True, default="durante")
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    job = relationship("Job", foreign_keys=[job_id])
    uploader = relationship("User", foreign_keys=[uploader_id])
