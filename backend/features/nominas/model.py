from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class Nomina(Base):
    """
    Nómina mensual de un operario, subida por el admin.
    Un operario solo puede tener una nómina por mes/año.
    El PDF se guarda en media/nominas/<uuid>.pdf.
    """

    __tablename__ = "nominas"
    __table_args__ = (
        UniqueConstraint("tenant_id", "operario_id", "year", "month", name="uq_nomina_operario_mes"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    operario_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    filename = Column(String(255), nullable=False)  # nombre original para la descarga
    filepath = Column(String(500), nullable=False)  # ruta física en disco

    uploaded_at = Column(DateTime, server_default=func.now(), nullable=False)

    operario = relationship("User", foreign_keys=[operario_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
