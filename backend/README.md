# Backend

FastAPI backend scaffold for the `cerebro-osrs` monorepo.

## Structure

- `main.py`: ASGI entrypoint
- `app/api/routes/`: REST route modules
- `app/core/`: application configuration and shared core concerns
- `app/db/`: database base classes and session management
- `app/models/`: SQLAlchemy models
- `app/schemas/`: request and response schemas
- `app/services/`: domain services and orchestration logic

## Environment

Configuration is loaded from a `.env` file via environment variables. The root `.env.example`
already includes the backend and PostgreSQL variables used by this scaffold.

## Local Development

Install dependencies and run the API from the `backend/` directory:

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run database migrations:

```bash
uv run alembic upgrade head
```

## Notes

- Alembic is scaffolded and ready for initial revisions
- Docker Compose can start PostgreSQL, Redis, and the backend service together
- The API includes `accounts`, `profile`, and `goals` modules with persisted backend state
- Domain modules and business logic can now be added incrementally
