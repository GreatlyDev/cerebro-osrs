"""create accounts table

Revision ID: 20260327_0038
Revises:
Create Date: 2026-03-27 00:38:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_0038"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("rsn", sa.String(length=12), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_accounts_id", "accounts", ["id"], unique=False)
    op.create_index("ix_accounts_rsn", "accounts", ["rsn"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_accounts_rsn", table_name="accounts")
    op.drop_index("ix_accounts_id", table_name="accounts")
    op.drop_table("accounts")
