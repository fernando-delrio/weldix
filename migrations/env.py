from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from backend.core.config import settings
from backend.core.database import Base

# Import models so Alembic sees the full metadata graph.
import backend.features.auth.model  # noqa: F401
import backend.features.equipos.model  # noqa: F401
import backend.features.fichaje.model  # noqa: F401
import backend.features.fotos.model  # noqa: F401
import backend.features.historial.model  # noqa: F401
import backend.features.jobs.model  # noqa: F401
import backend.features.registro_horas.model  # noqa: F401
import backend.features.rrhh.model  # noqa: F401
import backend.features.stock.model  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
