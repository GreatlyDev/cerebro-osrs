import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_next_actions_returns_ranked_recommendations(client: AsyncClient) -> None:
    await client.patch(
        "/api/profile",
        json={"play_style": "afk", "prefers_afk_methods": True, "primary_account_rsn": "Zezima"},
    )
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"unlocked_transports": ["100 museum kudos", "digsite progress"]},
    )
    goal_response = await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Zezima"},
    )

    response = await client.get(
        f"/api/recommendations/next-actions?goal_id={goal_response.json()['id']}&limit=3"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_title"] == "Quest Cape"
    assert data["top_action"]["action_type"] in {"quest", "skill"}
    assert {action["action_type"] for action in data["actions"]}.issubset(
        {"quest", "skill", "gear", "travel"}
    )
    assert data["actions"][0]["score"] >= data["actions"][1]["score"]
    assert data["context"]["snapshot_available"] is True
    assert data["context"]["returned_action_count"] == 3


@pytest.mark.asyncio
async def test_next_actions_supports_generic_progression_without_goal(client: AsyncClient) -> None:
    response = await client.get("/api/recommendations/next-actions")

    assert response.status_code == 200
    assert response.json()["top_action"] is not None
    assert response.json()["actions"][0]["title"]
