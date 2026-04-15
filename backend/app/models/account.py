from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("user_id", "rsn", name="uq_accounts_user_id_rsn"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rsn: Mapped[str] = mapped_column(String(12), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    snapshots: Mapped[list["AccountSnapshot"]] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
    )
    progress: Mapped["AccountProgress | None"] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
        uselist=False,
    )
    companion_connection: Mapped["CompanionConnection | None"] = relationship(
        cascade="all, delete-orphan",
        uselist=False,
    )
    companion_link_sessions: Mapped[list["CompanionLinkSession"]] = relationship(
        cascade="all, delete-orphan",
    )
