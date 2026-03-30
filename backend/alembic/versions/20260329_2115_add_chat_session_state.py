"""add chat session state

Revision ID: 20260329_2115
Revises: 20260327_2245
Create Date: 2026-03-29 21:15:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260329_2115"
down_revision = "20260327_2245"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_sessions",
        sa.Column("session_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.alter_column("chat_sessions", "session_state", server_default=None)


def downgrade() -> None:
    op.drop_column("chat_sessions", "session_state")
