import pytest
from httpx import AsyncClient

from app.schemas.account_progress import AccountProgressResponse


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
