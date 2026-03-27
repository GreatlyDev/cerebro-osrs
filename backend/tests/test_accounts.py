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
async def test_create_account_normalizes_whitespace(client: AsyncClient) -> None:
    response = await client.post("/api/accounts", json={"rsn": "  Settled   "})

    assert response.status_code == 201
    assert response.json()["rsn"] == "Settled"


@pytest.mark.asyncio
async def test_sync_account_creates_snapshot(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Mudkip"})
    account_id = create_response.json()["id"]

    response = await client.post(f"/api/accounts/{account_id}/sync")

    assert response.status_code == 202
    assert response.json()["account_id"] == account_id
    assert response.json()["snapshot_id"] > 0


@pytest.mark.asyncio
async def test_get_latest_account_snapshot(client: AsyncClient) -> None:
    create_response = await client.post("/api/accounts", json={"rsn": "Boaty"})
    account_id = create_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    response = await client.get(f"/api/accounts/{account_id}/snapshot")

    assert response.status_code == 200
    assert response.json()["account_id"] == account_id
    assert response.json()["summary"]["rsn"] == "Boaty"
