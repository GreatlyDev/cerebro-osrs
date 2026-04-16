from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from fastapi import HTTPException
from sqlalchemy import select, update

from app.models.companion_link_session import CompanionLinkSession
from app.schemas.account_progress import AccountProgressResponse
from app.schemas.companion import CompanionLinkExchangeRequest
from app.services.companion import companion_service


def test_account_progress_response_exposes_companion_state() -> None:
    payload = AccountProgressResponse.model_validate(
        {
            "id": 1,
            "account_id": 2,
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion"},
            "created_at": "2026-04-15T00:00:00Z",
            "updated_at": "2026-04-15T00:00:00Z",
        }
    )

    assert payload.completed_diaries["lumbridge_draynor"] == ["easy"]
    assert payload.equipped_gear["weapon"] == "dragon scimitar"
    assert payload.notable_items == ["barrows gloves"]
    assert payload.companion_state["source"] == "runelite_companion"


def test_companion_models_import() -> None:
    from app.models.companion_connection import CompanionConnection
    from app.models.companion_link_session import CompanionLinkSession

    assert CompanionLinkSession.__tablename__ == "companion_link_sessions"
    assert CompanionConnection.__tablename__ == "companion_connections"


@pytest.mark.asyncio
async def test_create_companion_link_session_returns_short_lived_token(
    client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "Gilganor"})

    response = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["link_token"]
    assert data["expires_at"]


@pytest.mark.asyncio
async def test_exchange_link_token_returns_scoped_sync_secret(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "PluginRsn"})
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
    )

    response = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-123",
            "plugin_version": "0.1.0",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["sync_secret"]
    assert data["account_id"] == account.json()["id"]
    assert data["rsn"] == "PluginRsn"
    assert data["status"] == "linked"


@pytest.mark.asyncio
async def test_exchange_link_token_rejects_expired_token(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
    db_session,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "ExpiredRsn"})
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
    )
    hashed_token = companion_service._hash_secret(link.json()["link_token"])
    session = await db_session.scalar(
        select(CompanionLinkSession).where(CompanionLinkSession.token_hash == hashed_token)
    )
    assert session is not None
    session.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    response = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-expired",
            "plugin_version": "0.1.0",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Link token is invalid or expired."


@pytest.mark.asyncio
async def test_exchange_link_token_rejects_replay_after_consumption(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "ReplayRsn"})
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
    )

    first_response = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-first",
            "plugin_version": "0.1.0",
        },
    )
    second_response = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-second",
            "plugin_version": "0.1.0",
        },
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 404
    assert second_response.json()["detail"] == "Link token is invalid or expired."


@pytest.mark.asyncio
async def test_exchange_link_token_rejects_if_another_consumer_wins_race(
    client: AsyncClient,
    db_session,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "RaceRsn"})
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
    )
    original_scalar = db_session.scalar
    race_triggered = False

    async def raced_scalar(statement):
        nonlocal race_triggered
        result = await original_scalar(statement)
        if isinstance(result, CompanionLinkSession) and not race_triggered:
            race_triggered = True
            await db_session.execute(
                update(CompanionLinkSession)
                .where(CompanionLinkSession.id == result.id)
                .values(consumed_at=datetime.now(UTC))
                .execution_options(synchronize_session=False)
            )
            await db_session.commit()
        return result

    db_session.scalar = raced_scalar  # type: ignore[method-assign]

    with pytest.raises(HTTPException) as exc_info:
        await companion_service.exchange_link_token(
            db_session=db_session,
            payload=CompanionLinkExchangeRequest(
                link_token=link.json()["link_token"],
                plugin_instance_id="plugin-race",
                plugin_version="0.1.0",
            ),
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Link token is invalid or expired."


@pytest.mark.asyncio
async def test_create_companion_link_session_requires_authentication(
    unauthenticated_client: AsyncClient,
) -> None:
    response = await unauthenticated_client.post("/api/companion/accounts/1/link-sessions")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing session token."


@pytest.mark.asyncio
async def test_create_companion_link_session_enforces_account_ownership(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "OwnedRsn"})
    second_login = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "second@example.com", "display_name": "Second Planner"},
    )
    second_headers = {"Authorization": f"Bearer {second_login.json()['session_token']}"}

    response = await unauthenticated_client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
        headers=second_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Account not found."


