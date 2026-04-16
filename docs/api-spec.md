# Cerebro API Specification

## Base Path

`/api`

## Auth

### POST `/auth/register`
Create a user account.

### POST `/auth/login`
Create a session for an existing user.

### POST `/auth/dev-login`
Development helper for local testing.

### GET `/auth/me`
Return the current authenticated user.

## Accounts

### POST `/accounts`
Create a tracked RS account by RSN.

### GET `/accounts`
List the user’s tracked accounts, including companion status when available.

### GET `/accounts/{account_id}`
Return account details and sync status.

### POST `/accounts/{account_id}/sync`
Refresh the public account snapshot from hiscores.

### GET `/accounts/{account_id}/progress`
Return normalized account progress, including companion-synced state when present.

### PATCH `/accounts/{account_id}/progress`
Update progress manually or through internal workflows.

## Companion

### POST `/companion/accounts/{account_id}/link-sessions`
Create a short-lived link token for the RuneLite companion.

Response includes:

- `link_token`
- `expires_at`

### POST `/companion/link`
Exchange a short-lived link token for a scoped sync secret.

Request body includes:

- `link_token`
- `plugin_instance_id`
- `plugin_version`

Response includes:

- `sync_secret`
- linked account metadata

### POST `/companion/sync`
Ingest companion account-state updates using the scoped sync secret.

Required header:

- `X-Cerebro-Sync-Secret`

Request body supports:

- `plugin_instance_id`
- `plugin_version`
- `completed_quests`
- `completed_diaries`
- `unlocked_transports`
- `active_unlocks`
- `owned_gear`
- `equipped_gear`
- `notable_items`
- `companion_state`

The backend normalizes and merges this payload into the tracked account’s progress state.

## Chat

### POST `/chat/sessions`
Create an advisor thread.

### GET `/chat/sessions`
List advisor threads.

### POST `/chat/sessions/{session_id}/messages`
Send a message to Cerebro and receive a grounded assistant reply.

## Goals

### POST `/goals`
Create a goal.

### GET `/goals`
List goals.

### POST `/goals/{goal_id}/plan`
Generate or refresh a goal plan.

## Recommendations and Content

The web app also relies on content and recommendation endpoints for:

- skills
- quests
- gear
- teleports
- recommendation boards

Those routes consume the same merged account context that powers chat.
