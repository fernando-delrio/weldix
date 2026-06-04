from pydantic import BaseModel

# Precio base fijo y precio por operario (en euros)
PRECIO_BASE = 49
PRECIO_POR_OPERARIO = 17


class CheckoutRequest(BaseModel):
    """El frontend no necesita elegir plan — el backend cuenta los operarios."""
    pass


class CheckoutResponse(BaseModel):
    checkout_url: str
    num_seats: int           # operarios contados en el momento del checkout
    precio_total: float      # base + (seats × por_operario), informativo


class PortalResponse(BaseModel):
    portal_url: str


class BillingStatusResponse(BaseModel):
    plan: str
    subscription_status: str | None
    stripe_customer_id: str | None
    trial_expires_at: str | None
    num_seats: int = 0
    precio_base: int = PRECIO_BASE
    precio_por_operario: int = PRECIO_POR_OPERARIO
    precio_total: float = 0
