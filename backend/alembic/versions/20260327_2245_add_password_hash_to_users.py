"""add password hash to users

Revision ID: 20260327_2245
Revises: 20260327_2115
Create Date: 2026-03-27 22:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260327_2245"
down_revision = "20260327_2115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
