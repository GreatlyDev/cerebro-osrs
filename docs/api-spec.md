# Cerebro API Specification

## Base URL
/api

---

## Auth

### POST /auth/register
Creates a new user

### POST /auth/login
Returns JWT token

### GET /auth/me
Returns current user

---

## Profile

### GET /profile
Returns user profile

### PATCH /profile
Updates user preferences

---

## Accounts

### POST /accounts
Add RS account

### POST /accounts/{id}/sync
Fetch player stats

### GET /accounts/{id}/snapshot
Returns player snapshot

---

## Chat

### POST /chat/sessions
Create chat session

### GET /chat/sessions
List sessions

### POST /chat/sessions/{id}/messages
Send message to Cerebro

---

## Skills

### GET /skills
List skills

### GET /skills/{skill}/recommendations
Returns training methods

---

## Quests

### GET /quests
List quests

### GET /quests/{id}
Quest details

---

## Gear

### POST /gear/recommendations
Returns gear upgrades

---

## Teleports

### POST /teleports/route
Returns best routes

---

## Goals

### POST /goals
Create goal

### GET /goals
List goals

### POST /goals/{id}/plan
Generate plan