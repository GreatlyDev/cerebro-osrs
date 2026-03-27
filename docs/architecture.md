# Cerebro Architecture

## Overview
Cerebro is a full-stack web application with a modular architecture.

## High-Level Components

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

Responsibilities:
- UI rendering
- user interaction
- API communication

---

### Backend API
- FastAPI

Responsibilities:
- authentication
- business logic
- recommendation engine
- chat orchestration
- data aggregation

---

### Database
- PostgreSQL

Stores:
- users
- player snapshots
- items
- quests
- training methods
- goals
- chat history

---

### Cache
- Redis

Used for:
- caching recommendations
- rate limiting
- performance optimization

---

### AI Layer
- LLM provider (OpenAI or similar)

Responsibilities:
- natural language understanding
- explanation generation
- summarization

IMPORTANT:
AI is NOT the source of truth.
All facts must come from structured data.

---

### Worker (Future)
- background jobs
- data syncing
- price updates
- snapshot refresh

---

## System Flow (Chat Example)

1. User sends message
2. Backend determines intent
3. Relevant data is fetched
4. Context is built
5. AI generates response
6. Response returned to frontend

---

## Deployment (Planned)

- Docker containers
- Docker Compose (local)
- CI/CD with GitHub Actions
- staging + production environments