@pytest.mark.asyncio
async def test_companion_sync_updates_account_progress_and_status(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "SyncAware"})
    account_id = account.json()["id"]
    link = await client.post(f"/api/companion/accounts/{account_id}/link-sessions")
    exchange = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-abc",
            "plugin_version": "0.1.0",
        },
    )

    response = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": exchange.json()["sync_secret"]},
        json={
            "plugin_instance_id": "plugin-abc",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "active_unlocks": ["fossil island access"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "companion_state": {"quest_points": 200},
        },
    )

    assert response.status_code == 200
    progress = await client.get(f"/api/accounts/{account_id}/progress")
    account_response = await client.get(f"/api/accounts/{account_id}")
    account_list = await client.get("/api/accounts")

    assert progress.json()["completed_quests"] == ["bone voyage"]
    assert progress.json()["completed_diaries"]["lumbridge_draynor"] == ["easy"]
    assert progress.json()["equipped_gear"]["weapon"] == "dragon scimitar"
    assert progress.json()["unlocked_transports"] == ["fairy rings"]
    assert progress.json()["active_unlocks"] == ["fossil island access"]
    assert progress.json()["owned_gear"] == ["dragon scimitar"]
    assert progress.json()["notable_items"] == ["barrows gloves"]
    assert progress.json()["companion_state"]["source"] == "runelite_companion"
    assert progress.json()["companion_state"]["plugin_instance_id"] == "plugin-abc"
    assert progress.json()["companion_state"]["plugin_version"] == "0.1.0"
    assert progress.json()["companion_state"]["quest_points"] == 200
    assert account_response.json()["companion_status"] == "linked"
    assert account_response.json()["companion_last_synced_at"] is not None
    assert account_list.json()["items"][0]["companion_status"] == "linked"


@pytest.mark.asyncio
async def test_companion_sync_rejects_invalid_sync_secret(
    unauthenticated_client: AsyncClient,
) -> None:
    response = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": "invalid-secret"},
        json={
            "plugin_instance_id": "plugin-invalid",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage"],
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Companion sync secret is invalid."


@pytest.mark.asyncio
async def test_companion_partial_sync_preserves_existing_state_when_fields_are_omitted(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "PartialSync"})
    account_id = account.json()["id"]
    link = await client.post(f"/api/companion/accounts/{account_id}/link-sessions")
    exchange = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-preserve",
            "plugin_version": "0.1.0",
        },
    )
    sync_secret = exchange.json()["sync_secret"]

    initial_sync = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": sync_secret},
        json={
            "plugin_instance_id": "plugin-preserve",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "active_unlocks": ["fossil island access"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "companion_state": {"quest_points": 200},
        },
    )

    assert initial_sync.status_code == 200

    partial_sync = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": sync_secret},
        json={
            "plugin_instance_id": "plugin-preserve",
            "plugin_version": "0.2.0",
            "notable_items": [],
        },
    )

    assert partial_sync.status_code == 200

    progress = await client.get(f"/api/accounts/{account_id}/progress")

    assert progress.json()["completed_quests"] == ["bone voyage"]
    assert progress.json()["completed_diaries"] == {"lumbridge_draynor": ["easy"]}
    assert progress.json()["unlocked_transports"] == ["fairy rings"]
    assert progress.json()["active_unlocks"] == ["fossil island access"]
    assert progress.json()["owned_gear"] == ["dragon scimitar"]
    assert progress.json()["equipped_gear"] == {"weapon": "dragon scimitar"}
    assert progress.json()["notable_items"] == []
    assert progress.json()["companion_state"]["quest_points"] == 200
    assert progress.json()["companion_state"]["plugin_version"] == "0.2.0"


