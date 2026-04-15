"""add companion sync tables

Revision ID: 20260415_0001
Revises: 20260329_2115
Create Date: 2026-04-15 00:01:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260415_0001"
down_revision = "20260329_2115"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "account_progress",
        sa.Column("completed_diaries", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.add_column(
        "account_progress",
        sa.Column("equipped_gear", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.add_column(
        "account_progress",
        sa.Column("notable_items", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )
    op.add_column(
        "account_progress",
        sa.Column("companion_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.alter_column("account_progress", "completed_diaries", server_default=None)
    op.alter_column("account_progress", "equipped_gear", server_default=None)
    op.alter_column("account_progress", "notable_items", server_default=None)
    op.alter_column("account_progress", "companion_state", server_default=None)

    op.create_table(
        "companion_link_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_companion_link_sessions_user_id",
        "companion_link_sessions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_companion_link_sessions_account_id",
        "companion_link_sessions",
        ["account_id"],
        unique=False,
    )
    op.create_index(
        "ix_companion_link_sessions_token_hash",
        "companion_link_sessions",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "companion_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("sync_secret_hash", sa.String(length=128), nullable=False),
        sa.Column("plugin_instance_id", sa.String(length=128), nullable=True),
        sa.Column("plugin_version", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_payload_summary", sa.String(length=255), nullable=True),
        sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )
    op.create_index(
        "ix_companion_connections_account_id",
        "companion_connections",
        ["account_id"],
        unique=True,
    )
    op.create_index(
        "ix_companion_connections_sync_secret_hash",
        "companion_connections",
        ["sync_secret_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_companion_connections_sync_secret_hash", table_name="companion_connections")
    op.drop_index("ix_companion_connections_account_id", table_name="companion_connections")
    op.drop_table("companion_connections")

    op.drop_index("ix_companion_link_sessions_token_hash", table_name="companion_link_sessions")
    op.drop_index("ix_companion_link_sessions_account_id", table_name="companion_link_sessions")
    op.drop_index("ix_companion_link_sessions_user_id", table_name="companion_link_sessions")
    op.drop_table("companion_link_sessions")

    op.drop_column("account_progress", "companion_state")
    op.drop_column("account_progress", "notable_items")
    op.drop_column("account_progress", "equipped_gear")
    op.drop_column("account_progress", "completed_diaries")
