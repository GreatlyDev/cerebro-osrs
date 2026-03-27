import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_gear_recommendations_return_results(client: AsyncClient) -> None:
    response = await client.post(
        "/api/gear/recommendations",
        json={
            "combat_style": "melee",
            "budget_tier": "budget",
            "current_gear": [],
        },
    )

    assert response.status_code == 200
    assert response.json()["combat_style"] == "melee"
    assert len(response.json()["recommendations"]) >= 2


@pytest.mark.asyncio
async def test_gear_recommendations_filter_owned_items(client: AsyncClient) -> None:
    response = await client.post(
        "/api/gear/recommendations",
        json={
            "combat_style": "melee",
            "budget_tier": "budget",
            "current_gear": ["Dragon scimitar"],
        },
    )

    assert response.status_code == 200
    assert all(
        recommendation["item_name"] != "Dragon scimitar"
        for recommendation in response.json()["recommendations"]
    )


@pytest.mark.asyncio
async def test_gear_recommendations_use_snapshot_context(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.post(
        "/api/gear/recommendations",
        json={
            "combat_style": "magic",
            "budget_tier": "midgame",
            "current_gear": [],
            "account_rsn": "Zezima",
        },
    )

    assert response.status_code == 200
    assert response.json()["context"]["snapshot_used"] is True
    assert response.json()["context"]["overall_level"] is not None