@pytest.mark.asyncio
async def test_companion_first_sparse_sync_initializes_missing_fields(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "SparseSync"})
    account_id = account.json()["id"]
    link = await client.post(f"/api/companion/accounts/{account_id}/link-sessions")
    exchange = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-sparse",
            "plugin_version": "0.1.0",
        },
    )

    sync = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": exchange.json()["sync_secret"]},
        json={
            "plugin_instance_id": "plugin-sparse",
            "plugin_version": "0.1.0",
            "notable_items": ["barrows gloves"],
        },
    )

    assert sync.status_code == 200

    progress = await client.get(f"/api/accounts/{account_id}/progress")
    assert progress.status_code == 200
    assert progress.json()["completed_quests"] == []
    assert progress.json()["completed_diaries"] == {}
    assert progress.json()["unlocked_transports"] == []
    assert progress.json()["owned_gear"] == []
    assert progress.json()["equipped_gear"] == {}
    assert progress.json()["active_unlocks"] == []
    assert progress.json()["notable_items"] == ["barrows gloves"]
    assert progress.json()["companion_state"]["source"] == "runelite_companion"


@pytest.mark.asyncio
async def test_companion_progress_round_trip_persists_and_normalizes_api_fields(
    client: AsyncClient,
) -> None:
    account = await client.post("/api/accounts", json={"rsn": "Progress Pal"})
    account_id = account.json()["id"]

    patch_response = await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_diaries": {
                "  Lumbridge   Draynor  ": [" EASY ", "easy", " Medium "],
                "  Varrock ": [" hard ", "Hard", " elite "],
            },
            "equipped_gear": {
                " Weapon ": " Dragon Scimitar ",
                " CAPE": " Ardougne Cloak 1 ",
            },
            "notable_items": [" Barrows Gloves ", "barrows gloves", " Rune pouch "],
            "companion_state": {"source": "runelite_companion", "last_sync": "2026-04-15T00:00:00Z"},
        },
    )
    get_response = await client.get(f"/api/accounts/{account_id}/progress")

    expected_diaries = {
        "lumbridge draynor": ["easy", "medium"],
        "varrock": ["elite", "hard"],
    }
    expected_equipped_gear = {
        "cape": "ardougne cloak 1",
        "weapon": "dragon scimitar",
    }

    assert patch_response.status_code == 200
    assert get_response.status_code == 200
    assert patch_response.json()["completed_diaries"] == expected_diaries
    assert get_response.json()["completed_diaries"] == expected_diaries
    assert patch_response.json()["equipped_gear"] == expected_equipped_gear
    assert get_response.json()["equipped_gear"] == expected_equipped_gear
    assert patch_response.json()["notable_items"] == ["barrows gloves", "rune pouch"]
    assert get_response.json()["notable_items"] == ["barrows gloves", "rune pouch"]
    assert patch_response.json()["companion_state"] == {
        "source": "runelite_companion",
        "last_sync": "2026-04-15T00:00:00Z",
    }
    assert get_response.json()["companion_state"] == {
        "source": "runelite_companion",
        "last_sync": "2026-04-15T00:00:00Z",
    }


@pytest.mark.asyncio
async def test_companion_link_and_sync_make_chat_more_account_aware(
    client: AsyncClient,
    unauthenticated_client: AsyncClient,
) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "End To End"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "EndToEnd"}, cookies=cookies)
    account_id = account.json()["id"]

    await client.post(f"/api/accounts/{account_id}/sync", cookies=cookies)
    await client.post(
        "/api/goals",
        cookies=cookies,
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "EndToEnd"},
    )

    link = await client.post(
        f"/api/companion/accounts/{account_id}/link-sessions",
        cookies=cookies,
    )
    exchange = await unauthenticated_client.post(
        "/api/companion/link",
        json={
            "link_token": link.json()["link_token"],
            "plugin_instance_id": "plugin-final",
            "plugin_version": "0.1.0",
        },
    )
    sync = await unauthenticated_client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": exchange.json()["sync_secret"]},
        json={
            "plugin_instance_id": "plugin-final",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage", "fairytale i - growing pains"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "active_unlocks": ["fossil island access"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "companion_state": {"quest_points": 200},
        },
    )

    assert sync.status_code == 200

    session = await client.post(
        "/api/chat/sessions",
        json={"title": "Companion Aware"},
        cookies=cookies,
    )
    response = await client.post(
        f"/api/chat/sessions/{session.json()['id']}/messages",
        cookies=cookies,
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "next utility unlock" in content
    assert "travel savings" in content or "broader account utility" in content
    assert "fairy ring" not in content
    assert "bone voyage" not in content
    assert "fossil island" not in content
    assert "digsite pendant" not in content
