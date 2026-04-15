import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_account_progress_can_be_created_and_read(client: AsyncClient) -> None:
    account = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account.json()["id"]

    patch_response = await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={
            "completed_quests": ["Fairytale I - Growing Pains"],
            "unlocked_transports": ["100 museum kudos", "digsite progress"],
            "owned_gear": ["Ahrim's robes"],
            "active_unlocks": ["Bone Voyage"],
        },
    )
    get_response = await client.get(f"/api/accounts/{account_id}/progress")

    assert patch_response.status_code == 200
    assert get_response.status_code == 200
    assert "fairytale i - growing pains" in get_response.json()["completed_quests"]
    assert "100 museum kudos" in get_response.json()["unlocked_transports"]
    assert "ahrim's robes" in get_response.json()["owned_gear"]
    assert "bone voyage" in get_response.json()["active_unlocks"]


@pytest.mark.asyncio
async def test_account_progress_round_trip_persists_and_normalizes_companion_fields(
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
