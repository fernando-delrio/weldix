from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Weldix API"
    environment: str = "dev"

    database_url: str = "sqlite:///./weldix.db"
    auto_create_tables: bool = True

    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    seed_admin_on_startup: bool = False
    seed_admin_email: str | None = None
    seed_admin_password: str | None = None
    seed_admin_full_name: str = "Admin Weldix"

    seed_demo_data: bool = False  # Poner True en .env solo para entornos de desarrollo

    login_max_attempts: int = 5
    login_lock_minutes: int = 10

    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ]

    mistral_api_key: str | None = None

    # Stripe — obtener en https://dashboard.stripe.com/apikeys
    stripe_secret_key: str | None = None
    # Webhook secret — obtener en https://dashboard.stripe.com/webhooks tras crear el endpoint
    stripe_webhook_secret: str | None = None
    # IDs de precios en Stripe (crear en Products → Add product)
    stripe_price_starter: str | None = None  # ej: price_1ABC...
    stripe_price_pro: str | None = None  # ej: price_1DEF...
    # URL del frontend para redirigir tras checkout
    frontend_url: str = "http://localhost:5174"

    # Resend — emails transaccionales (https://resend.com)
    resend_api_key: str | None = None
    email_from: str = "Weldix <hola@weldix.app>"

    # n8n — automatizaciones (webhooks, WhatsApp, email cliente, etc.)
    # Formato: http://localhost:5678/webhook/weldix
    # Si está vacío, fire_webhook() no hace nada (modo silencioso)
    n8n_webhook_url: str | None = None

    # Super-admin interno — panel del founder para ver todos los workspaces
    # Poner en .env: SUPERADMIN_KEY=una-clave-secreta-larga
    superadmin_key: str | None = None


settings = Settings()
