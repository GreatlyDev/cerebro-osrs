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
        },
    )
    get_response = await client.get(f"/api/accounts/{account_id}/progress")

    assert patch_response.status_code == 200
    assert get_response.status_code == 200
    assert "fairytale i - growing pains" in get_response.json()["completed_quests"]
    assert "100 museum kudos" in get_response.json()["unlocked_transports"]
