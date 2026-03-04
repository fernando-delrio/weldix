from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from .dependencies import get_current_user, require_role
from .model import User
from .registration import SignupData, SignupStrategyFactory
from .schemas import AdminSignupRequest, LoginRequest, MeResponse, SignupRequest, TokenResponse
from .service import authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])
public_signup_strategy = SignupStrategyFactory.for_public_signup()
admin_signup_strategy = SignupStrategyFactory.for_admin_signup()


@router.post("/signup", response_model=MeResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    try:
        user = public_signup_strategy.signup(
            db=db,
            data=SignupData(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return MeResponse(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.post("/admin/signup", response_model=MeResponse)
def signup_admin(
    body: AdminSignupRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        user = admin_signup_strategy.signup(
            db=db,
            data=SignupData(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return MeResponse(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    try:
        data = authenticate_user(db=db, email=body.email, password=body.password)
        return TokenResponse(**data)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return MeResponse(id=user.id, email=user.email, full_name=user.full_name, role=user.role)


@router.get("/users", response_model=list[MeResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    users = db.query(User).order_by(User.id.desc()).all()
    return [MeResponse(id=u.id, email=u.email, full_name=u.full_name, role=u.role) for u in users]
