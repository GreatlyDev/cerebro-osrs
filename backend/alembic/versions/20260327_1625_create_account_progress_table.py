"""create account progress table

Revision ID: 20260327_1625
Revises: 20260327_0155
Create Date: 2026-03-27 16:25:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_1625"
down_revision = "20260327_0155"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_progress",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("completed_quests", sa.JSON(), nullable=False),
        sa.Column("unlocked_transports", sa.JSON(), nullable=False),
        sa.Column("notes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("account_id"),
    )
    op.create_index("ix_account_progress_account_id", "account_progress", ["account_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_account_progress_account_id", table_name="account_progress")
    op.drop_table("account_progress")
