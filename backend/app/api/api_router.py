from fastapi import APIRouter

from app.api.routes.accounts import router as accounts_router
from app.api.routes.gear import router as gear_router
from app.api.routes.goals import router as goals_router
from app.api.routes.health import router as health_router
from app.api.routes.profile import router as profile_router
from app.api.routes.quests import router as quests_router
from app.api.routes.skills import router as skills_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(accounts_router, prefix="/api/accounts", tags=["accounts"])
api_router.include_router(gear_router, prefix="/api/gear", tags=["gear"])
api_router.include_router(goals_router, prefix="/api/goals", tags=["goals"])
api_router.include_router(profile_router, prefix="/api/profile", tags=["profile"])
api_router.include_router(quests_router, prefix="/api/quests", tags=["quests"])
api_router.include_router(skills_router, prefix="/api/skills", tags=["skills"])
