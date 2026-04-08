from uuid import uuid4

import pytest
from uuid import uuid4
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account_snapshot import AccountSnapshot
from app.models.chat import ChatSession
from app.services.assistant import assistant_service
from app.services.accounts import account_service
from app.services.chat import chat_service


def _sample_account_readout_summary(rsn: str) -> dict[str, object]:
    return {
        "rsn": rsn,
        "overall_rank": 123,
        "overall_level": 1800,
        "overall_experience": 125_000_000,
        "combat_level": 103,
        "skills": {
            "overall": {"rank": 123, "level": 1800, "experience": 125_000_000},
            "attack": {"rank": 3200, "level": 82, "experience": 2_100_000},
            "strength": {"rank": 3201, "level": 85, "experience": 3_200_000},
            "defence": {"rank": 3202, "level": 80, "experience": 1_950_000},
            "hitpoints": {"rank": 3203, "level": 86, "experience": 3_500_000},
            "ranged": {"rank": 3204, "level": 78, "experience": 1_700_000},
            "prayer": {"rank": 3205, "level": 70, "experience": 800_000},
            "magic": {"rank": 3206, "level": 82, "experience": 2_250_000},
            "mining": {"rank": 4200, "level": 61, "experience": 310_000},
            "fishing": {"rank": 4201, "level": 67, "experience": 520_000},
            "woodcutting": {"rank": 4202, "level": 74, "experience": 1_050_000},
            "hunter": {"rank": 4203, "level": 55, "experience": 190_000},
            "farming": {"rank": 4204, "level": 72, "experience": 930_000},
            "cooking": {"rank": 4300, "level": 69, "experience": 700_000},
            "crafting": {"rank": 4301, "level": 62, "experience": 340_000},
            "fletching": {"rank": 4302, "level": 58, "experience": 240_000},
            "firemaking": {"rank": 4303, "level": 66, "experience": 450_000},
            "herblore": {"rank": 4304, "level": 52, "experience": 150_000},
            "runecraft": {"rank": 4305, "level": 48, "experience": 115_000},
            "smithing": {"rank": 4306, "level": 54, "experience": 180_000},
            "construction": {"rank": 4307, "level": 50, "experience": 140_000},
            "agility": {"rank": 4400, "level": 47, "experience": 110_000},
            "thieving": {"rank": 4401, "level": 57, "experience": 220_000},
            "slayer": {"rank": 4402, "level": 60, "experience": 290_000},
        },
        "top_skills": [
            {"skill": "hitpoints", "level": 86, "experience": 3_500_000},
            {"skill": "strength", "level": 85, "experience": 3_200_000},
            {"skill": "attack", "level": 82, "experience": 2_100_000},
            {"skill": "magic", "level": 82, "experience": 2_250_000},
            {"skill": "defence", "level": 80, "experience": 1_950_000},
        ],
        "skill_categories": {
            "combat": {"average_level": 80.43, "highest_level": 86, "lowest_level": 70},
            "gathering": {"average_level": 65.8, "highest_level": 74, "lowest_level": 55},
            "artisan": {"average_level": 57.29, "highest_level": 69, "lowest_level": 48},
            "utility": {"average_level": 54.67, "highest_level": 60, "lowest_level": 47},
        },
        "progression_profile": {
            "highest_skill": "hitpoints",
            "lowest_tracked_skill": "agility",
            "total_skills_at_99": 0,
            "total_skills_at_90_plus": 0,
        },
        "activity_overview": {"tracked_activity_count": 0, "active_activity_count": 0},
        "activity_metrics": [],
        "activity_row_count": 0,
    }


@pytest.mark.asyncio
async def test_create_and_list_chat_sessions(client: AsyncClient) -> None:
    create_response = await client.post("/api/chat/sessions", json={"title": "General Help"})
    list_response = await client.get("/api/chat/sessions")

    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["title"] == "General Help"


@pytest.mark.asyncio
async def test_create_chat_session_initializes_session_state(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    create_response = await client.post("/api/chat/sessions", json={"title": "Stateful Chat"})

    assert create_response.status_code == 201
    session_id = create_response.json()["id"]
    stored = await db_session.get(ChatSession, session_id)
    assert stored is not None
    assert stored.session_state == {}


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


@pytest.mark.asyncio
async def test_chat_can_use_saved_session_state_for_training_follow_up(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "StateTrain"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "StateTrain"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "State Memory"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I train for that?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "bone voyage" in content
    assert "magic" in content


@pytest.mark.asyncio
async def test_chat_can_answer_work_on_next_prompt_without_goal(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Momentum"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "What Now"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I work on next?"},
    )

    assert response.status_code == 201
    assert "i'd start with" in response.json()["assistant_message"]["content"].lower()


@pytest.mark.asyncio
async def test_chat_can_answer_direct_skill_level_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SkillCheck"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Skill Check"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What is my fishing level?"},
    )

    assert response.status_code == 201
    assert response.json()["assistant_message"]["content"] == "Your Fishing level is 72."


@pytest.mark.asyncio
async def test_chat_can_answer_top_skills_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "TopSkills"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Top Skills"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What are my top skills right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "magic 82" in content
    assert "woodcutting 78" in content


