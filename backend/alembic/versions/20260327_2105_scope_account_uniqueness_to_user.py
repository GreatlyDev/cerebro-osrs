"""scope account uniqueness to user

Revision ID: 20260327_2105
Revises: 20260327_1945
Create Date: 2026-03-27 21:05:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_2105"
down_revision = "20260327_1945"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_accounts_rsn", table_name="accounts")
    op.create_index("ix_accounts_rsn", "accounts", ["rsn"], unique=False)
    op.create_unique_constraint(
        "uq_accounts_user_id_rsn",
        "accounts",
        ["user_id", "rsn"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_accounts_user_id_rsn", "accounts", type_="unique")
    op.drop_index("ix_accounts_rsn", table_name="accounts")
    op.create_index("ix_accounts_rsn", "accounts", ["rsn"], unique=True)
