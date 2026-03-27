from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_db_session
from app.main import app
from app.services.accounts import account_service


@pytest_asyncio.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db_session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_hiscores_client(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_fetch_account_summary(rsn: str) -> dict[str, object]:
        return {
            "rsn": rsn,
            "overall_rank": 123,
            "overall_level": 2277,
            "overall_experience": 4_600_000_000,
            "skills": {
                "overall": {
                    "rank": 123,
                    "level": 2277,
                    "experience": 4_600_000_000,
                }
            },
        }

    monkeypatch.setattr(
        account_service.hiscores_client,
        "fetch_account_summary",
        fake_fetch_account_summary,
    )
