# Cerebro OSRS

Cerebro is an AI-powered Old School RuneScape account advisor. It combines structured OSRS knowledge, live account sync, and a guided companion experience so recommendations feel tied to the player’s real account state rather than generic game advice.

## What Cerebro Does

- answers account-specific OSRS questions in natural language
- recommends skills, quests, teleports, gear, and routing based on live progress
- keeps a structured OSRS knowledge brain behind the assistant
- supports a RuneLite companion flow for richer private account awareness

## Account Awareness

Cerebro merges multiple sync sources into one account context:

- `hiscores sync`
  - public skills and progression signals
- `companion sync`
  - completed quests
  - achievement diary state
  - travel and teleport unlocks
  - utility unlocks
  - equipped gear
  - notable owned items

The web app works without the companion, but the RuneLite companion is the recommended path for the most grounded answers on day one.

## Current Product Shape

- React + Vite frontend
- FastAPI backend
- structured OSRS knowledge corpus
- account-aware recommendations and chat
- optional RuneLite companion plugin scaffold with sync payload composition

## Tech Stack

### Frontend
- React 19
- React Router
- Vite
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis
- pytest

### Companion
- Java 11
- RuneLite plugin scaffold
- Gradle

## Project Structure

- `frontend/` - React web app
- `backend/` - FastAPI service, tests, and data models
- `companion/runelite-plugin/` - RuneLite companion plugin
- `docs/` - specs, plans, architecture, and API notes

## Status

Active product build. The current focus is launch-quality intelligence and account awareness, not gameplay automation.
