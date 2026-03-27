import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile_creates_default_profile(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/profile")

    assert response.status_code == 200
    assert response.json()["display_name"] == "Planner"
    assert response.json()["play_style"] == "balanced"
    assert response.json()["goals_focus"] == "progression"


@pytest.mark.asyncio
async def test_patch_profile_updates_preferences(
    client: AsyncClient,
) -> None:
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
async def test_patch_profile_persists_for_future_reads(
    client: AsyncClient,
) -> None:
    await client.patch("/api/profile", json={"display_name": "Iron Planner"})

    response = await client.get("/api/profile")

    assert response.status_code == 200
    assert response.json()["display_name"] == "Iron Planner"


@pytest.mark.asyncio
async def test_get_profile_creates_distinct_profile_for_second_user(
    unauthenticated_client: AsyncClient,
) -> None:
    first_login_response = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "planner@example.com", "display_name": "Planner"},
    )
    first_headers = {"Authorization": f"Bearer {first_login_response.json()['session_token']}"}
    first_profile_response = await unauthenticated_client.get("/api/profile", headers=first_headers)

    login_response = await unauthenticated_client.post(
        "/api/auth/dev-login",
        json={"email": "second@example.com", "display_name": "Second Planner"},
    )
    auth_headers = {"Authorization": f"Bearer {login_response.json()['session_token']}"}

    response = await unauthenticated_client.get("/api/profile", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["display_name"] == "Second Planner"
    assert response.json()["id"] != first_profile_response.json()["id"]


@pytest.mark.asyncio
async def test_profile_requires_authentication(unauthenticated_client: AsyncClient) -> None:
    response = await unauthenticated_client.get("/api/profile")

    assert response.status_code == 401
