from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func

from backend.core.database import Base


class Tenant(Base):
    """Un taller = un tenant. Aísla completamente los datos entre clientes."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    plan = Column(String(30), nullable=False, default="trial")  # trial | starter | pro
    trial_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Stripe — None hasta que el taller haga checkout
    stripe_customer_id = Column(String(255), nullable=True, unique=True, index=True)
    subscription_status = Column(
        String(30), nullable=True
    )  # active | past_due | canceled | trialing
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    worker_number = Column(Integer, nullable=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(30), nullable=False, default="operario")  # admin | operario
    password_hash = Column(String(255), nullable=False)
    onboarding_done = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    reset_token = Column(String(64), nullable=True, unique=True, index=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
