# RuneLite Companion Local Test Guide

## What this is

This guide walks through the Windows-first local test flow for the Cerebro RuneLite companion.

## Prerequisites

- Docker Desktop running
- Cerebro repo checked out locally
- Java available on Windows

## Start Cerebro

From the repo root:

```powershell
docker compose up -d postgres redis backend
```

Then in a second terminal:

```powershell
cd frontend
npm.cmd run dev
```

Open:

- http://127.0.0.1:5173
- optional health check: http://127.0.0.1:8000/health

## Generate a plugin link code

1. Sign in to Cerebro.
2. Select your RSN.
3. Open the RuneLite companion panel.
4. Click `Create plugin link code`.
5. Keep the link code visible.

## Launch the local companion client

From:

```text
companion\runelite-plugin\scripts\run-cerebro-companion.bat
```

Double-click the batch file or run it from PowerShell.

## Link the plugin

1. Open the Cerebro Companion plugin config.
2. Confirm the base URL is `http://127.0.0.1:8000`.
3. Paste the link code from the website into the `Link code` field.
4. Wait a moment while the plugin exchanges the code and runs its first sync automatically.

## Verify sync

- Confirm the plugin shows a recent `Last sync status` and `Last sync time`.
- Confirm the website shows the account as linked.
- Confirm the companion last-sync timestamp updates.
- Relaunch the local client and confirm it performs a fresh sync automatically once already linked.
- Ask Cerebro a question that depends on quests, diaries, teleports, or notable gear.

## Troubleshooting

- If link fails, confirm the backend is running on port 8000.
- If sync fails, confirm the base URL is correct.
- If the code expires, generate a new plugin link code in the site.
- If the client does not launch, re-run the launcher from PowerShell to read the error output.
