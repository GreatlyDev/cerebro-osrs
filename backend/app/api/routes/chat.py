from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreateRequest,
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
)
from app.services.chat import chat_service

router = APIRouter()


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create chat session",
)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatSessionResponse:
    return await chat_service.create_session(
        db_session=db_session,
        user=current_user,
        payload=payload,
    )


@router.get("/sessions", response_model=ChatSessionListResponse, summary="List chat sessions")
async def list_chat_sessions(
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatSessionListResponse:
    return await chat_service.list_sessions(db_session=db_session, user=current_user)


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send chat message",
)
async def send_chat_message(
    session_id: int,
    payload: ChatMessageCreateRequest,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ChatMessageResponse:
    return await chat_service.send_message(
        db_session=db_session,
        user=current_user,
        session_id=session_id,
        payload=payload,
    )
