"""create account snapshots table

Revision ID: 20260327_0055
Revises: 20260327_0038
Create Date: 2026-03-27 00:55:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_0055"
down_revision = "20260327_0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("sync_status", sa.String(length=32), nullable=False),
        sa.Column("summary", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_account_snapshots_account_id", "account_snapshots", ["account_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_account_snapshots_account_id", table_name="account_snapshots")
    op.drop_table("account_snapshots")
