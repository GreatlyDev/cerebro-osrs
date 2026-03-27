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
async def unauthenticated_client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_db_session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(unauthenticated_client: AsyncClient) -> dict[str, str]:
    response = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "planner@example.com", "display_name": "Planner"},
    )
    payload = response.json()
    return {"Authorization": f"Bearer {payload['session_token']}"}


@pytest_asyncio.fixture
async def client(
    unauthenticated_client: AsyncClient,
    auth_headers: dict[str, str],
) -> AsyncIterator[AsyncClient]:
    unauthenticated_client.headers.update(auth_headers)
    yield unauthenticated_client


@pytest.fixture(autouse=True)
def mock_hiscores_client(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return {
            "rsn": rsn,
            "overall_rank": 123,
            "overall_level": 2277,
            "overall_experience": 4_600_000_000,
            "combat_level": 126,
            "skills": {
                "overall": {
                    "rank": 123,
                    "level": 2277,
                    "experience": 4_600_000_000,
                },
                "magic": {
                    "rank": 2500,
                    "level": 82,
                    "experience": 2_250_000,
                },
                "woodcutting": {
                    "rank": 4100,
                    "level": 78,
                    "experience": 1_650_000,
                },
                "attack": {
                    "rank": 3200,
                    "level": 76,
                    "experience": 1_340_000,
                },
            },
            "top_skills": [
                {"skill": "magic", "level": 82, "experience": 2_250_000},
                {"skill": "woodcutting", "level": 78, "experience": 1_650_000},
            ],
            "skill_categories": {
                "combat": {"average_level": 79.0, "highest_level": 82, "lowest_level": 76},
                "gathering": {"average_level": 78.0, "highest_level": 78, "lowest_level": 78},
                "artisan": {"average_level": 1.0, "highest_level": 1, "lowest_level": 1},
                "utility": {"average_level": 1.0, "highest_level": 1, "lowest_level": 1},
            },
            "progression_profile": {
                "highest_skill": "magic",
                "lowest_tracked_skill": "attack",
                "total_skills_at_99": 0,
                "total_skills_at_90_plus": 0,
            },
            "activity_metrics": [{"position": 1, "rank": 44, "score": 123}],
            "activity_row_count": 1,
            "activity_overview": {"tracked_activity_count": 1, "active_activity_count": 1},
        }

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )
