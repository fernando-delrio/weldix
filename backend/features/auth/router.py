import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.email import send_password_reset_email, send_welcome_email
from backend.core.security import create_access_token
from backend.core.webhooks import fire_webhook

from .dependencies import get_current_user, require_role
from .model import User
from .registration import SignupData, SignupStrategyFactory
from .schemas import (
    AdminResetPasswordRequest,
    AdminSignupRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterWorkspaceRequest,
    RegisterWorkspaceResponse,
    ResetPasswordRequest,
    TokenResponse,
    TrialStatusResponse,
    UpdateProfileRequest,
)
from .service import (
    admin_reset_user_password,
    authenticate_user,
    change_password,
    check_rate_limit,
    create_workspace,
    do_reset_password,
    get_trial_status,
    regenerate_pin,
    request_password_reset,
    update_profile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
admin_signup_strategy = SignupStrategyFactory.for_admin_signup()


@router.post(
    "/register-workspace", response_model=RegisterWorkspaceResponse, status_code=201
)
def register_workspace(
    body: RegisterWorkspaceRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Registro público: un taller nuevo se registra en Weldix.
    Crea el Tenant + el primer usuario admin automáticamente.
    Devuelve un JWT listo para usar — el usuario queda logueado.
    """
    client_ip = request.client.host if request.client else "unknown"
    try:
        check_rate_limit(f"register:{client_ip}", max_hits=5, window_minutes=60)
    except ValueError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

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


@router.post("/forgot-password", status_code=204)
def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Solicita un reset de contraseña. Siempre responde 204 sin revelar
    si el email existe (evita enumeración de usuarios).
    El token se envía al webhook n8n que dispara el email al usuario.
    Rate-limit por email para evitar email-bombing a una víctima.
    """
    try:
        check_rate_limit(f"forgot:{body.email.lower().strip()}", max_hits=3, window_minutes=15)
    except ValueError:
        return  # Silencioso: mismo 204 que el happy path, no revela nada

    token = request_password_reset(db, body.email)
    if token:
        reset_link = f"{settings.frontend_url}/reset-password?token={token}"
        logger.info("Password reset requested for %s — link: %s", body.email, reset_link)
        # Canal principal: email directo por Resend (fiable, ya usado para bienvenida/trial).
        background_tasks.add_task(send_password_reset_email, body.email, reset_link)
        # Canal secundario opcional: webhook n8n (WhatsApp, etc.) si está configurado.
        background_tasks.add_task(
            fire_webhook,
            "password_reset_solicitado",
            {"email": body.email, "reset_link": reset_link},
        )


@router.post("/reset-password", status_code=204)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Valida el token y actualiza la contraseña. El token se invalida al usarse."""
    try:
        do_reset_password(db, body.token, body.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


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


@router.post("/admin/users/{user_id}/regenerar-pin")
def admin_regenerate_pin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: genera un PIN de kiosko nuevo (único en su taller) para un usuario."""
    try:
        pin = regenerate_pin(db, current_user, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"pin": pin}


@router.post("/admin/users/{user_id}/reset-password", status_code=204)
def admin_reset_password(
    user_id: int,
    body: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: fija una nueva contraseña para un operario de su taller (sin email)."""
    try:
        admin_reset_user_password(db, current_user, user_id, body.new_password)
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
