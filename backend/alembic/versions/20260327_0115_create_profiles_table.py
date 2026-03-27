"""create profiles table

Revision ID: 20260327_0115
Revises: 20260327_0055
Create Date: 2026-03-27 01:15:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_0115"
down_revision = "20260327_0055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("display_name", sa.String(length=64), nullable=False, server_default="Adventurer"),
        sa.Column("primary_account_rsn", sa.String(length=12), nullable=True),
        sa.Column("play_style", sa.String(length=24), nullable=False, server_default="balanced"),
        sa.Column("goals_focus", sa.String(length=24), nullable=False, server_default="progression"),
        sa.Column("prefers_afk_methods", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("prefers_profitable_methods", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("profiles")
