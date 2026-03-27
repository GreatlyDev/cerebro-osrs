from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String(64), nullable=False, default="Adventurer")
    primary_account_rsn: Mapped[str | None] = mapped_column(String(12), nullable=True)
    play_style: Mapped[str] = mapped_column(String(24), nullable=False, default="balanced")
    goals_focus: Mapped[str] = mapped_column(String(24), nullable=False, default="progression")
    prefers_afk_methods: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    prefers_profitable_methods: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
