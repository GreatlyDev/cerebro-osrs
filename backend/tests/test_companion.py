from app.schemas.account_progress import AccountProgressResponse


def test_account_progress_response_exposes_companion_state() -> None:
    payload = AccountProgressResponse.model_validate(
        {
            "id": 1,
            "account_id": 2,
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion"},
            "created_at": "2026-04-15T00:00:00Z",
            "updated_at": "2026-04-15T00:00:00Z",
        }
    )

    assert payload.completed_diaries["lumbridge_draynor"] == ["easy"]
    assert payload.equipped_gear["weapon"] == "dragon scimitar"
    assert payload.notable_items == ["barrows gloves"]
    assert payload.companion_state["source"] == "runelite_companion"


def test_companion_models_import() -> None:
    from app.models.companion_connection import CompanionConnection
    from app.models.companion_link_session import CompanionLinkSession

    assert CompanionLinkSession.__tablename__ == "companion_link_sessions"
    assert CompanionConnection.__tablename__ == "companion_connections"
