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


@pytest.mark.asyncio
async def test_register_creates_password_backed_account(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "password@example.com",
            "display_name": "Password User",
            "password": "hunter2pass",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_token"]
    assert payload["user"]["email"] == "password@example.com"
    assert payload["user"]["display_name"] == "Password User"


@pytest.mark.asyncio
async def test_login_accepts_registered_password(client: AsyncClient) -> None:
    await client.post(
        "/api/auth/register",
        json={
            "email": "login@example.com",
            "display_name": "Login User",
            "password": "hunter2pass",
        },
    )

    response = await client.post(
        "/api/auth/login",
        json={
            "email": "login@example.com",
            "password": "hunter2pass",
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "login@example.com"


@pytest.mark.asyncio
async def test_register_upgrades_dev_account_without_password(client: AsyncClient) -> None:
    await client.post(
        "/api/auth/dev-login",
        json={"email": "legacy@example.com", "display_name": "Legacy User"},
    )

    response = await client.post(
        "/api/auth/register",
        json={
            "email": "legacy@example.com",
            "display_name": "Legacy User",
            "password": "hunter2pass",
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "legacy@example.com"


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(client: AsyncClient) -> None:
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrongpass@example.com",
            "display_name": "Wrong Pass",
            "password": "hunter2pass",
        },
    )

    response = await client.post(
        "/api/auth/login",
        json={
            "email": "wrongpass@example.com",
            "password": "badpassword",
        },
    )

    assert response.status_code == 401
