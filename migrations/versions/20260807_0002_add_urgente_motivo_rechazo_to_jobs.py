"""add urgente and motivo_rechazo to jobs

Revision ID: 20260807_0002
Revises: 20260526_0001
Create Date: 2026-08-07
"""

import sqlalchemy as sa
from alembic import op

revision = "20260807_0002"
down_revision = "20260526_0001"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    """El baseline (20260526_0001) crea el esquema con Base.metadata.create_all(),
    que refleja el modelo Python ACTUAL en el momento de ejecutarse -- no una foto
    fija del pasado. En una base de datos nueva, para cuando el baseline corre,
    Job ya tiene urgente/motivo_rechazo, así que esta migración encuentra las
    columnas ya creadas y el ALTER TABLE de abajo rompía con "column already
    exists". Solo hace falta el ALTER TABLE real en una base de datos que aplicó
    el baseline ANTES de que el modelo tuviera estos campos."""
    inspector = sa.inspect(op.get_bind())
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("jobs", "urgente"):
        op.add_column(
            "jobs",
            sa.Column("urgente", sa.Boolean(), nullable=False, server_default="false"),
        )
    if not _has_column("jobs", "motivo_rechazo"):
        op.add_column("jobs", sa.Column("motivo_rechazo", sa.Text(), nullable=True))


def downgrade() -> None:
    if _has_column("jobs", "motivo_rechazo"):
        op.drop_column("jobs", "motivo_rechazo")
    if _has_column("jobs", "urgente"):
        op.drop_column("jobs", "urgente")
