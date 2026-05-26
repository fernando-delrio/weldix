"""baseline schema

Revision ID: 20260526_0001
Revises:
Create Date: 2026-05-26
"""

from alembic import op

from backend.core.database import Base

import backend.features.auth.model  # noqa: F401
import backend.features.equipos.model  # noqa: F401
import backend.features.fichaje.model  # noqa: F401
import backend.features.fotos.model  # noqa: F401
import backend.features.historial.model  # noqa: F401
import backend.features.jobs.model  # noqa: F401
import backend.features.registro_horas.model  # noqa: F401
import backend.features.rrhh.model  # noqa: F401
import backend.features.stock.model  # noqa: F401

revision = "20260526_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
