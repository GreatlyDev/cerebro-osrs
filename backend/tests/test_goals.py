import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_goal_persists_record(client: AsyncClient) -> None:
    response = await client.post(
        "/api/goals",
        json={
            "title": "Quest Cape",
            "goal_type": "quest cape",
            "target_account_rsn": "Zezima",
            "notes": "Long-term progression target",
        },
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Quest Cape"
    assert response.json()["status"] == "active"


@pytest.mark.asyncio
async def test_list_goals_returns_created_goals(client: AsyncClient) -> None:
    await client.post("/api/goals", json={"title": "Fire Cape", "goal_type": "fire cape"})
    await client.post("/api/goals", json={"title": "Barrows Gloves", "goal_type": "barrows gloves"})

    response = await client.get("/api/goals")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert response.json()["items"][0]["title"] == "Barrows Gloves"


@pytest.mark.asyncio
async def test_generate_goal_plan_uses_snapshot_context(client: AsyncClient) -> None:
    await client.patch(
        "/api/profile",
        json={"play_style": "afk", "prefers_afk_methods": True},
    )
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    goal_response = await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Zezima"},
    )

    response = await client.post(f"/api/goals/{goal_response.json()['id']}/plan")

    assert response.status_code == 200
    assert response.json()["status"] == "generated"
    assert response.json()["context"]["snapshot_available"] is True
    assert any("AFK" in step or "AFK-friendly" in step for step in response.json()["steps"])
