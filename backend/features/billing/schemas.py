from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    plan: str  # "starter" | "pro"


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class BillingStatusResponse(BaseModel):
    plan: str
    subscription_status: str | None
    stripe_customer_id: str | None
    trial_expires_at: str | None  # ISO datetime o None
