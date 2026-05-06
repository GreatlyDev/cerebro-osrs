import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_snapshot import AccountSnapshot


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


@pytest.mark.asyncio
async def test_next_actions_downrank_owned_gear_and_boost_active_unlocks(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "PlannerMain"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "owned_gear": ["Ahrim's robes"],
            "active_unlocks": ["Bone Voyage"],
            "unlocked_transports": ["100 museum kudos", "digsite progress"],
        },
    )
    goal_response = await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "PlannerMain"},
    )

    response = await client.get(
        f"/api/recommendations/next-actions?goal_id={goal_response.json()['id']}&limit=4"
    )

    assert response.status_code == 200
    data = response.json()
    gear_action = next(action for action in data["actions"] if action["action_type"] == "gear")
    quest_action = next(action for action in data["actions"] if action["action_type"] == "quest")
    assert gear_action["target"]["item_name"] != "Ahrim's robes"
    assert gear_action["supporting_data"]["already_owned"] is False
    assert quest_action["supporting_data"]["active_unlock_match"] is True
    assert data["context"]["owned_gear_count"] == 1
    assert data["context"]["active_unlock_count"] == 1


@pytest.mark.asyncio
async def test_next_actions_report_snapshot_momentum(client: AsyncClient, db_session: AsyncSession) -> None:
    account = Account(user_id=1, rsn="Momentum")
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)

    db_session.add(
        AccountSnapshot(
            account_id=account.id,
            source="manual",
            sync_status="completed",
            summary={
                "overall_level": 100,
                "skills": {
                    "overall": {"level": 100},
                    "magic": {"level": 60},
                    "woodcutting": {"level": 50},
                },
            },
        )
    )
    db_session.add(
        AccountSnapshot(
            account_id=account.id,
            source="manual",
            sync_status="completed",
            summary={
                "overall_level": 103,
                "skills": {
                    "overall": {"level": 103},
                    "magic": {"level": 63},
                    "woodcutting": {"level": 50},
                },
            },
        )
    )
    await db_session.commit()

    goal_response = await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Momentum"},
    )
    response = await client.get(
        f"/api/recommendations/next-actions?goal_id={goal_response.json()['id']}&limit=4"
    )

    assert response.status_code == 200
    data = response.json()
    skill_action = next(action for action in data["actions"] if action["action_type"] == "skill")
    quest_action = next(action for action in data["actions"] if action["action_type"] == "quest")
    assert data["context"]["snapshot_delta_available"] is True
    assert data["context"]["overall_level_delta"] == 3
    assert "magic" in data["context"]["recently_progressed_skills"]
    assert skill_action["supporting_data"]["recent_momentum_detected"] is True
    assert quest_action["supporting_data"]["recent_momentum_detected"] is True


@pytest.mark.asyncio
async def test_next_actions_include_account_readiness_context(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ReadyRecs"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["abyssal whip"],
            "equipped_gear": {"weapon": "abyssal whip"},
            "notable_items": ["amulet of fury"],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion"},
        },
    )
    goal_response = await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "ReadyRecs"},
    )

    response = await client.get(
        f"/api/recommendations/next-actions?goal_id={goal_response.json()['id']}&limit=4"
    )

    assert response.status_code == 200
    data = response.json()
    readiness = data["context"]["account_readiness"]
    assert readiness["confidence"] == "high"
    assert readiness["next_sync_needed"] == "bank sync"
    assert "bank sync" in readiness["missing_inputs"]
    gear_action = next(action for action in data["actions"] if action["action_type"] == "gear")
    assert "readiness_warning" in gear_action["supporting_data"]
    assert "bank state is missing" in gear_action["supporting_data"]["readiness_warning"].lower()


@pytest.mark.asyncio
async def test_next_actions_warn_when_account_readiness_is_sparse(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SparseRecs"})
    account_id = account_response.json()["id"]

    response = await client.get(f"/api/recommendations/next-actions?account_rsn=SparseRecs&limit=4")

    assert response.status_code == 200
    readiness = response.json()["context"]["account_readiness"]
    assert readiness["confidence"] == "low"
    assert readiness["next_sync_needed"] == "hiscores sync"
    assert "hiscores sync" in readiness["missing_inputs"]
    assert "runelite companion sync" in readiness["missing_inputs"]
    assert "not assume quest completion" in readiness["advisor_warning"].lower()
