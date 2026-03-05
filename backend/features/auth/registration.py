from abc import ABC
from dataclasses import dataclass

from sqlalchemy.orm import Session

from .model import User
from .service import create_user


@dataclass(frozen=True)
class SignupData:
    email: str
    password: str
    full_name: str | None


class SignupStrategy(ABC):
    role: str = "operario"

    def signup(self, db: Session, data: SignupData) -> User:
        safe_email = data.email.lower().strip()
        existing = db.query(User).filter(User.email == safe_email).first()
        if existing:
            raise ValueError("El email ya existe")

        return create_user(
            db=db,
            email=safe_email,
            password=data.password,
            full_name=data.full_name,
            role=self.role,
        )


class OperarioSignupStrategy(SignupStrategy):
    role = "operario"


class AdminSignupStrategy(SignupStrategy):
    role = "admin"


class SignupStrategyFactory:
    @staticmethod
    def for_public_signup() -> SignupStrategy:
        return OperarioSignupStrategy()

    @staticmethod
    def for_admin_signup() -> SignupStrategy:
        return AdminSignupStrategy()
