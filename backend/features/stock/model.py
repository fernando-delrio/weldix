from sqlalchemy import Column, DateTime, Float, Integer, String, func

from backend.core.database import Base


class Material(Base):
    __tablename__ = "stock"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    quantity   = Column(Float, nullable=False, default=0)
    minimum    = Column(Float, nullable=False, default=0)
    unit       = Column(String(20), nullable=False, default="ud")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
