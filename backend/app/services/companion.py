import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.companion_connection import CompanionConnection
from app.models.companion_link_session import CompanionLinkSession
from app.models.user import User
from app.schemas.companion import (
    CompanionLinkExchangeRequest,
    CompanionLinkExchangeResponse,
    CompanionLinkSessionResponse,
)


class CompanionService:
    def _hash_secret(self, raw: str) -> str:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _comparison_timestamp(self, expires_at: datetime, now: datetime) -> datetime:
        if expires_at.tzinfo is None:
            return now.replace(tzinfo=None)
        return now

    async def _get_owned_account(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> Account:
        account = await db_session.scalar(
            select(Account).where(Account.id == account_id, Account.user_id == user.id)
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found.",
            )
        return account

    async def create_link_session(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        account_id: int,
    ) -> CompanionLinkSessionResponse:
        account = await self._get_owned_account(
            db_session=db_session,
            user=user,
            account_id=account_id,
        )
        raw_token = secrets.token_urlsafe(24)
        expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session = CompanionLinkSession(
            user_id=user.id,
            account_id=account.id,
            token_hash=self._hash_secret(raw_token),
            expires_at=expires_at,
        )
        db_session.add(session)
        await db_session.commit()
        return CompanionLinkSessionResponse(link_token=raw_token, expires_at=expires_at)

    async def exchange_link_token(
        self,
        *,
        db_session: AsyncSession,
        payload: CompanionLinkExchangeRequest,
    ) -> CompanionLinkExchangeResponse:
        hashed_link_token = self._hash_secret(payload.link_token)
        session = await db_session.scalar(
            select(CompanionLinkSession).where(CompanionLinkSession.token_hash == hashed_link_token)
        )
        now = datetime.now(UTC)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link token is invalid or expired.",
            )
        consumed_at = self._comparison_timestamp(session.expires_at, now)
        consume_result = await db_session.execute(
            update(CompanionLinkSession)
            .where(
                CompanionLinkSession.id == session.id,
                CompanionLinkSession.consumed_at.is_(None),
                CompanionLinkSession.expires_at >= consumed_at,
            )
            .values(consumed_at=consumed_at)
        )
        if consume_result.rowcount != 1:
            await db_session.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link token is invalid or expired.",
            )

        account = await db_session.scalar(select(Account).where(Account.id == session.account_id))
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked account not found.",
            )

        raw_sync_secret = secrets.token_urlsafe(32)
        hashed_sync_secret = self._hash_secret(raw_sync_secret)
        connection = await db_session.scalar(
            select(CompanionConnection).where(CompanionConnection.account_id == account.id)
        )
        if connection is None:
            connection = CompanionConnection(
                account_id=account.id,
                sync_secret_hash=hashed_sync_secret,
                plugin_instance_id=payload.plugin_instance_id,
                plugin_version=payload.plugin_version,
                status="linked",
            )
            db_session.add(connection)
        else:
            connection.sync_secret_hash = hashed_sync_secret
            connection.plugin_instance_id = payload.plugin_instance_id
            connection.plugin_version = payload.plugin_version
            connection.status = "linked"

        await db_session.commit()
        return CompanionLinkExchangeResponse(
            sync_secret=raw_sync_secret,
            account_id=account.id,
            rsn=account.rsn,
            status="linked",
        )


companion_service = CompanionService()
