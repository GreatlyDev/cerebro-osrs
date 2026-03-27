import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_skills_returns_supported_skills(client: AsyncClient) -> None:
    response = await client.get("/api/skills")

    assert response.status_code == 200
    assert response.json()["total"] >= 5
    assert any(item["key"] == "magic" for item in response.json()["items"])


@pytest.mark.asyncio
async def test_skill_recommendations_use_profile_preference(client: AsyncClient) -> None:
    await client.patch("/api/profile", json={"prefers_afk_methods": True})

    response = await client.get("/api/skills/magic/recommendations")

    assert response.status_code == 200
    assert response.json()["preference"] == "afk"
    assert response.json()["recommendations"][0]["preference"] == "afk"


@pytest.mark.asyncio
async def test_skill_recommendations_use_snapshot_context(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.get("/api/skills/woodcutting/recommendations?account_rsn=Zezima")

    assert response.status_code == 200
    assert response.json()["account_rsn"] == "Zezima"
    assert response.json()["current_level"] is not None
    assert response.json()["context"]["snapshot_used"] is True
