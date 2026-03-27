import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_quests_returns_catalog(client: AsyncClient) -> None:
    response = await client.get("/api/quests")

    assert response.status_code == 200
    assert response.json()["total"] >= 5
    assert any(item["id"] == "bone-voyage" for item in response.json()["items"])


@pytest.mark.asyncio
async def test_get_quest_returns_detailed_entry(client: AsyncClient) -> None:
    response = await client.get("/api/quests/recipe-for-disaster")

    assert response.status_code == 200
    assert response.json()["name"] == "Recipe for Disaster"
    assert "Barrows gloves" in " ".join(response.json()["rewards"])


@pytest.mark.asyncio
async def test_get_quest_returns_not_found_for_unknown_id(client: AsyncClient) -> None:
    response = await client.get("/api/quests/not-a-real-quest")

    assert response.status_code == 404
