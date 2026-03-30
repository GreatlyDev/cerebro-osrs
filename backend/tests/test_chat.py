import pytest
from httpx import AsyncClient

from app.services.assistant import assistant_service
from app.services.accounts import account_service


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
    assert "quest cape" in content
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
