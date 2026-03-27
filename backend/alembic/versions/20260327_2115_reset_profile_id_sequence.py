"""reset profile id sequence

Revision ID: 20260327_2115
Revises: 20260327_2105
Create Date: 2026-03-27 21:15:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_2115"
down_revision = "20260327_2105"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            SELECT setval(
                pg_get_serial_sequence('profiles', 'id'),
                COALESCE((SELECT MAX(id) FROM profiles), 1),
                true
            )
            """
        )
    )


def downgrade() -> None:
    pass
