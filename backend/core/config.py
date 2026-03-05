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

    
    login_max_attempts: int = 5
    login_lock_minutes: int = 10


settings = Settings()
