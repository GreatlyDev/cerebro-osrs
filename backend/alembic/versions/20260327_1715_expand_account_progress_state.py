"""expand account progress state

Revision ID: 20260327_1715
Revises: 20260327_1625
Create Date: 2026-03-27 17:15:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_1715"
down_revision = "20260327_1625"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_progress",
        sa.Column("owned_gear", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column(
        "account_progress",
        sa.Column("active_unlocks", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.alter_column("account_progress", "owned_gear", server_default=None)
    op.alter_column("account_progress", "active_unlocks", server_default=None)


def downgrade() -> None:
    op.drop_column("account_progress", "active_unlocks")
    op.drop_column("account_progress", "owned_gear")
