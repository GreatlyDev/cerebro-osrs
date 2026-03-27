from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.account_snapshot import AccountSnapshot


class AccountContextService:
    async def get_account_by_rsn(
        self,
        db_session: AsyncSession,
        account_rsn: str | None,
    ) -> Account | None:
        if account_rsn is None:
            return None
        return await db_session.scalar(select(Account).where(Account.rsn == account_rsn))

    async def get_latest_snapshot(
        self,
        db_session: AsyncSession,
        account_rsn: str | None,
    ) -> AccountSnapshot | None:
        account = await self.get_account_by_rsn(db_session=db_session, account_rsn=account_rsn)
        if account is None:
            return None
        return await db_session.scalar(
            select(AccountSnapshot)
            .where(AccountSnapshot.account_id == account.id)
            .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
        )

    async def get_progress(
        self,
        db_session: AsyncSession,
        account_rsn: str | None,
    ) -> AccountProgress | None:
        account = await self.get_account_by_rsn(db_session=db_session, account_rsn=account_rsn)
        if account is None:
            return None
        return await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == account.id)
        )


account_context_service = AccountContextService()
