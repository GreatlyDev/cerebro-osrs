from fastapi import FastAPI

from app.api.api_router import api_router
from app.core.config import get_settings


def create_application() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )
    application.include_router(api_router)

    return application


app = create_application()

