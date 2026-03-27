from app.integrations.osrs_hiscores import OSRSHiscoresClient
from app.integrations.osrs_ingestion import OSRSAccountIngestionService


def test_parse_hiscores_payload_ignores_extra_activity_rows() -> None:
    skill_rows = "\n".join(["1,99,13034431"] * 24)
    activity_rows = "\n".join(["-1,-1"] * 10)
    payload = f"{skill_rows}\n{activity_rows}"

    summary = OSRSHiscoresClient()._parse_hiscores_payload("Zezima", payload)

    assert summary["rsn"] == "Zezima"
    assert summary["overall_level"] == 99
    assert summary["skills"]["construction"]["experience"] == 13034431
    assert summary["activity_row_count"] == 10
    assert summary["activity_metrics"][0]["position"] == 1


def test_enrich_summary_adds_derived_progression_fields() -> None:
    summary = {
        "rsn": "Zezima",
        "overall_rank": 1,
        "overall_level": 2000,
        "overall_experience": 1_000_000,
        "skills": {
            "overall": {"rank": 1, "level": 2000, "experience": 1_000_000},
            "attack": {"rank": 10, "level": 70, "experience": 737_627},
            "strength": {"rank": 10, "level": 75, "experience": 1_210_421},
            "defence": {"rank": 10, "level": 70, "experience": 737_627},
            "hitpoints": {"rank": 10, "level": 80, "experience": 1_986_068},
            "ranged": {"rank": 10, "level": 85, "experience": 3_258_594},
            "prayer": {"rank": 10, "level": 60, "experience": 273_742},
            "magic": {"rank": 10, "level": 90, "experience": 5_346_332},
            "mining": {"rank": 10, "level": 65, "experience": 449_428},
            "fishing": {"rank": 10, "level": 50, "experience": 101_333},
            "woodcutting": {"rank": 10, "level": 72, "experience": 899_257},
            "hunter": {"rank": 10, "level": 40, "experience": 37_224},
            "farming": {"rank": 10, "level": 45, "experience": 61_512},
            "cooking": {"rank": 10, "level": 60, "experience": 273_742},
            "crafting": {"rank": 10, "level": 50, "experience": 101_333},
            "fletching": {"rank": 10, "level": 55, "experience": 166_636},
            "firemaking": {"rank": 10, "level": 45, "experience": 61_512},
            "herblore": {"rank": 10, "level": 40, "experience": 37_224},
            "runecraft": {"rank": 10, "level": 35, "experience": 24_068},
            "smithing": {"rank": 10, "level": 42, "experience": 45_372},
            "construction": {"rank": 10, "level": 38, "experience": 31_164},
            "agility": {"rank": 10, "level": 58, "experience": 224_466},
            "thieving": {"rank": 10, "level": 64, "experience": 406_254},
            "slayer": {"rank": 10, "level": 67, "experience": 547_953},
        },
        "activity_metrics": [{"position": 1, "rank": 4, "score": 122}],
        "activity_row_count": 1,
    }

    enriched = OSRSAccountIngestionService(OSRSHiscoresClient())._enrich_summary(summary)

    assert enriched["combat_level"] > 90
    assert enriched["top_skills"][0]["skill"] == "magic"
    assert enriched["skill_categories"]["gathering"]["highest_level"] == 72
    assert enriched["progression_profile"]["highest_skill"] == "magic"
    assert enriched["activity_overview"]["active_activity_count"] == 1
