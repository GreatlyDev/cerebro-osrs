import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_chat_sessions(client: AsyncClient) -> None:
    create_response = await client.post("/api/chat/sessions", json={"title": "General Help"})
    list_response = await client.get("/api/chat/sessions")

    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["title"] == "General Help"


@pytest.mark.asyncio
async def test_send_chat_message_returns_structured_reply(client: AsyncClient) -> None:
    await client.patch("/api/profile", json={"play_style": "afk", "prefers_afk_methods": True})
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    await client.post(f"/api/accounts/{account_response.json()['id']}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Progression Advice"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What skill should I train next?"},
    )

    assert response.status_code == 201
    assert response.json()["user_message"]["role"] == "user"
    assert response.json()["assistant_message"]["role"] == "assistant"
    assert "woodcutting" in response.json()["assistant_message"]["content"].lower() or "magic" in response.json()["assistant_message"]["content"].lower()


@pytest.mark.asyncio
async def test_chat_can_reference_quest_guidance(client: AsyncClient) -> None:
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest Advice"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Which quest should I do for barrows gloves?"},
    )

    assert response.status_code == 201
    assert "recipe for disaster" in response.json()["assistant_message"]["content"].lower()


@pytest.mark.asyncio
async def test_chat_can_suggest_next_action_from_latest_goal(client: AsyncClient) -> None:
    await client.patch("/api/profile", json={"play_style": "afk", "prefers_afk_methods": True})
    account_response = await client.post("/api/accounts", json={"rsn": "Zezima"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"unlocked_transports": ["100 museum kudos", "digsite progress"]},
    )
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Zezima"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "What Next"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I do next?"},
    )

    assert response.status_code == 201
    assert "quest cape" in response.json()["assistant_message"]["content"].lower()
    assert "bone voyage" in response.json()["assistant_message"]["content"].lower()
    assert "already in a good spot" in response.json()["assistant_message"]["content"].lower()


@pytest.mark.asyncio
async def test_chat_can_answer_next_best_action_prompt(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "NextBest"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "NextBest"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Best Action"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What's my next best action?"},
    )

    assert response.status_code == 201
    assert "next best action" in response.json()["assistant_message"]["content"].lower()
