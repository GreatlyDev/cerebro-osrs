from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""


from app.models.companion_connection import CompanionConnection  # noqa: E402,F401
from app.models.companion_link_session import CompanionLinkSession  # noqa: E402,F401

