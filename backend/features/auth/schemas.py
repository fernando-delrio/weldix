from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterWorkspaceRequest(BaseModel):
    """Registro público: crea un taller nuevo con su admin."""

    nombre_taller: str = Field(min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)
    admin_name: str | None = None
    aceptar_terminos: bool  # GDPR — debe ser True


class RegisterWorkspaceResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: EmailStr
    tenant_nombre: str
    tenant_slug: str


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    password: str = Field(min_length=8)


class AdminSignupRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    password: str = Field(min_length=8)
    role: str = "operario"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: EmailStr


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    role: str
    worker_number: int | None = None
    onboarding_done: bool = False


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class TrialStatusResponse(BaseModel):
    is_trial: bool
    is_expired: bool
    days_left: int | None
    trial_expires_at: datetime | None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
