from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

SKILL_NAMES = [
    "overall",
    "attack",
    "defence",
    "strength",
    "hitpoints",
    "ranged",
    "prayer",
    "magic",
    "cooking",
    "woodcutting",
    "fletching",
    "fishing",
    "firemaking",
    "crafting",
    "smithing",
    "mining",
    "herblore",
    "agility",
    "thieving",
    "slayer",
    "farming",
    "runecraft",
    "hunter",
    "construction",
]


class OSRSHiscoresNotFoundError(Exception):
    """Raised when a requested RSN is not found in OSRS hiscores."""


class OSRSHiscoresClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    async def fetch_account_summary(self, rsn: str) -> dict[str, Any]:
        query = urlencode({"player": rsn})
        url = f"{self._settings.osrs_hiscores_base_url}?{query}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)

        if response.status_code == 404:
            raise OSRSHiscoresNotFoundError(rsn)

        response.raise_for_status()

        return self._parse_hiscores_payload(rsn=rsn, payload=response.text)

    def _parse_hiscores_payload(self, rsn: str, payload: str) -> dict[str, Any]:
        lines = [line.strip() for line in payload.splitlines() if line.strip()]
        if len(lines) < len(SKILL_NAMES):
            raise OSRSHiscoresNotFoundError(rsn)

        skills: dict[str, dict[str, int]] = {}
        for skill_name, line in zip(SKILL_NAMES, lines[: len(SKILL_NAMES)], strict=True):
            rank, level, experience = (int(part) for part in line.split(",")[:3])
            skills[skill_name] = {
                "rank": rank,
                "level": level,
                "experience": experience,
            }

        overall = skills["overall"]

        return {
            "rsn": rsn,
            "overall_rank": overall["rank"],
            "overall_level": overall["level"],
            "overall_experience": overall["experience"],
            "skills": skills,
        }


osrs_hiscores_client = OSRSHiscoresClient()
