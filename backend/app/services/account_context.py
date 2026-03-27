from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.account_snapshot import AccountSnapshot
from app.models.user import User


class AccountContextService:
    async def get_account_by_rsn(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
    ) -> Account | None:
        if account_rsn is None:
            return None
        return await db_session.scalar(
            select(Account).where(Account.user_id == user.id, Account.rsn == account_rsn)
        )

    async def get_latest_snapshot(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
    ) -> AccountSnapshot | None:
        snapshots = await self.get_recent_snapshots(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
            limit=1,
        )
        return snapshots[0] if snapshots else None

    async def get_recent_snapshots(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
        limit: int = 2,
    ) -> list[AccountSnapshot]:
        account = await self.get_account_by_rsn(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        if account is None:
            return []
        return list(
            (
                await db_session.scalars(
                    select(AccountSnapshot)
                    .where(AccountSnapshot.account_id == account.id)
                    .order_by(desc(AccountSnapshot.created_at), desc(AccountSnapshot.id))
                    .limit(limit)
                )
            ).all()
        )

    async def get_previous_snapshot(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
    ) -> AccountSnapshot | None:
        snapshots = await self.get_recent_snapshots(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
            limit=2,
        )
        if len(snapshots) < 2:
            return None
        return snapshots[1]

    async def get_progress(
        self,
        db_session: AsyncSession,
        user: User,
        account_rsn: str | None,
    ) -> AccountProgress | None:
        account = await self.get_account_by_rsn(
            db_session=db_session,
            user=user,
            account_rsn=account_rsn,
        )
        if account is None:
            return None
        return await db_session.scalar(select(AccountProgress).where(AccountProgress.account_id == account.id))


account_context_service = AccountContextService()
