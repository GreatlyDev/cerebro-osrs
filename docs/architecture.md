# Cerebro Architecture

## Overview

Cerebro is a full-stack OSRS advisory product built around one merged account context. The core architectural idea is that the assistant should reason from trusted structured state first, then use the language model to explain and personalize that state.

## Major Layers

### Frontend

The frontend is a React + Vite workspace shell that presents:

- dashboard telemetry
- account detail surfaces
- recommendations
- goals and plans
- the Cerebro advisor experience

It is responsible for UI rendering, stateful navigation, and calling the backend APIs that power account sync and chat.

### Backend API

The backend is a FastAPI application that handles:

- authentication and user ownership checks
- RSN/account management
- hiscores sync
- companion link and sync ingestion
- structured recommendation generation
- OSRS knowledge retrieval
- chat orchestration

### Knowledge Brain

The assistant does not rely on freeform model memory as a source of truth. Cerebro uses a curated OSRS knowledge corpus plus retrieval/routing logic, then applies that knowledge to the current account state.

### Data Store

PostgreSQL stores:

- users
- accounts
- account progress
- goals
- chat sessions/messages
- companion link sessions and connections

Redis is used as supporting infrastructure for performance and future operational needs.

## Sync Sources

### Hiscores Sync

Hiscores sync provides public account signals such as skill progression and other public-facing state.

### Companion Sync

The RuneLite companion fills in private progression state that hiscores cannot provide. It is designed as an optional but strongly recommended sync path.

Companion payloads currently cover:

- completed quests
- completed achievement diary tiers
- unlocked transports
- active utility unlocks
- owned gear
- equipped gear
- notable owned items
- companion metadata such as plugin version and sync markers

## Merged Account Context

The backend merges hiscores state and companion state into one account progress model. Cerebro reads from that merged model when generating:

- recommendations
- readiness checks
- unlock reasoning
- travel guidance
- gear-aware advice
- chat responses

This is the key product distinction: the assistant is not choosing between sync sources. It reasons from the combined account view.

## Companion Linking Flow

1. A signed-in user creates a short-lived link session in the web app.
2. RuneLite companion exchanges that token for a scoped sync secret.
3. The plugin sends account-state payloads with that secret.
4. Backend normalizes and persists the synced state.
5. Cerebro becomes more grounded because the merged account context is richer.

## Chat/Recommendation Flow

1. User asks a question or opens a page-aware advisor handoff.
2. Backend resolves the target account context.
3. Structured account state is loaded.
4. Relevant OSRS knowledge is retrieved.
5. Recommendation and chat services reason over the merged state.
6. The language model turns that grounded reasoning into a user-facing answer.

## Design Rule

AI generates language. Structured sync and structured knowledge provide truth.
