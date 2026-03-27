from fastapi import APIRouter

from app.api.routes.accounts import router as accounts_router
from app.api.routes.chat import router as chat_router
from app.api.routes.gear import router as gear_router
from app.api.routes.goals import router as goals_router
from app.api.routes.health import router as health_router
from app.api.routes.profile import router as profile_router
from app.api.routes.quests import router as quests_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.skills import router as skills_router
from app.api.routes.teleports import router as teleports_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(accounts_router, prefix="/api/accounts", tags=["accounts"])
api_router.include_router(chat_router, prefix="/api/chat", tags=["chat"])
api_router.include_router(gear_router, prefix="/api/gear", tags=["gear"])
api_router.include_router(goals_router, prefix="/api/goals", tags=["goals"])
api_router.include_router(profile_router, prefix="/api/profile", tags=["profile"])
api_router.include_router(quests_router, prefix="/api/quests", tags=["quests"])
api_router.include_router(recommendations_router, prefix="/api/recommendations", tags=["recommendations"])
api_router.include_router(skills_router, prefix="/api/skills", tags=["skills"])
api_router.include_router(teleports_router, prefix="/api/teleports", tags=["teleports"])
