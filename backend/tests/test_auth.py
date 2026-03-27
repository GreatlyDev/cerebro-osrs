import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dev_login_creates_session_and_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/dev-login",
        json={"email": "planner@example.com", "display_name": "Planner"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_token"]
    assert payload["user"]["email"] == "planner@example.com"
    assert payload["user"]["display_name"] == "Planner"


@pytest.mark.asyncio
async def test_get_session_returns_current_user(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.get("/api/auth/session", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == "planner@example.com"
