"""scope core data to users

Revision ID: 20260327_1945
Revises: 20260327_1835
Create Date: 2026-03-27 19:45:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260327_1945"
down_revision = "20260327_1835"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE accounts SET user_id = 1 WHERE user_id IS NULL"))
    op.alter_column("accounts", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_accounts_user_id_users",
        "accounts",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"], unique=False)

    op.add_column("goals", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE goals SET user_id = 1 WHERE user_id IS NULL"))
    op.alter_column("goals", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_goals_user_id_users",
        "goals",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"], unique=False)

    op.add_column("chat_sessions", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE chat_sessions SET user_id = 1 WHERE user_id IS NULL"))
    op.alter_column("chat_sessions", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_chat_sessions_user_id_users",
        "chat_sessions",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_chat_sessions_user_id", "chat_sessions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_chat_sessions_user_id", table_name="chat_sessions")
    op.drop_constraint("fk_chat_sessions_user_id_users", "chat_sessions", type_="foreignkey")
    op.drop_column("chat_sessions", "user_id")

    op.drop_index("ix_goals_user_id", table_name="goals")
    op.drop_constraint("fk_goals_user_id_users", "goals", type_="foreignkey")
    op.drop_column("goals", "user_id")

    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_constraint("fk_accounts_user_id_users", "accounts", type_="foreignkey")
    op.drop_column("accounts", "user_id")
