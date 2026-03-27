from fastapi import APIRouter

from app.schemas.quest import QuestDetailResponse, QuestListResponse
from app.services.quests import quest_service

router = APIRouter()


@router.get("", response_model=QuestListResponse, summary="List quests")
async def list_quests() -> QuestListResponse:
    return quest_service.list_quests()


@router.get("/{quest_id}", response_model=QuestDetailResponse, summary="Get quest details")
async def get_quest(quest_id: str) -> QuestDetailResponse:
    return quest_service.get_quest(quest_id=quest_id)
