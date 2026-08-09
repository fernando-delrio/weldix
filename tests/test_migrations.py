import os
import tempfile
import warnings

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from backend.core.config import settings


def _alembic_config() -> Config:
    # No fijamos "sqlalchemy.url" aqui: migrations/env.py SIEMPRE la sobreescribe
    # con settings.database_url (ese es el comportamiento correcto en produccion,
    # ver migrations/env.py). Para que el test use su propia base de datos temporal,
    # inyectamos la URL en el singleton `settings` (ver test), no en env.py.
    return Config("alembic.ini")


def test_add_urgente_and_motivo_rechazo_upgrade_and_downgrade():
    # ARRANGE — base de datos limpia en el estado anterior a esta migración
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    # Apuntamos el singleton de settings (el mismo que lee migrations/env.py)
    # a la BD temporal del test, sin tocar la lógica de resolución de env.py.
    original_database_url = settings.database_url
    settings.database_url = f"sqlite:///{db_path}"
    try:
        cfg = _alembic_config()

        # Create a minimal schema at baseline state (without urgente and motivo_rechazo)
        # We need to create the table structure BEFORE the baseline migration.
        # No podemos usar la migración baseline real (20260526_0001) para esto:
        # esa migración hace Base.metadata.create_all(), que refleja el modelo
        # Job ACTUAL (ya con urgente/motivo_rechazo tras el Step 1 de esta tarea).
        # Si la ejecutáramos, la tabla jobs ya tendría esas columnas y el
        # op.add_column() de la migración 20260807_0002 fallaría por columna duplicada.
        engine = create_engine(f"sqlite:///{db_path}")

        # Create tenants table (dependency)
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tenants (
                    id INTEGER PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL,
                    plan VARCHAR(30) NOT NULL DEFAULT 'free',
                    trial_expires_at DATETIME,
                    stripe_customer_id VARCHAR(255),
                    subscription_status VARCHAR(30),
                    is_demo BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create users table (dependency)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    tenant_id INTEGER,
                    email VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    role VARCHAR(30) NOT NULL DEFAULT 'operario',
                    password_hash VARCHAR(255) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(tenant_id) REFERENCES tenants(id)
                )
            """))

            # Create jobs table at baseline state (without urgente and motivo_rechazo)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY,
                    tenant_id INTEGER,
                    code VARCHAR(30),
                    titulo VARCHAR(255) NOT NULL,
                    cliente VARCHAR(255) NOT NULL,
                    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
                    operario_id INTEGER,
                    fecha_inicio DATE,
                    progreso INTEGER NOT NULL DEFAULT 0,
                    descripcion TEXT,
                    is_demo BOOLEAN NOT NULL DEFAULT 0,
                    public_token VARCHAR(64),
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(tenant_id) REFERENCES tenants(id),
                    FOREIGN KEY(operario_id) REFERENCES users(id)
                )
            """))

            # Insert test data
            conn.execute(text("""
                INSERT INTO tenants (id, nombre, slug, plan)
                VALUES (1, 'Test Taller', 'test-taller', 'free')
            """))

            conn.execute(text("""
                INSERT INTO jobs (tenant_id, titulo, cliente, estado, progreso, is_demo)
                VALUES (1, 'Fila previa a la migracion', 'Cliente', 'pendiente', 0, 0)
            """))

        # Mark baseline as applied in alembic
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT pk_alembic_version PRIMARY KEY (version_num)
                )
            """))
            conn.execute(text("DELETE FROM alembic_version"))
            conn.execute(text("INSERT INTO alembic_version VALUES ('20260526_0001')"))

        engine.dispose()

        # ACT — sube a la migración nueva
        command.upgrade(cfg, "head")

        # ASSERT — las columnas existen, y la fila que ya existía tiene el default correcto
        engine = create_engine(f"sqlite:///{db_path}")
        inspector = inspect(engine)
        columns = {c["name"] for c in inspector.get_columns("jobs")}
        assert "urgente" in columns
        assert "motivo_rechazo" in columns
        with engine.connect() as conn:
            row = conn.execute(text("SELECT urgente, motivo_rechazo FROM jobs")).first()
            # SQLite stores FALSE as 0 or 'false' depending on the driver
            assert row.urgente in (0, False, "false")
            assert row.motivo_rechazo is None

        engine.dispose()

        # ACT — downgrade
        command.downgrade(cfg, "20260526_0001")

        # ASSERT — las columnas desaparecen sin romper la tabla
        engine = create_engine(f"sqlite:///{db_path}")
        inspector = inspect(engine)
        columns_after = {c["name"] for c in inspector.get_columns("jobs")}
        assert "urgente" not in columns_after
        assert "motivo_rechazo" not in columns_after
        engine.dispose()
    finally:
        settings.database_url = original_database_url
        import time
        time.sleep(0.1)  # pequeña pausa para liberar handles (Windows)
        try:
            os.remove(db_path)
        except PermissionError:
            warnings.warn(
                f"No se pudo borrar el archivo temporal de test {db_path} "
                "(sigue bloqueado por un handle de SQLite en Windows). "
                "No afecta el resultado del test, pero queda basura en disco.",
                stacklevel=2,
            )
