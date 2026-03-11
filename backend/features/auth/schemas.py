from pydantic import BaseModel, EmailStr, Field


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


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
