import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_teleport_route_returns_curated_destination(client: AsyncClient) -> None:
    response = await client.post("/api/teleports/route", json={"destination": "barrows"})

    assert response.status_code == 200
    assert response.json()["destination"] == "barrows"
    assert response.json()["recommended_route"]["method"] == "Barrows teleport tablet"


@pytest.mark.asyncio
async def test_teleport_route_uses_profile_preference(client: AsyncClient) -> None:
    await client.patch("/api/profile", json={"prefers_afk_methods": True})

    response = await client.post("/api/teleports/route", json={"destination": "wintertodt"})

    assert response.status_code == 200
    assert response.json()["preference"] == "convenience"


@pytest.mark.asyncio
async def test_teleport_route_uses_snapshot_context(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.post(
        "/api/teleports/route",
        json={"destination": "fossil island", "account_rsn": "Zezima"},
    )

    assert response.status_code == 200
    assert response.json()["context"]["snapshot_used"] is True
    assert response.json()["recommended_route"]["method"] == "Digsite pendant"
