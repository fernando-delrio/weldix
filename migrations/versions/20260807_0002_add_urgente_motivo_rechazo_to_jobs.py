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


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("urgente", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column("jobs", sa.Column("motivo_rechazo", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "motivo_rechazo")
    op.drop_column("jobs", "urgente")
