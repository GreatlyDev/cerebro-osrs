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
