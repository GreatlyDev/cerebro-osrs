from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AccountProgress(Base):
    __tablename__ = "account_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    completed_quests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    completed_diaries: Mapped[dict[str, list[str]]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    unlocked_transports: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    owned_gear: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    equipped_gear: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False, default=dict)
    notable_items: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    active_unlocks: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    companion_state: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    notes: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
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

    account: Mapped["Account"] = relationship(back_populates="progress")
