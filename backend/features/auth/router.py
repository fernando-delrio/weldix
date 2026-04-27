from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.email import send_welcome_email
from backend.core.security import create_access_token
from backend.core.webhooks import fire_webhook

from .dependencies import get_current_user, require_role
from .model import User
from .registration import SignupData, SignupStrategyFactory
from .schemas import (
    AdminSignupRequest,
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterWorkspaceRequest,
    RegisterWorkspaceResponse,
    TokenResponse,
    TrialStatusResponse,
    UpdateProfileRequest,
)
from .service import (
    authenticate_user,
    change_password,
    create_workspace,
    get_trial_status,
    update_profile,
)

router = APIRouter(prefix="/auth", tags=["auth"])
admin_signup_strategy = SignupStrategyFactory.for_admin_signup()


@router.post(
    "/register-workspace", response_model=RegisterWorkspaceResponse, status_code=201
)
def register_workspace(
    body: RegisterWorkspaceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Registro público: un taller nuevo se registra en Weldix.
    Crea el Tenant + el primer usuario admin automáticamente.
    Devuelve un JWT listo para usar — el usuario queda logueado.
    """
    if not body.aceptar_terminos:
        raise HTTPException(
            status_code=422, detail="Debes aceptar los términos y condiciones"
        )

    try:
        tenant, admin = create_workspace(
            db,
            nombre_taller=body.nombre_taller,
            admin_email=body.admin_email,
            admin_password=body.admin_password,
            admin_name=body.admin_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    background_tasks.add_task(
        send_welcome_email,
        to=admin.email,
        admin_name=admin.full_name or "",
        tenant_nombre=tenant.nombre,
    )
    background_tasks.add_task(
        fire_webhook,
        "workspace_creado",
        {
            "tenant_id": tenant.id,
            "tenant_nombre": tenant.nombre,
            "tenant_slug": tenant.slug,
            "admin_email": admin.email,
            "admin_name": admin.full_name or "",
        },
    )

    token = create_access_token(
        subject=str(admin.id),
        extra={"role": admin.role, "email": admin.email},
    )
    return RegisterWorkspaceResponse(
        access_token=token,
        role=admin.role,
        user_id=admin.id,
        email=admin.email,
        tenant_nombre=tenant.nombre,
        tenant_slug=tenant.slug,
    )


@router.post("/admin/signup", response_model=MeResponse)
def signup_admin(
    body: AdminSignupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """El admin crea un nuevo usuario en su taller."""
    try:
        user = admin_signup_strategy.signup(
            db=db,
            data=SignupData(
                email=body.email,
                password=body.password,
                full_name=body.full_name,
                role=body.role,
            ),
            tenant_id=current_user.tenant_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        worker_number=user.worker_number,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    try:
        data = authenticate_user(db=db, email=body.email, password=body.password)
        return TokenResponse(**data)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        onboarding_done=user.onboarding_done,
        worker_number=user.worker_number,
    )


@router.get("/me/trial-status", response_model=TrialStatusResponse)
def trial_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_trial_status(db, current_user.tenant_id)


@router.post("/me/onboarding-done", status_code=204)
def mark_onboarding_done(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca el onboarding como completado para no volver a mostrarlo."""
    current_user.onboarding_done = True
    db.commit()


@router.patch("/me", response_model=MeResponse)
def update_me(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = update_profile(db, current_user, body.full_name)
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        onboarding_done=user.onboarding_done,
        worker_number=user.worker_number,
    )


@router.post("/me/password", status_code=204)
def update_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        change_password(db, current_user, body.current_password, body.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/users", response_model=list[MeResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: lista los usuarios de su taller."""
    users = (
        db.query(User)
        .filter(User.tenant_id == current_user.tenant_id)
        .order_by(
            func.lower(func.coalesce(User.full_name, User.email)).asc(), User.id.asc()
        )
        .all()
    )
    return [
        MeResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            onboarding_done=u.onboarding_done,
            worker_number=u.worker_number,
        )
        for u in users
    ]
