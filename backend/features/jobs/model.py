from sqlalchemy import Column, Date, DateTime, Integer, String, func

from backend.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id         = Column(Integer, primary_key=True, index=True)
    code       = Column(String(30), unique=True, nullable=False, index=True)
    title      = Column(String(255), nullable=False)
    client     = Column(String(255), nullable=False)
    type       = Column(String(100), nullable=False)
    area       = Column(String(100), nullable=False)
    due_date   = Column(Date, nullable=True)
    status     = Column(String(30), nullable=False, default="Pendiente")
    progress   = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
