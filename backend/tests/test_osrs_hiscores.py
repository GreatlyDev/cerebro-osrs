from app.integrations.osrs_hiscores import OSRSHiscoresClient


def test_parse_hiscores_payload_ignores_extra_activity_rows() -> None:
    skill_rows = "\n".join(["1,99,13034431"] * 24)
    activity_rows = "\n".join(["-1,-1"] * 10)
    payload = f"{skill_rows}\n{activity_rows}"

    summary = OSRSHiscoresClient()._parse_hiscores_payload("Zezima", payload)

    assert summary["rsn"] == "Zezima"
    assert summary["overall_level"] == 99
    assert summary["skills"]["construction"]["experience"] == 13034431
