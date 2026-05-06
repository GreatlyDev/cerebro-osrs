import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_account_persists_record(client: AsyncClient) -> None:
    response = await client.post("/api/accounts", json={"rsn": "Zezima"})

    assert response.status_code == 201
    assert response.json()["rsn"] == "Zezima"
    assert response.json()["is_active"] is True


@pytest.mark.asyncio
async def test_create_account_rejects_duplicate_rsn(client: AsyncClient) -> None:
    first_response = await client.post("/api/accounts", json={"rsn": "Lynx Titan"})
    second_response = await client.post("/api/accounts", json={"rsn": "Lynx Titan"})

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "An account with that RSN already exists."


@pytest.mark.asyncio
async def test_create_account_allows_same_rsn_for_different_user(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    first_response = await client.post("/api/accounts", json={"rsn": "Lynx Titan"})
    second_login = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "second@example.com", "display_name": "Second Planner"},
    )
    second_headers = {"Authorization": f"Bearer {second_login.json()['session_token']}"}
    second_response = await unauthenticated_client.post(
        "/api/accounts",
        json={"rsn": "Lynx Titan"},
        headers=second_headers,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert second_response.json()["rsn"] == "Lynx Titan"


@pytest.mark.asyncio
async def test_create_account_normalizes_whitespace(client: AsyncClient) -> None:
    response = await client.post("/api/accounts", json={"rsn": "  Settled   "})

    assert response.status_code == 201
    assert response.json()["rsn"] == "Settled"


@pytest.mark.asyncio
async def test_list_accounts_returns_created_accounts(client: AsyncClient) -> None:
    await client.post("/api/accounts", json={"rsn": "Zezima"})
    await client.post("/api/accounts", json={"rsn": "B0aty"})

    response = await client.get("/api/accounts")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert [item["rsn"] for item in response.json()["items"]] == ["Zezima", "B0aty"]


@pytest.mark.asyncio
async def test_get_account_returns_single_account(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Settled"})
    account_id = create_response.json()["id"]

    response = await client.get(f"/api/accounts/{account_id}")

    assert response.status_code == 200
    assert response.json()["id"] == account_id
    assert response.json()["rsn"] == "Settled"


@pytest.mark.asyncio
async def test_sync_account_creates_snapshot(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Mudkip"})
    account_id = create_response.json()["id"]

    response = await client.post(f"/api/accounts/{account_id}/sync")

    assert response.status_code == 202
    assert response.json()["account_id"] == account_id
    assert response.json()["snapshot_id"] > 0
    assert response.json()["detail"] == "Account sync completed from OSRS hiscores and snapshot stored."


@pytest.mark.asyncio
async def test_get_latest_account_snapshot(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Boaty"})
    account_id = create_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.get(f"/api/accounts/{account_id}/snapshot")

    assert response.status_code == 200
    assert response.json()["account_id"] == account_id
    assert response.json()["summary"]["rsn"] == "Boaty"
    assert response.json()["source"] == "osrs_hiscores"
    assert response.json()["summary"]["combat_level"] == 126
    assert response.json()["summary"]["top_skills"][0]["skill"] == "magic"
    assert response.json()["summary"]["activity_overview"]["tracked_activity_count"] == 1


@pytest.mark.asyncio
async def test_list_recent_account_snapshots_returns_latest_first(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Historycape"})
    account_id = create_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.get(f"/api/accounts/{account_id}/snapshots?limit=2")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert payload["items"][0]["id"] > payload["items"][1]["id"]


@pytest.mark.asyncio
async def test_update_account_progress_preserves_companion_fields_when_omitted(
    client: AsyncClient,
) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "CompSafe"})
    account_id = create_response.json()["id"]

    seeded = await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion", "quest_points": 200},
        },
    )

    assert seeded.status_code == 200

    updated = await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_quests": ["bone voyage", "fairytale i - growing pains"],
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["dragon scimitar"],
            "active_unlocks": ["fossil island access", "digsite pendant access"],
        },
    )

    assert updated.status_code == 200
    payload = updated.json()
    assert payload["completed_diaries"] == {"lumbridge draynor": ["easy"]}
    assert payload["equipped_gear"] == {"weapon": "dragon scimitar"}
    assert payload["notable_items"] == ["barrows gloves"]
    assert payload["companion_state"] == {"source": "runelite_companion", "quest_points": 200}