@pytest.mark.asyncio
async def test_chat_can_summarize_account_state(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "AccountRead"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["barrows gloves"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Account Readout"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What stands out about my account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "overall level" in content
    assert "magic" in content
    assert "barrows gloves" in content


@pytest.mark.asyncio
async def test_chat_can_answer_balance_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "BalanceCheck"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Balance Check"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "How balanced is my account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "balanced" in content or "lopsided" in content or "uneven" in content
    assert "combat" in content or "gathering" in content or "artisan" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_suggest_account_questions(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": f"QS{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Question Starter"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I ask you about this account first?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "start by asking" in content
    assert "strongest" in content or "weakest" in content or "unlock" in content


@pytest.mark.asyncio
async def test_chat_can_identify_neglected_account_area(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"NA{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Neglected Area"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What area of my account am I neglecting right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "round out" in content or "neglected" in content or "shore up" in content
    assert "combat" in content or "gathering" in content or "artisan" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_to_fix_first_on_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"FF{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Fix First"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I fix first on this account?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fix" in content or "pay off" in content
    assert "utility" in content or "agility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_is_already_in_a_good_spot(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"GS{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Good Spot"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What part of my account is already in a good spot?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "good spot" in content or "stable" in content or "stronger parts" in content
    assert "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_overinvested_lane(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"OI{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Overinvested"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What part of my account am I overinvesting in?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "overinvested" in content or "ahead" in content or "heavily developed" in content
    assert "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_capitalization_lane(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Capitalize"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What lane is most ready to capitalize on right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "capitalize" in content or "momentum" in content
    assert "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_whether_account_is_bottlenecked_by_unlocks_or_stats(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"BT{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"], "unlocked_transports": []},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Bottleneck"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Am I more bottlenecked by unlocks or stats right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "bottlenecked" in content
    assert "unlock" in content or "stat" in content


@pytest.mark.asyncio
async def test_chat_can_identify_best_mix_of_utility_and_momentum(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"UM{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Utility Momentum"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What gives the best mix of utility and momentum right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "utility" in content and "momentum" in content
    assert "bone voyage" in content or "combat" in content


@pytest.mark.asyncio
async def test_chat_can_identify_easiest_lane_to_convert_this_week(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"TW{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "This Week"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What lane is easiest to convert into real progress this week?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "this week" in content or "real progress" in content
    assert "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_lane_that_loses_value_if_ignored(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"IG{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Ignored Lane"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What lane loses value if I ignore it?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "lose value" in content or "ignore" in content or "blocking" in content
    assert "bone voyage" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_under_leveraged_account_lane(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"UL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Under Leveraged"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What part of my account is under leveraged right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "under-leveraged" in content or "not fully leveraging" in content or "not compounding" in content
    assert "combat" in content or "bone voyage" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_to_revisit_after_a_few_days(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"RV{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Revisit Later"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I revisit after a few days?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "revisit" in content
    assert "bone voyage" in content or "few days" in content or "blockers" in content


@pytest.mark.asyncio
async def test_chat_can_identify_quietly_high_leverage_lane(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"QH{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Quiet Leverage"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What part of my account is quietly high leverage right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "high-leverage" in content or "high leverage" in content
    assert "bone voyage" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_hidden_opportunity_on_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"HO{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Hidden Opportunity"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Where is the hidden opportunity on my account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "hidden opportunity" in content or "hidden value" in content
    assert "bone voyage" in content or "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_kind_of_account_is_forming(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"ID{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Account Identity"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of account is this becoming?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "all-rounder" in content or "trending toward" in content
    assert "combat" in content or "hitpoints" in content


@pytest.mark.asyncio
async def test_chat_can_identify_natural_playstyle(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"PS{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Playstyle Read"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What playstyle does this account naturally support?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "naturally supports" in content or "naturally wants" in content
    assert "combat" in content or "progression" in content or "boss" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_content_account_is_built_for(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CT{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Content Read"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What content does this account look built for right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "built for" in content
    assert "combat" in content or "boss" in content or "quest" in content or "unlock" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_kind_of_player_would_enjoy_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"PL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Player Fit"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of player would enjoy this account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "player" in content and "account" in content
    assert "combat" in content or "progression" in content or "quest" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_content_is_one_unlock_away(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"OA{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "One Unlock Away"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What content is one unlock away from opening up right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "one unlock away" in content or "opening up" in content or "bridge" in content
    assert "bone voyage" in content or "combat" in content or "support unlock" in content


@pytest.mark.asyncio
async def test_chat_can_identify_safest_content_to_learn(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"SL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Learn Safely"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What content is safest to learn on this account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "safest" in content or "learn" in content or "forgiving" in content
    assert "combat" in content or "progression" in content or "unlock" in content


@pytest.mark.asyncio
async def test_chat_can_identify_best_progress_loop(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"LP{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Loop Fit"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of progress loop fits this account best right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "progress loop" in content or "loop" in content
    assert "combat" in content or "unlock" in content or "bank value" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_would_make_account_smoother_to_play(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"SM{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Smooth Play"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make this account feel smoother to play right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "smoother to play" in content or "feel smoother" in content or "friction" in content
    assert "bone voyage" in content or "utility" in content or "routing" in content


@pytest.mark.asyncio
async def test_chat_can_identify_best_routine_for_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"RT{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Routine Fit"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What routine fits this account best right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "routine" in content or "loop" in content
    assert "combat" in content or "unlock" in content or "profit" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_would_make_account_more_rewarding_to_play(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"RW{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Rewarding Play"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make this account feel more rewarding to play right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "rewarding to play" in content or "paying you back" in content or "cohesive" in content
    assert "bone voyage" in content or "combat" in content or "value" in content


@pytest.mark.asyncio
async def test_chat_can_identify_best_session_for_tonight(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"TN{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Tonight Session"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of session fits this account best tonight?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "best session" in content or "tonight" in content
    assert "combat" in content or "utility" in content or "session" in content


@pytest.mark.asyncio
async def test_chat_can_identify_best_kind_of_win_for_tomorrow_motivation(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"LG{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Tomorrow Motivation"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of win would make me want to log in again tomorrow?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "log in again tomorrow" in content or "come back tomorrow" in content or "worth logging into again" in content
    assert "bone voyage" in content or "bridge win" in content or "account value" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_would_make_tomorrows_session_better(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"TM{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Tomorrow Better"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make tomorrow's session better?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "tomorrow's session better" in content or "make tomorrow's session better" in content or "tomorrow feel" in content
    assert "bone voyage" in content or "support step" in content or "friction" in content


@pytest.mark.asyncio
async def test_chat_can_identify_confidence_building_session(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CB{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Confidence Session"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of session would build confidence on this account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "confidence" in content or "reliable" in content or "steady" in content
    assert "combat" in content or "utility" in content or "session" in content


@pytest.mark.asyncio
async def test_chat_can_identify_maintenance_habit_for_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"MH{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Maintenance Habit"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What habit would make this account easier to maintain over time?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "habit" in content or "maintain" in content or "consistency" in content
    assert "bone voyage" in content or "cleanup" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_how_to_keep_account_from_feeling_stale(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"ST{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Stay Fresh"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would keep this account from feeling stale right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "stale" in content or "interesting" in content or "alive" in content
    assert "bone voyage" in content or "combat" in content or "value" in content


@pytest.mark.asyncio
async def test_chat_can_identify_how_to_make_account_easier_to_return_to(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"BK{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Come Back Later"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make this account easier to return to after a break?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "return to after a break" in content or "future self" in content or "come back" in content
    assert "bone voyage" in content or "cleanup" in content or "usable" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_to_preserve_about_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"PR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Preserve Value"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I preserve about this account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "preserving" in content or "worth preserving" in content or "protect" in content
    assert "combat" in content or "traction" in content or "identity" in content


@pytest.mark.asyncio
async def test_chat_can_identify_how_to_make_account_more_coherent(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CO{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "More Coherent"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make this account feel more coherent right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "coherent" in content or "connected progression path" in content or "less fragmented" in content
    assert "bone voyage" in content or "combat" in content or "bridge work" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_needs_protecting_from_drift(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"DR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Protect Drift"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What part of the account needs protecting from drift?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "drift" in content or "protect" in content or "momentum" in content
    assert "combat" in content or "bone voyage" in content or "support" in content


@pytest.mark.asyncio
async def test_chat_can_identify_session_that_reinforces_account_identity(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"ID{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Account Identity"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of session would reinforce this account's identity?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "identity" in content or "like a real fighter" in content or "knows what it wants to be" in content
    assert "combat" in content or "supporting cleanup" in content or "usable" in content


@pytest.mark.asyncio
async def test_chat_can_identify_cleanup_that_makes_account_more_connected(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Cleanup Task"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What one cleanup task would make everything feel more connected?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "cleanup" in content or "connected" in content or "bridge work" in content
    assert "bone voyage" in content or "drag" in content or "flows" in content


@pytest.mark.asyncio
async def test_chat_can_identify_what_makes_account_more_resilient(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"RE{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Resilient Account"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What would make this account feel more resilient?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "resilient" in content or "recover" in content or "less dependent" in content
    assert "bone voyage" in content or "support" in content or "drag" in content


@pytest.mark.asyncio
async def test_chat_can_identify_burnout_pattern_for_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"BU{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Burnout Pattern"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of play pattern is likely to burn out this account?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "burn" in content or "stale" in content or "heavier" in content
    assert "combat" in content or "bone voyage" in content or "support" in content


@pytest.mark.asyncio
async def test_chat_can_identify_habit_that_keeps_progress_compounding(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"HB{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Compounding Habit"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What one habit would keep progress compounding without making the game feel like work?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "habit" in content or "compounding" in content or "momentum" in content
    assert "bone voyage" in content or "session" in content or "support" in content


@pytest.mark.asyncio
async def test_chat_can_identify_goal_that_fits_account_without_distorting_it(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"GF{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Fitting Goal"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of goal would fit this account without distorting it?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "goal" in content or "fits this account" in content or "aligned" in content
    assert "combat" in content or "utility" in content or "momentum" in content


@pytest.mark.asyncio
async def test_chat_can_identify_upgrade_that_feels_exciting_instead_of_obligatory(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"UG{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Exciting Upgrade"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of upgrade would feel exciting instead of obligatory?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "exciting" in content or "obligatory" in content or "changes how the account plays" in content
    assert "bone voyage" in content or "combat" in content or "lane" in content


@pytest.mark.asyncio
async def test_chat_can_identify_progress_that_keeps_account_alive_over_week(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"AL{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Alive Next Week"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of progress would keep this account feeling alive over the next week?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "alive" in content or "opening up" in content or "visible momentum" in content
    assert "bone voyage" in content or "combat" in content or "cleanup" in content


@pytest.mark.asyncio
async def test_chat_can_identify_milestone_that_feels_worth_chasing(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"MS{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Worth Chasing"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of milestone would feel genuinely worth chasing next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "milestone" in content or "worth chasing" in content or "earned in play" in content
    assert "bone voyage" in content or "combat" in content or "usable" in content


@pytest.mark.asyncio
async def test_chat_can_identify_grind_that_is_too_dry_for_account(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"DRY{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Too Dry"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of grind is too dry for this account right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "dry" in content or "heavier" in content or "responsible" in content
    assert "bone voyage" in content or "combat" in content or "setup" in content


@pytest.mark.asyncio
async def test_chat_can_identify_progress_that_makes_next_login_obvious(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"LOG{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Obvious Login"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What kind of progress would make the next login feel obvious instead of uncertain?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "next login" in content or "future self" in content or "continuation" in content
    assert "bone voyage" in content or "combat" in content or "cleanup" in content


@pytest.mark.asyncio
async def test_chat_can_identify_strength_wasted_by_missing_unlock(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"MU{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Missing Unlock"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What current strength is being wasted by a missing unlock?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "wasted" in content or "underused" in content or "not paying off" in content
    assert "bone voyage" in content or "combat" in content


@pytest.mark.asyncio
async def test_chat_can_identify_boring_task_with_disproportionate_value(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"BV{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Boring Value"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What boring task would create disproportionate future value?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "boring task" in content or "future value" in content or "friction" in content
    assert "bone voyage" in content or "utility" in content


@pytest.mark.asyncio
async def test_chat_can_identify_lane_closest_to_compounding(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        return _sample_account_readout_summary(rsn)

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    account_response = await client.post("/api/accounts", json={"rsn": f"CP{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["bone voyage"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Compounding"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What lane is closest to compounding if I bridge one missing piece?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "compounding" in content
    assert "bone voyage" in content or "combat" in content


@pytest.mark.asyncio
async def test_chat_can_answer_completed_quests_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "QuestTracker"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"completed_quests": ["bone voyage", "waterfall quest"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest State"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What completed quests do I have tracked?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "2 tracked completed quests" in content
    assert "bone voyage" in content


@pytest.mark.asyncio
async def test_chat_prefers_primary_account_for_personal_stat_questions(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_fetch_enriched_account_summary(rsn: str) -> dict[str, object]:
        fishing_level = 72 if rsn == "PrimaryOne" else 55
        return {
            "rsn": rsn,
            "overall_rank": 123,
            "overall_level": 2277 if rsn == "PrimaryOne" else 1800,
            "overall_experience": 4_600_000_000,
            "combat_level": 126 if rsn == "PrimaryOne" else 103,
            "skills": {
                "overall": {
                    "rank": 123,
                    "level": 2277 if rsn == "PrimaryOne" else 1800,
                    "experience": 4_600_000_000,
                },
                "magic": {
                    "rank": 2500,
                    "level": 82 if rsn == "PrimaryOne" else 70,
                    "experience": 2_250_000,
                },
                "woodcutting": {
                    "rank": 4100,
                    "level": 78 if rsn == "PrimaryOne" else 60,
                    "experience": 1_650_000,
                },
                "fishing": {
                    "rank": 5800,
                    "level": fishing_level,
                    "experience": 820_000,
                },
                "attack": {
                    "rank": 3200,
                    "level": 76 if rsn == "PrimaryOne" else 65,
                    "experience": 1_340_000,
                },
            },
            "top_skills": [
                {"skill": "magic", "level": 82 if rsn == "PrimaryOne" else 70, "experience": 2_250_000},
                {"skill": "woodcutting", "level": 78 if rsn == "PrimaryOne" else 60, "experience": 1_650_000},
            ],
            "skill_categories": {
                "combat": {"average_level": 79.0, "highest_level": 82, "lowest_level": 76},
                "gathering": {"average_level": 78.0, "highest_level": 78, "lowest_level": 72},
            },
            "progression_profile": {
                "highest_skill": "magic",
                "lowest_tracked_skill": "attack",
                "total_skills_at_99": 0,
                "total_skills_at_90_plus": 0,
            },
            "activity_metrics": [{"position": 1, "rank": 44, "score": 123}],
            "activity_row_count": 1,
            "activity_overview": {"tracked_activity_count": 1, "active_activity_count": 1},
        }

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_enriched_account_summary,
    )

    primary_response = await client.post("/api/accounts", json={"rsn": "PrimaryOne"})
    latest_response = await client.post("/api/accounts", json={"rsn": "LatestTwo"})
    await client.post(f"/api/accounts/{primary_response.json()['id']}/sync")
    await client.post(f"/api/accounts/{latest_response.json()['id']}/sync")
    await client.patch("/api/profile", json={"primary_account_rsn": "PrimaryOne"})
    session_response = await client.post("/api/chat/sessions", json={"title": "Primary Focus"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What is my fishing level?"},
    )

    assert response.status_code == 201
    assert response.json()["assistant_message"]["content"] == "Your Fishing level is 72."


@pytest.mark.asyncio
async def test_chat_can_answer_changes_since_last_sync_question(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "DeltaCheck"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")

    async def fake_fetch_updated_summary(rsn: str) -> dict[str, object]:
        return {
            "rsn": rsn,
            "overall_rank": 123,
            "overall_level": 2281,
            "overall_experience": 4_600_800_000,
            "combat_level": 127,
            "skills": {
                "overall": {
                    "rank": 123,
                    "level": 2281,
                    "experience": 4_600_800_000,
                },
                "magic": {
                    "rank": 2500,
                    "level": 83,
                    "experience": 2_350_000,
                },
                "woodcutting": {
                    "rank": 4100,
                    "level": 79,
                    "experience": 1_750_000,
                },
                "fishing": {
                    "rank": 5800,
                    "level": 73,
                    "experience": 920_000,
                },
                "attack": {
                    "rank": 3200,
                    "level": 76,
                    "experience": 1_340_000,
                },
            },
            "top_skills": [
                {"skill": "magic", "level": 83, "experience": 2_350_000},
                {"skill": "woodcutting", "level": 79, "experience": 1_750_000},
            ],
            "skill_categories": {
                "combat": {"average_level": 80.0, "highest_level": 83, "lowest_level": 76},
                "gathering": {"average_level": 79.0, "highest_level": 79, "lowest_level": 73},
            },
            "progression_profile": {
                "highest_skill": "magic",
                "lowest_tracked_skill": "attack",
                "total_skills_at_99": 0,
                "total_skills_at_90_plus": 0,
            },
            "activity_metrics": [{"position": 1, "rank": 44, "score": 123}],
            "activity_row_count": 1,
            "activity_overview": {"tracked_activity_count": 1, "active_activity_count": 1},
        }

    monkeypatch.setattr(
        account_service.ingestion_service,
        "fetch_enriched_account_summary",
        fake_fetch_updated_summary,
    )
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Sync Delta"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What changed since my last sync?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "overall level changed by +4" in content
    assert "combat level changed by +1" in content
    assert "fishing" in content


@pytest.mark.asyncio
async def test_chat_can_answer_quest_readiness_blockers_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "QuestReady"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest Readiness"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What am I missing for Bone Voyage?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "bone voyage" in content
    assert "100 museum kudos" in content
    assert "digsite progress" in content


@pytest.mark.asyncio
async def test_chat_can_answer_when_account_is_ready_for_quest(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ReadyNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"unlocked_transports": ["100 museum kudos", "digsite progress"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest Ready Now"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Am I ready for Bone Voyage?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "good spot" in content
    assert "bone voyage" in content


@pytest.mark.asyncio
async def test_chat_can_answer_best_route_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "TravelNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"completed_quests": ["bone voyage"], "unlocked_transports": ["digsite pendant"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Travel Advice"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "How do I get to Fossil Island?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fossil island" in content
    assert "digsite pendant" in content


@pytest.mark.asyncio
async def test_chat_can_answer_best_gear_upgrade_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "MagicGear"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"owned_gear": ["Ahrim's robes"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Gear Advice"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What magic gear upgrade should I get next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "magic" in content
    assert "toxic trident" in content


@pytest.mark.asyncio
async def test_chat_can_handle_route_follow_up_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "TravelFollow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"completed_quests": ["bone voyage"], "unlocked_transports": ["digsite pendant", "canifis access"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Travel Follow Up"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "How do I get to Fossil Island?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "And for Barrows?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "barrows" in content
    assert "canifis" in content or "barrows teleport tablet" in content


@pytest.mark.asyncio
async def test_chat_can_handle_gear_follow_up_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "GearFollow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Gear Follow Up"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What magic gear upgrade should I get next?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What about ranged?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "ranged" in content
    assert "blowpipe" in content


@pytest.mark.asyncio
async def test_chat_can_answer_boss_readiness_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "BossCheck"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Boss Readiness"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "Am I ready for Fight Caves?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fight caves" in content
    assert "ranged" in content
    assert "prayer" in content


@pytest.mark.asyncio
async def test_chat_can_answer_money_maker_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "MoneyNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Money Advice"})

    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What money maker should I do right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "money maker" in content
    assert "karambwans" in content


@pytest.mark.asyncio
async def test_chat_can_handle_money_maker_follow_up_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "MoneyFollow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Money Follow Up"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What money maker should I do right now?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What about Barrows?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "barrows" in content
    assert "money maker" in content or "good target" in content


@pytest.mark.asyncio
async def test_chat_can_handle_training_follow_up_for_boss(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "BossFollow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Boss Follow Up"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Am I ready for Fight Caves?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I train for that?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "fight caves" in content
    assert "ranged" in content or "prayer" in content


@pytest.mark.asyncio
async def test_chat_can_handle_worth_it_follow_up_for_money_maker(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "WorthMoney"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Worth It Money"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What money maker should I do right now?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Is that worth it?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "worth" in content
    assert "karambwans" in content


@pytest.mark.asyncio
async def test_chat_can_handle_worth_it_follow_up_for_quest(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "WorthQuest"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Worth It Quest"})
    session_id = session_response.json()["id"]

    first_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What am I missing for Bone Voyage?"},
    )
    follow_up_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Is that worth it?"},
    )

    assert first_response.status_code == 201
    assert follow_up_response.status_code == 201
    content = follow_up_response.json()["assistant_message"]["content"].lower()
    assert "bone voyage" in content
    assert "worth it" in content or "worth prioritizing" in content


@pytest.mark.asyncio
async def test_chat_can_summarize_current_focus(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "FocusNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "FocusNow"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Focus Summary"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Am I ready for Fight Caves?"},
    )
    focus_response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What are we focused on?"},
    )

    assert focus_response.status_code == 201
    content = focus_response.json()["assistant_message"]["content"].lower()
    assert "fight caves" in content
    assert "focusnow" in content


@pytest.mark.asyncio
async def test_ai_context_receives_session_focus_summary(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["session_focus_summary"] = context.session_focus_summary
        return "Captured focus summary."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    account_response = await client.post("/api/accounts", json={"rsn": "FocusAI"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Focus AI"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "How do I get to Fossil Island?"},
    )
    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )

    assert captured["session_focus_summary"] is not None
    assert "fossil island" in str(captured["session_focus_summary"]).lower()


@pytest.mark.asyncio
async def test_ai_context_does_not_force_goal_context_for_direct_gear_questions(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["goal_summary"] = context.goal_summary
        captured["session_focus_summary"] = context.session_focus_summary
        return "Captured goal context."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    rsn = f"LG{uuid4().hex[:8]}"
    account_response = await client.post("/api/accounts", json={"rsn": rsn})
    assert account_response.status_code == 201
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": rsn},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Gear First"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Tell me more about my account state right now."},
    )

    assert response.status_code == 201
    assert captured["goal_summary"] is None
    assert captured["session_focus_summary"] is not None
    assert "tracked goal" not in str(captured["session_focus_summary"]).lower()


@pytest.mark.asyncio
async def test_chat_can_answer_priority_question_from_session_intent(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "IntentNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Intent Priority"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What money maker should I do right now?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should be the priority here?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "priority" in content
    assert "making money" in content


@pytest.mark.asyncio
async def test_chat_can_handle_what_else_follow_up_for_boss(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ElseBoss"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Else Boss"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Am I ready for Fight Caves?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What else?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fight caves" in content
    assert "get ready" in content or "ready for" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_comes_after_that_from_saved_plan(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "AfterThat"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "AfterThat"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "After That"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What comes after that?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "after" in content
    assert "magic" in content or "bone voyage" in content


@pytest.mark.asyncio
async def test_chat_can_compare_current_quest_order_against_another_quest(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "QuestOrder"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest Order"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What am I missing for Bone Voyage?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Should I do that before Recipe for Disaster?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "bone voyage" in content
    assert "recipe for disaster" in content
    assert "before" in content or "flip that order" in content


@pytest.mark.asyncio
async def test_chat_can_compare_goal_alignment_against_money_maker(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "GoalCompare"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "GoalCompare"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Goal Compare"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What am I missing for Bone Voyage?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Would that help my goal more than karambwans?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "quest cape" in content
    assert "bone voyage" in content
    assert "karambwans" in content


@pytest.mark.asyncio
async def test_chat_can_compare_profit_vs_questing_route(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ProfitQuest"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "ProfitQuest"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Preference Route"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What is the better route if I care more about profit than questing?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "profit" in content
    assert "questing" in content
    assert "karambwans" in content or "money maker" in content


@pytest.mark.asyncio
async def test_chat_can_summarize_weekly_focus(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "WeekFocus"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "WeekFocus"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Weekly Focus"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I focus on this week?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "this week" in content
    assert "bone voyage" in content or "magic" in content


@pytest.mark.asyncio
async def test_chat_can_identify_fastest_move_toward_goal(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "FastGoal"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "FastGoal"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Fast Goal"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What would move me closest to my goal fastest?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "quest cape" in content
    assert "fastest" in content


@pytest.mark.asyncio
async def test_chat_can_say_what_to_ignore_for_now(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "IgnoreNow"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "IgnoreNow"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Ignore Now"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I ignore for now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "ignore" in content or "stop worrying" in content
    assert "quest cape" in content


@pytest.mark.asyncio
async def test_chat_can_handle_short_session_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ShortTime"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "ShortTime"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Short Session"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "I only have 30 minutes. What should I do?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "short session" in content
    assert "do " in content


@pytest.mark.asyncio
async def test_chat_can_handle_afk_progress_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "AfkTime"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_afk_methods": True})
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "AfkTime"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "AFK Session"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "I want AFK progress tonight. What should I do?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "afk" in content
    assert "magic" in content or "high alchemy" in content or "afk preference" in content


@pytest.mark.asyncio
async def test_chat_can_explain_sync_recommendation_stability(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SyncExplain"})
    account_id = account_response.json()["id"]

    db_session.add(
        AccountSnapshot(
            account_id=account_id,
            source="manual",
            sync_status="completed",
            summary={
                "overall_level": 180,
                "combat_level": 70,
                "skills": {
                    "overall": {"level": 180},
                    "magic": {"level": 60},
                    "woodcutting": {"level": 50},
                    "fishing": {"level": 45},
                    "attack": {"level": 55},
                },
            },
        )
    )
    await db_session.commit()

    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "SyncExplain"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Sync Explain"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Did my recommendation change after sync?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "sync" in content
    assert "still leaning" in content or "recommendation shifted" in content
    assert "overall" in content


@pytest.mark.asyncio
async def test_chat_can_explain_what_change_matters_most(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "MattersMost"})
    account_id = account_response.json()["id"]

    db_session.add(
        AccountSnapshot(
            account_id=account_id,
            source="manual",
            sync_status="completed",
            summary={
                "overall_level": 180,
                "combat_level": 70,
                "skills": {
                    "overall": {"level": 180},
                    "magic": {"level": 58},
                    "woodcutting": {"level": 50},
                    "fishing": {"level": 45},
                    "attack": {"level": 55},
                },
            },
        )
    )
    await db_session.commit()

    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "MattersMost"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Matters Most"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What changed that matters most?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "matters most" in content or "biggest change" in content
    assert "magic" in content or "plan shifted" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_to_do_today_for_progress(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "TodayProg"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "TodayProg"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Today Progress"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do today if I want real progress?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "today" in content
    assert "bone voyage" in content or "magic" in content


@pytest.mark.asyncio
async def test_chat_can_answer_profit_and_progression_tradeoff(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ProfitProg"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "ProfitProg"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Profit Progress"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do if I want both profit and progression?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "profit" in content
    assert "progress" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_to_deprioritize_this_week(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Deprioritize"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Deprioritize"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Deprioritize Week"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What would you deprioritize this week?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "deprioritize" in content
    assert "quest cape" in content


@pytest.mark.asyncio
async def test_chat_can_explain_confidence_in_current_recommendation(client: AsyncClient) -> None:
    rsn = f"Conf{uuid4().hex[:6]}"
    account_response = await client.post("/api/accounts", json={"rsn": rsn})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": rsn},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Confidence"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "How confident are you in that?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "confidence" in content
    assert "closest alternate" in content or "alternate" in content or "blocker" in content


@pytest.mark.asyncio
async def test_chat_can_explain_tradeoff_for_current_recommendation(client: AsyncClient) -> None:
    rsn = f"Trade{uuid4().hex[:6]}"
    account_response = await client.post("/api/accounts", json={"rsn": rsn})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": rsn},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Tradeoff"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What's the tradeoff?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "tradeoff" in content
    assert "quest cape" in content or "progression" in content


@pytest.mark.asyncio
async def test_chat_can_sequence_the_next_few_days(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SeqDays"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "SeqDays"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Sequence Days"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "How would you sequence this over the next few days?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "next few days" in content or "day one" in content
    assert "after that" in content or "third lane" in content


@pytest.mark.asyncio
async def test_chat_can_compare_xp_vs_unlock_focus(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "XpUnlock"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "XpUnlock"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "XP vs Unlock"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I prioritize if I care more about XP than unlocks?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "xp" in content
    assert "unlock" in content


@pytest.mark.asyncio
async def test_chat_can_answer_lower_effort_but_useful_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "EasyUseful"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "EasyUseful"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Easy Useful"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do if I want something lower effort but still useful?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "lower effort" in content or "still useful" in content
    assert "account moving" in content or "focus" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_to_do_tonight(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Tonight1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Tonight1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Tonight Plan"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do tonight?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "tonight" in content
    assert "account moving" in content or "full long-session" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_to_do_this_weekend(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Weekend1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Weekend1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Weekend Plan"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do this weekend?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "weekend" in content
    assert "follow-up lane" in content or "third priority" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_should_be_done_by_sunday(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Sunday1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Sunday1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Sunday Plan"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I have done by Sunday?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "by sunday" in content
    assert "underway" in content or "stretch target" in content or "in motion" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_unlock_to_push_next(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Unlock1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Unlock1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Unlock Push"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "unlock" in content
    assert "bone voyage" in content or "route" in content or "opens more value" in content


@pytest.mark.asyncio
async def test_chat_can_compare_two_skills(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SkillCmp"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Skill Compare"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Should I train slayer or fishing?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "slayer" in content
    assert "fishing" in content
    assert "train" in content


@pytest.mark.asyncio
async def test_chat_can_answer_boss_prep_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "BossPrep"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Boss Prep"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I prep for Barrows?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "barrows" in content
    assert "prep" in content or "prepare" in content
    assert "gear" in content or "route" in content or "unlock" in content


@pytest.mark.asyncio
async def test_chat_can_answer_unlock_chain_priority_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "UnlockChain"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"active_unlocks": ["quest cape", "barrows gloves"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Unlock Chain"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Which unlock chain should I prioritize?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "quest cape" in content
    assert "barrows gloves" in content
    assert "prioritize" in content


@pytest.mark.asyncio
async def test_chat_can_answer_biggest_blockers_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Blockers1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Blockers1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Biggest Blockers"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What are my three biggest blockers right now?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "biggest blockers" in content
    assert "quest cape" in content or "blocker" in content or "holding back" in content


@pytest.mark.asyncio
async def test_chat_can_answer_which_blocker_to_clear_first(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "ClearBlock"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "ClearBlock"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Clear First"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Which blocker should I clear first?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "clearing one blocker first" in content or "clear first" in content
    assert "holding back" in content or "actionable" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_would_unblock_me_fastest(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "FastUnblock"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "FastUnblock"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Fast Unblock"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What would unblock me fastest?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fastest unblock" in content or "fastest way to free up progress" in content


@pytest.mark.asyncio
async def test_chat_can_answer_what_small_win_to_lock_in_next(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "SmallWin1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "SmallWin1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Small Win"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What small win should I lock in next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "small win" in content
    assert "momentum" in content or "commitment" in content


@pytest.mark.asyncio
async def test_chat_can_explain_quest_chain_blockers(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "QuestChain"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch(
        f"/api/accounts/{account_id}/progress",
        json={"completed_quests": ["big chompy bird hunting"]},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Quest Chain"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What quest chain comes before Recipe for Disaster?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "recipe for disaster" in content
    assert "desert treasure" in content or "horror from the deep" in content or "monkey madness i" in content


@pytest.mark.asyncio
async def test_chat_can_answer_low_attention_money_maker_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "LowMoney"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Low Attention Money"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What low attention money maker should I do?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "money maker" in content or "birdhouse" in content or "karambwans" in content
    assert "attention" in content or "afk" in content or "low-attention" in content


@pytest.mark.asyncio
async def test_chat_can_answer_lowest_unlock_burden_money_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "UnlockBurden"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Unlock Burden Money"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Which money maker has the lowest unlock burden?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "unlock burden" in content or "missing requirement" in content
    assert "money maker" in content


@pytest.mark.asyncio
async def test_chat_can_answer_weekend_money_target_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "WeekendGP"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "WeekendGP"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Weekend GP"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I push if I want better money by this weekend?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "weekend" in content
    assert "money" in content or "profit" in content


@pytest.mark.asyncio
async def test_chat_can_explain_why_now_instead_of_later(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "WhyNow1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "WhyNow1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Why Now"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "Why now instead of later?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "because" in content
    assert "quest cape" in content or "current progression plan" in content


@pytest.mark.asyncio
async def test_chat_can_answer_utility_unlock_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "Utility1"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "Utility1"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Utility Unlock"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "utility unlock" in content
    assert "bone voyage" in content or "route" in content or "broader account value" in content


@pytest.mark.asyncio
async def test_chat_can_answer_diary_style_utility_question(client: AsyncClient) -> None:
    account_response = await client.post("/api/accounts", json={"rsn": "DiaryUtil"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.post(
        "/api/goals",
        json={"title": "Quest Cape", "goal_type": "quest cape", "target_account_rsn": "DiaryUtil"},
    )
    session_response = await client.post("/api/chat/sessions", json={"title": "Diary Utility"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What diary-style utility unlock should I care about next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "diary-style utility" in content
    assert "bone voyage" in content or "route" in content or "utility unlock" in content


@pytest.mark.asyncio
async def test_ai_context_receives_session_intent_summary(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["session_intent_summary"] = context.session_intent_summary
        return "Captured intent summary."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    account_response = await client.post("/api/accounts", json={"rsn": "IntentAI"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Intent AI"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What money maker should I do right now?"},
    )
    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )

    assert captured["session_intent_summary"] is not None
    assert "making money" in str(captured["session_intent_summary"]).lower()


@pytest.mark.asyncio
async def test_ai_context_receives_retrieved_osrs_reference_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["retrieval_summary"] = context.retrieval_summary
        return "Captured retrieval context."

    async def fake_direct_stat_answer(*args, **kwargs) -> str | None:
        return None

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    monkeypatch.setattr(chat_service, "_build_direct_stat_answer", fake_direct_stat_answer)

    account_response = await client.post("/api/accounts", json={"rsn": "RetrievalAI"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Retrieval AI"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "How do I get to Fossil Island?"},
    )

    assert response.status_code == 201
    assert captured["retrieval_summary"] is not None
    assert "fossil island access" in str(captured["retrieval_summary"]).lower()
    assert "bone voyage" in str(captured["retrieval_summary"]).lower()


@pytest.mark.asyncio
async def test_ai_context_receives_diary_retrieval_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["retrieval_summary"] = context.retrieval_summary
        return "Captured diary retrieval context."

    async def fake_direct_stat_answer(*args, **kwargs) -> str | None:
        return None

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    monkeypatch.setattr(chat_service, "_build_direct_stat_answer", fake_direct_stat_answer)

    account_response = await client.post("/api/accounts", json={"rsn": f"DR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Diary Retrieval"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What diary-style utility unlock should I care about next?"},
    )

    assert response.status_code == 201
    assert captured["retrieval_summary"] is not None
    assert "achievement diary utility" in str(captured["retrieval_summary"]).lower()


@pytest.mark.asyncio
async def test_ai_context_receives_low_attention_money_retrieval_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["retrieval_summary"] = context.retrieval_summary
        return "Captured money retrieval context."

    async def fake_direct_stat_answer(*args, **kwargs) -> str | None:
        return None

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    monkeypatch.setattr(chat_service, "_build_direct_stat_answer", fake_direct_stat_answer)

    account_response = await client.post("/api/accounts", json={"rsn": f"MR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    await client.patch("/api/profile", json={"prefers_profitable_methods": True, "prefers_afk_methods": True})
    session_response = await client.post("/api/chat/sessions", json={"title": "Money Retrieval"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What low attention money maker should I do?"},
    )

    assert response.status_code == 201
    assert captured["retrieval_summary"] is not None
    retrieval = str(captured["retrieval_summary"]).lower()
    assert "profit versus progression" in retrieval
    assert "afk planning" in retrieval


@pytest.mark.asyncio
async def test_ai_context_receives_slayer_unlock_retrieval_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["retrieval_summary"] = context.retrieval_summary
        return "Captured slayer retrieval context."

    async def fake_direct_stat_answer(*args, **kwargs) -> str | None:
        return None

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    monkeypatch.setattr(chat_service, "_build_direct_stat_answer", fake_direct_stat_answer)

    account_response = await client.post("/api/accounts", json={"rsn": f"SR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Slayer Retrieval"})
    session_id = session_response.json()["id"]

    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What slayer unlock should I care about next?"},
    )

    assert response.status_code == 201
    assert captured["retrieval_summary"] is not None
    retrieval = str(captured["retrieval_summary"]).lower()
    assert "slayer utility" in retrieval or "slayer unlock planning" in retrieval


@pytest.mark.asyncio
async def test_ai_context_receives_weekend_milestone_retrieval_context(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, str | None] = {}

    async def fake_generate_chat_reply(context) -> str:
        captured["retrieval_summary"] = context.retrieval_summary
        return "Captured weekend retrieval context."

    async def fake_direct_stat_answer(*args, **kwargs) -> str | None:
        return None

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)
    monkeypatch.setattr(chat_service, "_build_direct_stat_answer", fake_direct_stat_answer)

    account_response = await client.post("/api/accounts", json={"rsn": f"WR{uuid4().hex[:8]}"})
    account_id = account_response.json()["id"]
    await client.post(f"/api/accounts/{account_id}/sync")
    session_response = await client.post("/api/chat/sessions", json={"title": "Weekend Retrieval"})
    session_id = session_response.json()["id"]

    await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I do next?"},
    )
    response = await client.post(
        f"/api/chat/sessions/{session_id}/messages",
        json={"content": "What should I have done by Sunday?"},
    )

    assert response.status_code == 201
    assert captured["retrieval_summary"] is not None
    retrieval = str(captured["retrieval_summary"]).lower()
    assert "weekend milestone planning" in retrieval


@pytest.mark.asyncio
async def test_chat_can_use_ai_reply_when_available(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_generate_chat_reply(*args, **kwargs) -> str:
        return "Try pushing Magic first, then let me plan the rest."

    monkeypatch.setattr(assistant_service, "generate_chat_reply", fake_generate_chat_reply)

    session_response = await client.post("/api/chat/sessions", json={"title": "AI Advice"})
    response = await client.post(
        f"/api/chat/sessions/{session_response.json()['id']}/messages",
        json={"content": "What should I do next?"},
    )

    assert response.status_code == 201
    assert response.json()["assistant_message"]["content"] == (
        "Try pushing Magic first, then let me plan the rest."
    )
