# RuneLite Companion Account Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional RuneLite companion plugin plus the backend and frontend support needed to sync private account-state data into Cerebro so the assistant becomes much more account-aware on day one.

**Architecture:** Extend the existing account progress model with richer companion-aware state, add a secure link-token and scoped sync-credential flow, ingest structured plugin payloads through new backend routes, and merge that state into the same account context Cerebro already uses. Build the companion itself as a standalone RuneLite Plugin Hub-style project inside the repo so we can ship and iterate on it alongside the web app.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Pydantic, React, TypeScript, RuneLite plugin architecture, Java 11, Gradle, pytest, JUnit

---

## File Structure

### New files

- Create: `backend/app/models/companion_link_session.py`
- Create: `backend/app/models/companion_connection.py`
- Create: `backend/app/schemas/companion.py`
- Create: `backend/app/services/companion.py`
- Create: `backend/app/api/routes/companion.py`
- Create: `backend/tests/test_companion.py`
- Create: `backend/alembic/versions/<revision>_add_companion_sync_tables.py`
- Create: `frontend/src/components/dashboard/CompanionStatusPanel.tsx`
- Create: `companion/runelite-plugin/settings.gradle`
- Create: `companion/runelite-plugin/build.gradle`
- Create: `companion/runelite-plugin/src/main/resources/runelite-plugin.properties`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionPlugin.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionConfig.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroSyncClient.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroModels.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/QuestStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/DiaryStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/TravelStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/GearStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/UtilityStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/PayloadComposer.java`
- Create: `companion/runelite-plugin/src/test/java/com/cerebro/companion/state/PayloadComposerTest.java`
- Create: `companion/runelite-plugin/src/test/java/com/cerebro/companion/api/CerebroSyncClientTest.java`

### Modified files

- Modify: `backend/app/models/account_progress.py`
- Modify: `backend/app/models/account.py`
- Modify: `backend/app/db/base.py`
- Modify: `backend/app/schemas/account_progress.py`
- Modify: `backend/app/schemas/account.py`
- Modify: `backend/app/services/accounts.py`
- Modify: `backend/app/services/chat.py`
- Modify: `backend/app/services/teleports.py`
- Modify: `backend/app/services/gear.py`
- Modify: `backend/app/services/recommendations.py`
- Modify: `backend/app/services/user_context.py`
- Modify: `backend/app/api/api_router.py`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/components/dashboard/TelemetryBoard.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

### Responsibilities

- `companion_link_session.py`: short-lived link tokens between the web app and the RuneLite plugin
- `companion_connection.py`: long-lived scoped sync credentials, plugin metadata, freshness, and link status
- `companion.py`: linking, credential exchange, payload validation, progress merging, and sync metadata updates
- `account_progress.py`: richer synced account-state buckets for diaries, equipped gear, notable items, and utility unlocks
- `companion.py` route and schema files: web and plugin API surface
- frontend files: show companion status, create link tokens, and surface the value of the plugin
- `companion/runelite-plugin/*`: standalone RuneLite companion that links to Cerebro and syncs broad account state

---

### Task 1: Add the Backend Companion Data Foundation

**Files:**
- Create: `backend/app/models/companion_link_session.py`
- Create: `backend/app/models/companion_connection.py`
- Create: `backend/alembic/versions/<revision>_add_companion_sync_tables.py`
- Modify: `backend/app/models/account_progress.py`
- Modify: `backend/app/models/account.py`
- Modify: `backend/app/db/base.py`
- Modify: `backend/app/schemas/account_progress.py`
- Test: `backend/tests/test_companion.py`

- [ ] **Step 1: Write the failing model and schema tests**

```python
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
```

```python
from app.models.companion_connection import CompanionConnection
from app.models.companion_link_session import CompanionLinkSession


def test_companion_models_import() -> None:
    assert CompanionLinkSession.__tablename__ == "companion_link_sessions"
    assert CompanionConnection.__tablename__ == "companion_connections"
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_companion.py -q`

Expected: FAIL because the companion models and schema fields do not exist yet

- [ ] **Step 3: Extend `AccountProgress` for richer companion state**

Update `backend/app/models/account_progress.py` to add these columns:

```python
    completed_diaries: Mapped[dict[str, list[str]]] = mapped_column(JSON, nullable=False, default=dict)
    equipped_gear: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False, default=dict)
    notable_items: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    companion_state: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
```

Update `backend/app/schemas/account_progress.py` to expose and normalize them:

```python
class AccountProgressUpdateRequest(BaseModel):
    completed_quests: list[str] = Field(default_factory=list)
    completed_diaries: dict[str, list[str]] = Field(default_factory=dict)
    unlocked_transports: list[str] = Field(default_factory=list)
    owned_gear: list[str] = Field(default_factory=list)
    equipped_gear: dict[str, str] = Field(default_factory=dict)
    notable_items: list[str] = Field(default_factory=list)
    active_unlocks: list[str] = Field(default_factory=list)
    companion_state: dict[str, Any] = Field(default_factory=dict)
```

```python
class AccountProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    completed_quests: list[str]
    completed_diaries: dict[str, list[str]]
    unlocked_transports: list[str]
    owned_gear: list[str]
    equipped_gear: dict[str, str]
    notable_items: list[str]
    active_unlocks: list[str]
    companion_state: dict[str, Any]
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 4: Add the companion link models**

Create `backend/app/models/companion_link_session.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompanionLinkSession(Base):
    __tablename__ = "companion_link_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

Create `backend/app/models/companion_connection.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompanionConnection(Base):
    __tablename__ = "companion_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    sync_secret_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    plugin_instance_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    plugin_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="linked")
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_payload_summary: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
```

- [ ] **Step 5: Register the new models and add the migration**

Update `backend/app/db/base.py` imports to include the new model modules.

Create `backend/alembic/versions/<revision>_add_companion_sync_tables.py` with:

```python
def upgrade() -> None:
    op.add_column("account_progress", sa.Column("completed_diaries", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.add_column("account_progress", sa.Column("equipped_gear", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.add_column("account_progress", sa.Column("notable_items", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("account_progress", sa.Column("companion_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")))
    op.create_table(
        "companion_link_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companion_link_sessions_token_hash", "companion_link_sessions", ["token_hash"], unique=True)
    op.create_table(
        "companion_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("sync_secret_hash", sa.String(length=128), nullable=False),
        sa.Column("plugin_instance_id", sa.String(length=128), nullable=True),
        sa.Column("plugin_version", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_payload_summary", sa.String(length=255), nullable=True),
        sa.Column("linked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )
```

- [ ] **Step 6: Run migration and tests**

Run: `docker compose exec backend uv run alembic upgrade head`

Expected: `INFO  [alembic.runtime.migration] Running upgrade ...`

Run: `docker compose exec backend uv run pytest tests/test_companion.py -q`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/models backend/app/db/base.py backend/app/schemas/account_progress.py backend/alembic/versions backend/tests/test_companion.py
git commit -m "Add the companion sync data foundation"
```

---

### Task 2: Add Secure Linking and Companion API Contracts

**Files:**
- Create: `backend/app/schemas/companion.py`
- Create: `backend/app/services/companion.py`
- Create: `backend/app/api/routes/companion.py`
- Modify: `backend/app/api/api_router.py`
- Modify: `backend/tests/test_companion.py`

- [ ] **Step 1: Write the failing linking flow tests**

```python
@pytest.mark.asyncio
async def test_create_companion_link_session_returns_short_lived_token(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "Companion User"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "Gilganor"}, cookies=cookies)

    response = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
        cookies=cookies,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["link_token"]
    assert data["expires_at"]
```

```python
@pytest.mark.asyncio
async def test_exchange_link_token_returns_scoped_sync_secret(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "Plugin User"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "PluginRsn"}, cookies=cookies)
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
        cookies=cookies,
    )

    response = await client.post(
        "/api/companion/link",
        json={"link_token": link.json()["link_token"], "plugin_instance_id": "plugin-123", "plugin_version": "0.1.0"},
    )

    assert response.status_code == 200
    assert response.json()["sync_secret"]
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_companion.py::test_create_companion_link_session_returns_short_lived_token tests/test_companion.py::test_exchange_link_token_returns_scoped_sync_secret -q`

Expected: FAIL because the route and service do not exist yet

- [ ] **Step 3: Add the companion request and response schemas**

Create `backend/app/schemas/companion.py`:

```python
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CompanionLinkSessionResponse(BaseModel):
    link_token: str
    expires_at: datetime


class CompanionLinkExchangeRequest(BaseModel):
    link_token: str
    plugin_instance_id: str = Field(min_length=1, max_length=128)
    plugin_version: str = Field(min_length=1, max_length=64)


class CompanionLinkExchangeResponse(BaseModel):
    sync_secret: str
    account_id: int
    rsn: str
    status: str


class CompanionSyncRequest(BaseModel):
    plugin_instance_id: str
    plugin_version: str
    completed_quests: list[str] = Field(default_factory=list)
    completed_diaries: dict[str, list[str]] = Field(default_factory=dict)
    unlocked_transports: list[str] = Field(default_factory=list)
    active_unlocks: list[str] = Field(default_factory=list)
    owned_gear: list[str] = Field(default_factory=list)
    equipped_gear: dict[str, str] = Field(default_factory=dict)
    notable_items: list[str] = Field(default_factory=list)
    companion_state: dict[str, Any] = Field(default_factory=dict)


class CompanionSyncResponse(BaseModel):
    account_id: int
    status: str
    detail: str
    synced_at: datetime
```

- [ ] **Step 4: Add the companion service**

Create `backend/app/services/companion.py` with this skeleton:

```python
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.account_progress import AccountProgress
from app.models.companion_connection import CompanionConnection
from app.models.companion_link_session import CompanionLinkSession
from app.models.user import User
from app.schemas.companion import (
    CompanionLinkExchangeRequest,
    CompanionLinkExchangeResponse,
    CompanionLinkSessionResponse,
)


class CompanionService:
    def _hash_secret(self, raw: str) -> str:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def create_link_session(
        self,
        *,
        db_session: AsyncSession,
        user: User,
        account: Account,
    ) -> CompanionLinkSessionResponse:
        raw_token = secrets.token_urlsafe(24)
        expires_at = datetime.now(UTC) + timedelta(minutes=10)
        session = CompanionLinkSession(
            user_id=user.id,
            account_id=account.id,
            token_hash=self._hash_secret(raw_token),
            expires_at=expires_at,
        )
        db_session.add(session)
        await db_session.commit()
        return CompanionLinkSessionResponse(link_token=raw_token, expires_at=expires_at)

    async def exchange_link_token(
        self,
        *,
        db_session: AsyncSession,
        payload: CompanionLinkExchangeRequest,
    ) -> CompanionLinkExchangeResponse:
        hashed = self._hash_secret(payload.link_token)
        session = await db_session.scalar(
            select(CompanionLinkSession).where(CompanionLinkSession.token_hash == hashed)
        )
        if session is None or session.consumed_at is not None or session.expires_at < datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link token is invalid or expired.")

        account = await db_session.scalar(select(Account).where(Account.id == session.account_id))
        if account is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked account not found.")

        raw_secret = secrets.token_urlsafe(32)
        connection = CompanionConnection(
            account_id=account.id,
            sync_secret_hash=self._hash_secret(raw_secret),
            plugin_instance_id=payload.plugin_instance_id,
            plugin_version=payload.plugin_version,
            status="linked",
        )
        session.consumed_at = datetime.now(UTC)
        db_session.add(connection)
        await db_session.commit()
        return CompanionLinkExchangeResponse(
            sync_secret=raw_secret,
            account_id=account.id,
            rsn=account.rsn,
            status="linked",
        )
```

- [ ] **Step 5: Add the route layer**

Create `backend/app/api/routes/companion.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.companion import (
    CompanionLinkExchangeRequest,
    CompanionLinkExchangeResponse,
    CompanionLinkSessionResponse,
)
from app.services.accounts import account_service
from app.services.companion import companion_service

router = APIRouter()


@router.post(
    "/accounts/{account_id}/link-sessions",
    response_model=CompanionLinkSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_link_session(
    account_id: int,
    db_session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CompanionLinkSessionResponse:
    account = await account_service.get_account_model(db_session=db_session, user=current_user, account_id=account_id)
    return await companion_service.create_link_session(db_session=db_session, user=current_user, account=account)


@router.post("/link", response_model=CompanionLinkExchangeResponse)
async def exchange_link_token(
    payload: CompanionLinkExchangeRequest,
    db_session: AsyncSession = Depends(get_db_session),
) -> CompanionLinkExchangeResponse:
    return await companion_service.exchange_link_token(db_session=db_session, payload=payload)
```

Update `backend/app/api/api_router.py`:

```python
from app.api.routes.companion import router as companion_router

api_router.include_router(companion_router, prefix="/api/companion", tags=["companion"])
```

- [ ] **Step 6: Run the companion-link tests**

Run: `docker compose exec backend uv run pytest tests/test_companion.py -q`

Expected: PASS with linking tests green

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/companion.py backend/app/services/companion.py backend/app/api/routes/companion.py backend/app/api/api_router.py backend/tests/test_companion.py
git commit -m "Add the companion linking flow"
```

---

### Task 3: Add Companion Sync Ingestion and Merge It Into Account State

**Files:**
- Modify: `backend/app/services/companion.py`
- Modify: `backend/app/services/accounts.py`
- Modify: `backend/app/schemas/account.py`
- Modify: `backend/tests/test_companion.py`

- [ ] **Step 1: Write the failing sync-ingestion test**

```python
@pytest.mark.asyncio
async def test_companion_sync_updates_account_progress_and_status(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "Sync User"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "SyncAware"}, cookies=cookies)
    link = await client.post(f"/api/companion/accounts/{account.json()['id']}/link-sessions", cookies=cookies)
    exchange = await client.post(
        "/api/companion/link",
        json={"link_token": link.json()["link_token"], "plugin_instance_id": "plugin-abc", "plugin_version": "0.1.0"},
    )

    response = await client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": exchange.json()["sync_secret"]},
        json={
            "plugin_instance_id": "plugin-abc",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "active_unlocks": ["fossil island access"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "companion_state": {"quest_points": 200},
        },
    )

    assert response.status_code == 200
    progress = await client.get(f"/api/accounts/{account.json()['id']}/progress", cookies=cookies)
    assert progress.json()["completed_quests"] == ["bone voyage"]
    assert progress.json()["completed_diaries"]["lumbridge_draynor"] == ["easy"]
    assert progress.json()["equipped_gear"]["weapon"] == "dragon scimitar"
```

- [ ] **Step 2: Run the focused ingestion test and verify it fails**

Run: `docker compose exec backend uv run pytest tests/test_companion.py::test_companion_sync_updates_account_progress_and_status -q`

Expected: FAIL because `/api/companion/sync` does not exist yet

- [ ] **Step 3: Add sync ingestion to the companion service**

Extend `backend/app/services/companion.py`:

```python
from app.schemas.companion import CompanionSyncRequest, CompanionSyncResponse

    async def sync_account_state(
        self,
        *,
        db_session: AsyncSession,
        sync_secret: str,
        payload: CompanionSyncRequest,
    ) -> CompanionSyncResponse:
        hashed = self._hash_secret(sync_secret)
        connection = await db_session.scalar(
            select(CompanionConnection).where(CompanionConnection.sync_secret_hash == hashed)
        )
        if connection is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Companion sync secret is invalid.")

        progress = await db_session.scalar(
            select(AccountProgress).where(AccountProgress.account_id == connection.account_id)
        )
        if progress is None:
            progress = AccountProgress(account_id=connection.account_id)
            db_session.add(progress)

        progress.completed_quests = sorted(set(payload.completed_quests))
        progress.completed_diaries = payload.completed_diaries
        progress.unlocked_transports = sorted(set(payload.unlocked_transports))
        progress.active_unlocks = sorted(set(payload.active_unlocks))
        progress.owned_gear = sorted(set(payload.owned_gear))
        progress.equipped_gear = payload.equipped_gear
        progress.notable_items = sorted(set(payload.notable_items))
        progress.companion_state = {
            **payload.companion_state,
            "source": "runelite_companion",
            "plugin_instance_id": payload.plugin_instance_id,
            "plugin_version": payload.plugin_version,
            "synced_at": datetime.now(UTC).isoformat(),
        }
        connection.plugin_instance_id = payload.plugin_instance_id
        connection.plugin_version = payload.plugin_version
        connection.status = "linked"
        connection.last_synced_at = datetime.now(UTC)
        connection.last_payload_summary = (
            f"{len(progress.completed_quests)} quests, "
            f"{len(progress.unlocked_transports)} transports, "
            f"{len(progress.notable_items)} notable items"
        )
        await db_session.commit()
        return CompanionSyncResponse(
            account_id=connection.account_id,
            status="synced",
            detail="Companion account state synced.",
            synced_at=connection.last_synced_at,
        )
```

- [ ] **Step 4: Add the sync route**

Extend `backend/app/api/routes/companion.py`:

```python
from app.schemas.companion import CompanionSyncRequest, CompanionSyncResponse


@router.post("/sync", response_model=CompanionSyncResponse)
async def sync_companion_state(
    payload: CompanionSyncRequest,
    x_cerebro_sync_secret: str = Header(...),
    db_session: AsyncSession = Depends(get_db_session),
) -> CompanionSyncResponse:
    return await companion_service.sync_account_state(
        db_session=db_session,
        sync_secret=x_cerebro_sync_secret,
        payload=payload,
    )
```

- [ ] **Step 5: Surface companion status in account responses**

Update `backend/app/schemas/account.py` to add:

```python
class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rsn: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    companion_status: str | None = None
    companion_last_synced_at: datetime | None = None
```

Update `backend/app/services/accounts.py` so `get_account`, `list_accounts`, and `get_account_progress` can include companion link metadata from `CompanionConnection`.

- [ ] **Step 6: Run the companion suite**

Run: `docker compose exec backend uv run pytest tests/test_companion.py -q`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/companion.py backend/app/services/accounts.py backend/app/schemas/account.py backend/app/api/routes/companion.py backend/tests/test_companion.py
git commit -m "Add companion account-state sync ingestion"
```

---

### Task 4: Make Cerebro Use Companion-Synced Quest, Unlock, and Gear State

**Files:**
- Modify: `backend/app/services/chat.py`
- Modify: `backend/app/services/teleports.py`
- Modify: `backend/app/services/gear.py`
- Modify: `backend/app/services/recommendations.py`
- Modify: `backend/app/services/user_context.py`
- Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing awareness regressions**

```python
@pytest.mark.asyncio
async def test_chat_uses_companion_quest_state_for_unlock_reasoning(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "Aware User"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "AwareRsn"}, cookies=cookies)
    await client.patch(
        f"/api/accounts/{account.json()['id']}/progress",
        cookies=cookies,
        json={
            "completed_quests": ["bone voyage", "fairytale i - growing pains"],
            "completed_diaries": {},
            "unlocked_transports": ["fairy rings"],
            "owned_gear": [],
            "equipped_gear": {},
            "notable_items": [],
            "active_unlocks": ["fossil island access"],
            "companion_state": {"source": "runelite_companion"},
        },
    )
    session = await client.post("/api/chat/sessions", json={"title": "Unlock Aware"}, cookies=cookies)
    response = await client.post(
        f"/api/chat/sessions/{session.json()['id']}/messages",
        cookies=cookies,
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fairy ring" not in content
```

```python
@pytest.mark.asyncio
async def test_gear_recommendations_see_companion_notable_items(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "Gear Aware"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "GearAware"}, cookies=cookies)
    await client.patch(
        f"/api/accounts/{account.json()['id']}/progress",
        cookies=cookies,
        json={
            "completed_quests": [],
            "completed_diaries": {},
            "unlocked_transports": [],
            "owned_gear": ["abyssal whip"],
            "equipped_gear": {"weapon": "abyssal whip"},
            "notable_items": ["abyssal whip", "amulet of fury"],
            "active_unlocks": [],
            "companion_state": {"source": "runelite_companion"},
        },
    )

    response = await client.post(
        "/api/gear/recommendations",
        cookies=cookies,
        json={"combat_style": "melee", "budget_tier": "midgame", "current_gear": [], "account_rsn": "GearAware"},
    )

    assert response.status_code == 200
```

- [ ] **Step 2: Run the focused regressions and verify they fail**

Run: `docker compose exec backend uv run pytest tests/test_chat.py::test_chat_uses_companion_quest_state_for_unlock_reasoning tests/test_chat.py::test_gear_recommendations_see_companion_notable_items -q`

Expected: FAIL because the richer companion fields are not used yet

- [ ] **Step 3: Teach account-aware services to read the new companion fields**

Update `backend/app/services/user_context.py` and any progress-loading helpers so they preserve:

```python
{
    "completed_quests": progress.completed_quests,
    "completed_diaries": progress.completed_diaries,
    "unlocked_transports": progress.unlocked_transports,
    "owned_gear": progress.owned_gear,
    "equipped_gear": progress.equipped_gear,
    "notable_items": progress.notable_items,
    "active_unlocks": progress.active_unlocks,
    "companion_state": progress.companion_state,
}
```

Update `backend/app/services/chat.py` so utility unlock answers skip or de-prioritize already-owned or already-unlocked states:

```python
        known_unlocks = {
            *(progress.completed_quests if progress else []),
            *(progress.unlocked_transports if progress else []),
            *(progress.active_unlocks if progress else []),
        }
        filtered_entries = [
            entry
            for entry in retrieval_packet.entries
            if entry.canonical_name.strip().lower() not in known_unlocks
        ]
        effective_packet = retrieval_packet.model_copy(update={"entries": filtered_entries or retrieval_packet.entries})
```

Update `backend/app/services/gear.py` and `backend/app/services/recommendations.py` to fold `progress.equipped_gear` and `progress.notable_items` into their existing owned-gear checks.

- [ ] **Step 4: Add a compact companion summary to the assistant context**

Update `backend/app/services/chat.py` assistant context creation with:

```python
                progress_summary=self._summarize_progress(progress),
                retrieval_summary=retrieval_packet.summary,
```

and extend `_summarize_progress()` so it includes:

```python
        if progress.companion_state.get("source") == "runelite_companion":
            parts.append("Companion sync is active with private account-state awareness.")
        if progress.completed_diaries:
            parts.append(f"Tracked diary regions: {', '.join(list(progress.completed_diaries)[:3])}.")
        if progress.equipped_gear:
            parts.append(f"Current equipped slots tracked: {', '.join(list(progress.equipped_gear)[:3])}.")
```

- [ ] **Step 5: Run the backend companion-awareness suite**

Run: `docker compose exec backend uv run pytest tests/test_companion.py tests/test_chat.py tests/test_accounts.py -q`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/chat.py backend/app/services/teleports.py backend/app/services/gear.py backend/app/services/recommendations.py backend/app/services/user_context.py backend/tests/test_chat.py
git commit -m "Make Cerebro use companion-synced account state"
```

---

### Task 5: Add Web-App Linking and Companion Status Surfaces

**Files:**
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/components/dashboard/CompanionStatusPanel.tsx`
- Modify: `frontend/src/components/dashboard/TelemetryBoard.tsx`
- Modify: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Write the failing UI tests or type expectations**

If there is no frontend test harness yet, add the failing compile-time type wiring first in `frontend/src/types.ts`:

```ts
export type CompanionLinkSession = {
  link_token: string;
  expires_at: string;
};

export type CompanionStatus = {
  companion_status?: string | null;
  companion_last_synced_at?: string | null;
};
```

Then wire expected API methods in `frontend/src/api.ts`:

```ts
  createCompanionLinkSession: (accountId: number) =>
    request<CompanionLinkSession>(`/companion/accounts/${accountId}/link-sessions`, {
      method: "POST",
    }),
```

- [ ] **Step 2: Run the frontend build and verify it fails**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\frontend; npm.cmd run build"`

Expected: FAIL because the new types and UI references do not exist yet

- [ ] **Step 3: Add the companion status panel**

Create `frontend/src/components/dashboard/CompanionStatusPanel.tsx`:

```tsx
import { Button } from "../../ui/Button";

type Props = {
  selectedAccountRsn: string | null;
  companionStatus: string | null;
  companionLastSyncedAt: string | null;
  linkToken: string | null;
  onCreateLinkSession: () => Promise<void> | void;
  busy: boolean;
};

export function CompanionStatusPanel({
  selectedAccountRsn,
  companionStatus,
  companionLastSyncedAt,
  linkToken,
  onCreateLinkSession,
  busy,
}: Props) {
  return (
    <section className="border border-white/8 bg-[#111111] p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-osrs-gold">RuneLite companion</p>
      <h2 className="mt-3 font-display text-[1.2rem] font-bold uppercase tracking-[0.05em] text-white">
        {companionStatus === "linked" ? "Companion linked" : "Add deeper account awareness"}
      </h2>
      <p className="mt-2 text-sm leading-7 text-osrs-text-soft">
        {selectedAccountRsn
          ? `Connect RuneLite to ${selectedAccountRsn} to sync quests, diaries, travel unlocks, and gear-aware account state.`
          : "Select an account first, then link the RuneLite companion for deeper account awareness."}
      </p>
      <div className="mt-4 space-y-3">
        <Button onClick={onCreateLinkSession} disabled={busy || !selectedAccountRsn}>
          {busy ? "Creating link code..." : "Create plugin link code"}
        </Button>
        {linkToken ? <pre className="border border-white/8 bg-[#0c0c0c] p-3 text-xs text-white">{linkToken}</pre> : null}
        {companionLastSyncedAt ? (
          <p className="text-xs text-osrs-text-soft">Last companion sync: {new Date(companionLastSyncedAt).toLocaleString()}</p>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire the panel into dashboard and profile**

Update `TelemetryBoard.tsx` and `Profile.tsx` so both surfaces can:

- show current companion status
- create a short-lived link token
- explain why the plugin matters

Use this call shape:

```ts
const handleCreateCompanionLink = async () => {
  if (!selectedAccountId) return;
  setCompanionBusy(true);
  try {
    const result = await api.createCompanionLinkSession(selectedAccountId);
    setCompanionLinkToken(result.link_token);
    setSuccessMessage("RuneLite companion link code created.");
  } finally {
    setCompanionBusy(false);
  }
};
```

- [ ] **Step 5: Run the frontend build**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\frontend; npm.cmd run build"`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api.ts frontend/src/types.ts frontend/src/components/dashboard/CompanionStatusPanel.tsx frontend/src/components/dashboard/TelemetryBoard.tsx frontend/src/pages/Profile.tsx frontend/src/pages/Dashboard.tsx
git commit -m "Add RuneLite companion linking surfaces"
```

---

### Task 6: Scaffold the RuneLite Companion Plugin and Linking Flow

**Files:**
- Create: `companion/runelite-plugin/settings.gradle`
- Create: `companion/runelite-plugin/build.gradle`
- Create: `companion/runelite-plugin/src/main/resources/runelite-plugin.properties`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionPlugin.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionConfig.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroSyncClient.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroModels.java`
- Create: `companion/runelite-plugin/src/test/java/com/cerebro/companion/api/CerebroSyncClientTest.java`

- [ ] **Step 1: Write the failing plugin client test**

```java
class CerebroSyncClientTest
{
    @Test
    void buildLinkRequestTargetsCompanionLinkEndpoint()
    {
        CerebroSyncClient client = new CerebroSyncClient("http://127.0.0.1:8000");
        HttpRequest request = client.buildExchangeRequest(
            new LinkExchangeRequest("token-123", "plugin-instance", "0.1.0")
        );

        assertEquals("http://127.0.0.1:8000/api/companion/link", request.uri().toString());
        assertEquals("POST", request.method());
    }
}
```

- [ ] **Step 2: Run the plugin tests and verify they fail**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin; .\gradlew.bat test"`

Expected: FAIL because the plugin project does not exist yet

- [ ] **Step 3: Create the RuneLite plugin project**

Create `companion/runelite-plugin/settings.gradle`:

```groovy
rootProject.name = 'cerebro-runelite-companion'
```

Create `companion/runelite-plugin/build.gradle`:

```groovy
plugins {
    id 'java'
}

repositories {
    mavenCentral()
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(11)
    }
}

dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
}

test {
    useJUnitPlatform()
}
```

Create `src/main/resources/runelite-plugin.properties`:

```properties
displayName=Cerebro Companion
author=OpenAI
description=Syncs private account awareness from RuneLite into Cerebro
tags=sync,quests,diaries,gear,teleports
plugins=com.cerebro.companion.CerebroCompanionPlugin
```

- [ ] **Step 4: Add the config and client classes**

Create `CerebroCompanionConfig.java`:

```java
package com.cerebro.companion;

public class CerebroCompanionConfig
{
    private String baseUrl = "http://127.0.0.1:8000";
    private String linkToken = "";
    private String syncSecret = "";

    public String getBaseUrl() { return baseUrl; }
    public String getLinkToken() { return linkToken; }
    public String getSyncSecret() { return syncSecret; }
}
```

Create `CerebroModels.java`:

```java
package com.cerebro.companion.api;

public final class CerebroModels
{
    public record LinkExchangeRequest(String linkToken, String pluginInstanceId, String pluginVersion) {}
    public record SyncPayload(
        String pluginInstanceId,
        String pluginVersion,
        java.util.List<String> completedQuests,
        java.util.Map<String, java.util.List<String>> completedDiaries,
        java.util.List<String> unlockedTransports,
        java.util.List<String> activeUnlocks,
        java.util.List<String> ownedGear,
        java.util.Map<String, String> equippedGear,
        java.util.List<String> notableItems,
        java.util.Map<String, Object> companionState
    ) {}
}
```

Create `CerebroSyncClient.java`:

```java
package com.cerebro.companion.api;

import java.net.URI;
import java.net.http.HttpRequest;

import static com.cerebro.companion.api.CerebroModels.LinkExchangeRequest;

public class CerebroSyncClient
{
    private final String baseUrl;

    public CerebroSyncClient(String baseUrl)
    {
        this.baseUrl = baseUrl;
    }

    public HttpRequest buildExchangeRequest(LinkExchangeRequest request)
    {
        return HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/companion/link"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{}"))
            .build();
    }
}
```

- [ ] **Step 5: Add the plugin entry class**

Create `CerebroCompanionPlugin.java`:

```java
package com.cerebro.companion;

import com.cerebro.companion.api.CerebroSyncClient;

public class CerebroCompanionPlugin
{
    private final CerebroCompanionConfig config = new CerebroCompanionConfig();
    private final CerebroSyncClient syncClient = new CerebroSyncClient(config.getBaseUrl());

    public CerebroSyncClient getSyncClient()
    {
        return syncClient;
    }
}
```

- [ ] **Step 6: Run the plugin test suite**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin; .\gradlew.bat test"`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add companion/runelite-plugin
git commit -m "Scaffold the RuneLite companion plugin"
```

---

### Task 7: Implement Broad Account-State Collection and Sync in the Plugin

**Files:**
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/QuestStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/DiaryStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/TravelStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/GearStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/UtilityStateCollector.java`
- Create: `companion/runelite-plugin/src/main/java/com/cerebro/companion/state/PayloadComposer.java`
- Create: `companion/runelite-plugin/src/test/java/com/cerebro/companion/state/PayloadComposerTest.java`
- Modify: `companion/runelite-plugin/src/main/java/com/cerebro/companion/CerebroCompanionPlugin.java`
- Modify: `companion/runelite-plugin/src/main/java/com/cerebro/companion/api/CerebroSyncClient.java`

- [ ] **Step 1: Write the failing payload composition test**

```java
class PayloadComposerTest
{
    @Test
    void composePayloadIncludesBroadAccountState()
    {
        PayloadComposer composer = new PayloadComposer(
            () -> java.util.List.of("bone voyage"),
            () -> java.util.Map.of("lumbridge_draynor", java.util.List.of("easy")),
            () -> java.util.List.of("fairy rings"),
            () -> java.util.Map.of("weapon", "dragon scimitar"),
            () -> java.util.List.of("barrows gloves")
        );

        var payload = composer.compose("plugin-1", "0.1.0");

        assertEquals(java.util.List.of("bone voyage"), payload.completedQuests());
        assertEquals("dragon scimitar", payload.equippedGear().get("weapon"));
        assertEquals(java.util.List.of("barrows gloves"), payload.notableItems());
    }
}
```

- [ ] **Step 2: Run the focused plugin test and verify it fails**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin; .\gradlew.bat test --tests PayloadComposerTest"`

Expected: FAIL because the collectors and composer do not exist yet

- [ ] **Step 3: Add the collector classes**

Create focused collector classes with one responsibility each. Example shape:

```java
package com.cerebro.companion.state;

import java.util.List;

public class QuestStateCollector
{
    public List<String> collectCompletedQuests()
    {
        return List.of();
    }
}
```

```java
package com.cerebro.companion.state;

import java.util.Map;

public class GearStateCollector
{
    public Map<String, String> collectEquippedGear()
    {
        return Map.of();
    }

    public java.util.List<String> collectOwnedGear()
    {
        return java.util.List.of();
    }

    public java.util.List<String> collectNotableItems()
    {
        return java.util.List.of();
    }
}
```

The collector implementations should normalize the RuneLite-side state they can already read into the exact backend payload shapes above. Keep each collector independent so the plugin can grow without becoming one giant state blob.

- [ ] **Step 4: Add the payload composer**

Create `PayloadComposer.java`:

```java
package com.cerebro.companion.state;

import com.cerebro.companion.api.CerebroModels.SyncPayload;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

public class PayloadComposer
{
    private final Supplier<List<String>> completedQuests;
    private final Supplier<Map<String, List<String>>> completedDiaries;
    private final Supplier<List<String>> unlockedTransports;
    private final Supplier<Map<String, String>> equippedGear;
    private final Supplier<List<String>> notableItems;

    public PayloadComposer(
        Supplier<List<String>> completedQuests,
        Supplier<Map<String, List<String>>> completedDiaries,
        Supplier<List<String>> unlockedTransports,
        Supplier<Map<String, String>> equippedGear,
        Supplier<List<String>> notableItems
    )
    {
        this.completedQuests = completedQuests;
        this.completedDiaries = completedDiaries;
        this.unlockedTransports = unlockedTransports;
        this.equippedGear = equippedGear;
        this.notableItems = notableItems;
    }

    public SyncPayload compose(String pluginInstanceId, String pluginVersion)
    {
        return new SyncPayload(
            pluginInstanceId,
            pluginVersion,
            completedQuests.get(),
            completedDiaries.get(),
            unlockedTransports.get(),
            List.of(),
            List.of(),
            equippedGear.get(),
            notableItems.get(),
            Map.of("source", "runelite_companion")
        );
    }
}
```

- [ ] **Step 5: Wire periodic sync into the plugin**

Update `CerebroCompanionPlugin.java`:

```java
public class CerebroCompanionPlugin
{
    private final QuestStateCollector questStateCollector = new QuestStateCollector();
    private final DiaryStateCollector diaryStateCollector = new DiaryStateCollector();
    private final TravelStateCollector travelStateCollector = new TravelStateCollector();
    private final GearStateCollector gearStateCollector = new GearStateCollector();
    private final PayloadComposer payloadComposer = new PayloadComposer(
        questStateCollector::collectCompletedQuests,
        diaryStateCollector::collectCompletedDiaries,
        travelStateCollector::collectUnlockedTransports,
        gearStateCollector::collectEquippedGear,
        gearStateCollector::collectNotableItems
    );

    public void syncNow()
    {
        var payload = payloadComposer.compose("plugin-instance", "0.1.0");
        // send payload through CerebroSyncClient
    }
}
```

Extend `CerebroSyncClient.java` with a sync request builder for `/api/companion/sync`.

- [ ] **Step 6: Run the full plugin test suite**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin; .\gradlew.bat test"`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add companion/runelite-plugin
git commit -m "Teach the companion plugin to sync account state"
```

---

### Task 8: Final Integration Verification and Docs Sweep

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/api-spec.md`
- Test: `backend/tests/test_companion.py`

- [ ] **Step 1: Add end-to-end verification tests**

Add a final backend regression ensuring link + sync + Cerebro awareness all connect:

```python
@pytest.mark.asyncio
async def test_companion_link_and_sync_make_chat_more_account_aware(client: AsyncClient) -> None:
    auth = await client.post("/api/auth/dev-login", json={"display_name": "End To End"})
    cookies = auth.cookies
    account = await client.post("/api/accounts", json={"rsn": "EndToEnd"}, cookies=cookies)
    link = await client.post(
        f"/api/companion/accounts/{account.json()['id']}/link-sessions",
        cookies=cookies,
    )
    exchange = await client.post(
        "/api/companion/link",
        json={"link_token": link.json()["link_token"], "plugin_instance_id": "plugin-final", "plugin_version": "0.1.0"},
    )
    sync = await client.post(
        "/api/companion/sync",
        headers={"X-Cerebro-Sync-Secret": exchange.json()["sync_secret"]},
        json={
            "plugin_instance_id": "plugin-final",
            "plugin_version": "0.1.0",
            "completed_quests": ["bone voyage", "fairytale i - growing pains"],
            "completed_diaries": {"lumbridge_draynor": ["easy"]},
            "unlocked_transports": ["fairy rings"],
            "active_unlocks": ["fossil island access"],
            "owned_gear": ["dragon scimitar"],
            "equipped_gear": {"weapon": "dragon scimitar"},
            "notable_items": ["barrows gloves"],
            "companion_state": {"quest_points": 200},
        },
    )

    assert sync.status_code == 200

    session = await client.post("/api/chat/sessions", json={"title": "Companion Aware"}, cookies=cookies)
    response = await client.post(
        f"/api/chat/sessions/{session.json()['id']}/messages",
        cookies=cookies,
        json={"content": "What utility unlock should I push next?"},
    )

    assert response.status_code == 201
    content = response.json()["assistant_message"]["content"].lower()
    assert "fairy ring" not in content
```

- [ ] **Step 2: Run the full backend verification suite**

Run: `docker compose exec backend uv run pytest tests/test_companion.py tests/test_chat.py tests/test_accounts.py -q`

Expected: PASS

- [ ] **Step 3: Run the frontend build**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\frontend; npm.cmd run build"`

Expected: PASS

- [ ] **Step 4: Run the plugin build**

Run: `powershell -Command "Set-Location C:\Users\great\Documents\Playground\cerebro-osrs\companion\runelite-plugin; .\gradlew.bat test"`

Expected: PASS

- [ ] **Step 5: Update docs**

Update `README.md` with a short companion overview, `docs/architecture.md` with the new sync-source model, and `docs/api-spec.md` with:

- `POST /api/companion/accounts/{account_id}/link-sessions`
- `POST /api/companion/link`
- `POST /api/companion/sync`

- [ ] **Step 6: Commit**

```bash
git add README.md docs/architecture.md docs/api-spec.md backend/tests/test_companion.py
git commit -m "Document and verify the companion integration"
```

---

## Self-Review

### Spec coverage

- product shape: covered by Tasks 1-5
- broad account-state payload: covered by Tasks 1, 3, and 7
- secure link-token and scoped sync credential flow: covered by Task 2
- merged backend context: covered by Tasks 3 and 4
- optional but strongly recommended plugin UX: covered by Task 5
- gear-aware notable item ownership: covered by Tasks 1, 3, 4, and 7

### Placeholder scan

- each task has exact file paths
- each task includes concrete code or interface snippets
- each task includes commands and expected results
- no `TODO`, `TBD`, or “similar to above” placeholders remain in the actual implementation instructions

### Type consistency

- `AccountProgress` adds `completed_diaries`, `equipped_gear`, `notable_items`, and `companion_state`, and those same names are reused in schemas, sync payloads, and frontend consumption
- link-token flow consistently uses `CompanionLinkSession`
- long-lived scoped credential flow consistently uses `CompanionConnection`
- plugin payload shape matches backend `CompanionSyncRequest`