@pytest.mark.asyncio
async def test_get_account_brain_returns_unified_account_context(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "BrainView"})
    account_id = create_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        "/api/profile",
        json={
            "primary_account_rsn": "BrainView",
            "play_style": "balanced",
            "goals_focus": "progression",
            "prefers_afk_methods": True,
        },
    )
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "BrainView"},
    )
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
            "companion_state": {"source": "runelite_companion", "last_sync_status": "ok"},
        },
    )

    response = await client.get(f"/api/accounts/{account_id}/brain")

    assert response.status_code == 200
    payload = response.json()
    assert payload["account_id"] == account_id
    assert payload["account_rsn"] == "BrainView"
    assert payload["identity"]["active_goal"] == "Quest Cape"
    assert payload["identity"]["play_style"] == "balanced"
    assert payload["stats"]["overall_level"] == 2277
    assert payload["stats"]["combat_level"] == 126
    assert payload["companion_awareness"]["sync_active"] is True
    assert payload["companion_awareness"]["completed_quest_count"] == 1
    assert "fairy rings" in payload["companion_awareness"]["transport_unlocks"]
    assert "abyssal whip" in payload["companion_awareness"]["owned_gear"]
    assert "fossil island access" in payload["planning_signals"]["avoid_known_unlocks"]
    assert "Account brain packet" in payload["advisor_brief"]


@pytest.mark.asyncio
async def test_get_account_brain_reports_high_confidence_when_sources_are_rich(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "ReadyBrain"})
    account_id = create_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        "/api/profile",
        json={"primary_account_rsn": "ReadyBrain", "play_style": "balanced"},
    )
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_quests": ["bone voyage", "fairytale i - growing pains"],
            "completed_diaries": {"lumbridge": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["abyssal whip"],
            "equipped_gear": {"weapon": "abyssal whip"},
            "notable_items": ["amulet of fury"],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion", "last_sync_status": "ok"},
        },
    )

    response = await client.get(f"/api/accounts/{account_id}/brain")

    assert response.status_code == 200
    readiness = response.json()["readiness"]
    assert readiness["confidence"] == "high"
    assert "hiscores" in readiness["trusted_sources"]
    assert "runelite companion" in readiness["trusted_sources"]
    assert "equipped gear" in readiness["trusted_sources"]
    assert "bank sync" in readiness["missing_inputs"]
    assert readiness["next_sync_needed"] == "bank sync"
    assert "bank state is missing" in readiness["advisor_warning"].lower()
    assert "Readiness:" in response.json()["advisor_brief"]


@pytest.mark.asyncio
async def test_get_account_brain_reports_low_confidence_when_account_state_is_sparse(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "SparseBrain"})
    account_id = create_response.json()["id"]

    response = await client.get(f"/api/accounts/{account_id}/brain")

    assert response.status_code == 200
    readiness = response.json()["readiness"]
    assert readiness["confidence"] == "low"
    assert "hiscores sync" in readiness["missing_inputs"]
    assert "runelite companion sync" in readiness["missing_inputs"]
    assert "active goal" in readiness["missing_inputs"]
    assert readiness["next_sync_needed"] == "hiscores sync"
    assert "not assume quest completion" in readiness["advisor_warning"].lower()


@pytest.mark.asyncio
async def test_get_account_brain_rejects_other_users_account(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "PrivateBrain"})
    account_id = create_response.json()["id"]
    second_login = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "brain-second@example.com", "display_name": "Second Brain"},
    )
    second_headers = {"Authorization": f"Bearer {second_login.json()['session_token']}"}

    response = await unauthenticated_client.get(
        f"/api/accounts/{account_id}/brain",
        headers=second_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Account not found."
