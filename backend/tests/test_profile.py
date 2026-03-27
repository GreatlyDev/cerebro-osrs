import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile_creates_default_profile(client: AsyncClient) -> None:
    response = await client.get("/api/profile")

    assert response.status_code == 200
    assert response.json()["display_name"] == "Adventurer"
    assert response.json()["play_style"] == "balanced"
    assert response.json()["goals_focus"] == "progression"


@pytest.mark.asyncio
async def test_patch_profile_updates_preferences(client: AsyncClient) -> None:
    response = await client.patch(
        "/api/profile",
        json={
            "display_name": "Main Planner",
            "primary_account_rsn": "Zezima",
            "play_style": "afk",
            "goals_focus": "quest cape",
            "prefers_afk_methods": True,
            "prefers_profitable_methods": False,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["display_name"] == "Main Planner"
    assert payload["primary_account_rsn"] == "Zezima"
    assert payload["play_style"] == "afk"
    assert payload["goals_focus"] == "quest cape"
    assert payload["prefers_afk_methods"] is True
    assert payload["prefers_profitable_methods"] is False


@pytest.mark.asyncio
async def test_patch_profile_persists_for_future_reads(client: AsyncClient) -> None:
    await client.patch("/api/profile", json={"display_name": "Iron Planner"})

    response = await client.get("/api/profile")

    assert response.status_code == 200
    assert response.json()["display_name"] == "Iron Planner"
