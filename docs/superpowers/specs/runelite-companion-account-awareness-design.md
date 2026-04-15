# RuneLite Companion Account Awareness Design

## Goal

Add an optional but strongly recommended RuneLite companion plugin that makes Cerebro meaningfully more aware of a player's real OSRS account on day one.

The plugin should let Cerebro go beyond public hiscores by syncing private account-state signals that materially improve advice quality, especially around:

- completed quests
- achievement diaries
- travel and teleport unlocks
- utility unlock states
- equipped gear
- owned notable gear and account-changing items

The product goal is simple: without the companion, Cerebro is useful; with the companion, Cerebro feels deeply grounded in the player's actual account.

## Why This Exists

The current product already has two strong ingredients:

- public account awareness through hiscores-backed syncing
- a growing OSRS knowledge brain that can reason about quests, unlocks, routing, gear, profit, and progression

But there is still a major awareness gap:

- hiscores do not expose completed quest lists
- hiscores do not expose achievement diary completion
- hiscores do not expose travel unlock states
- hiscores do not expose equipped gear or owned notable items

That means too much of the account state that matters for good advice is still invisible unless the user manually enters it.

Manual entry can remain as a fallback, but it should not be the primary product story. The companion plugin exists to close that gap cleanly and make the launch experience feel truly account-aware.

## Product Principles

1. The plugin is optional, but the value of installing it should be obvious.
2. The plugin should sync only the kinds of account state that materially improve Cerebro's advice.
3. The backend should merge companion data with hiscores data into one coherent account context.
4. Launch scope should be ambitious in usefulness, but disciplined in data surface.
5. Trust and linking must be clear, revocable, and safe.

## Scope

This design covers:

- the product role of a RuneLite companion plugin
- the launch payload shape for synced account state
- the backend integration model
- secure linking between plugin, Cerebro user, and RSN
- launch MVP scope and boundaries
- the launch-safe gear-aware notable item ownership model

This design does not cover:

- the exact plugin UI implementation details inside RuneLite
- every future account-state category we may eventually sync
- bank-wide or inventory-wide raw ingestion
- screenshot or multimodal import fallbacks
- deployment or infra details

## Approaches Considered

### 1. Quest-Only Plugin

Build a companion plugin that syncs only completed quests.

Strengths:

- fastest initial sync win
- immediately improves quest and unlock reasoning

Weaknesses:

- still leaves diaries, travel, and utility state mostly invisible
- makes the plugin feel narrower than the product vision
- still leaves gear and readiness advice under-informed

### 2. Broad Account-State Plugin

Build a companion plugin that syncs completed quests, achievement diaries, travel and utility unlock states, equipped gear, and owned notable gear.

Strengths:

- strongest launch-day awareness jump
- improves multiple advice lanes at once
- matches the product goal of making Cerebro feel deeply grounded

Weaknesses:

- larger first implementation
- requires tighter payload and trust design

### 3. Thin Plugin with Heavy Server Inference

Send a smaller number of raw signals from the plugin and rely on the backend to infer the rest.

Strengths:

- smaller plugin surface
- less initial data modeling

Weaknesses:

- more guesswork
- lower trust
- more brittle account awareness

## Recommended Approach

Use the broad account-state plugin approach.

This is the right launch path because it creates the strongest difference between:

- a useful Cerebro workspace without the plugin
- a deeply aware Cerebro workspace with the plugin

It also fits the long-term product vision better than a quest-only or inference-heavy path. The plugin should be treated as a first-class sync client for private account-state signals that public OSRS surfaces do not expose.

## Product Shape

The product should have two awareness lanes:

### Public awareness lane

Driven by hiscores sync and existing backend snapshots:

- skills
- bosses and activities
- public progression signals
- snapshot deltas and session context

### Private awareness lane

Driven by the optional RuneLite companion plugin:

- completed quests
- achievement diary completion
- travel and teleport unlock states
- utility unlock states
- equipped gear
- owned notable gear and account-changing items

The backend should merge both lanes into one account context that Cerebro reads from.

This keeps the product honest:

- hiscores remain useful on their own
- the plugin makes the assistant meaningfully more personal

## Launch Sync Payload

The launch payload should be broad enough to materially improve advice, but not so wide that the first plugin becomes brittle.

### Required launch lanes

#### Quests

- completed quests
- quest points if available as a useful sanity signal

#### Achievement diaries

- completed diary tiers by region
- no requirement to support fine-grained diary task progress at launch

#### Travel and teleports

- fairy ring access
- spirit tree access
- major route unlocks
- travel systems and teleports that materially change routing advice

#### Utility unlocks

- unlock states that meaningfully improve planning, questing, route quality, or repeatable progression advice

#### Gear-aware notable item ownership

- currently equipped gear
- owned notable gear
- owned account-changing items that materially affect recommendation quality

### Explicit non-goals for the launch payload

- full raw bank snapshots
- every inventory item all the time
- full partial diary task state
- live combat/event streaming
- complete OSRS state capture

## Gear-Aware Notable Item Ownership

Launch should include gear-aware sync, but not deep raw bank ingestion.

The goal is to sync the item state that actually changes Cerebro's advice.

### Launch gear-aware sync includes

- current equipped setup
- owned notable weapons
- owned notable armor pieces
- owned important jewelry, capes, offhands, and progression-relevant items
- owned key account-changing items that affect route quality, prep burden, or unlock leverage

### Launch gear-aware sync does not include

- every bank slot
- every inventory stack
- a full item-by-item financial mirror of the player's bank

This keeps the launch version high-value and lower-risk while still letting Cerebro answer much better versions of:

- is this upgrade still worth it with my current setup?
- do I already own the next step in this lane?
- how ready am I for this boss or route with what I actually have?

## Backend Integration Shape

The plugin should integrate as a first-class sync source, not as a side channel.

### Core model

The backend should continue to treat account awareness as one merged context.

That merged context should combine:

- hiscores-backed account data
- account snapshots and deltas
- companion-synced private state
- profile, goals, and session context

### Storage direction

The existing progress model already gives us a strong place to extend:

- completed quests
- unlocked transports
- owned gear
- active unlocks

The companion integration should build on this foundation and extend it with clearer structure for:

- diary completion state
- richer utility unlock buckets
- equipped gear state
- notable item ownership
- source-aware sync metadata

### Source-awareness

The backend should know which parts of account state came from:

- manual entry
- hiscores/public sync
- companion sync

It should also track freshness and version details for companion data.

## Linking and Trust Flow

The launch flow should be simple, explicit, and revocable.

### Recommended user flow

1. The user signs into Cerebro.
2. The user links an RSN in the web app.
3. The user installs the optional RuneLite companion.
4. The user links the plugin to the Cerebro account.
5. The plugin syncs private account-state data.
6. Cerebro starts using the richer merged account context.

### Linking model

The safest launch-friendly design is:

- the web app creates a short-lived link token
- the user pastes or confirms that token inside the plugin
- the plugin exchanges the token for a scoped sync credential
- future syncs use that scoped credential until revoked

This is better than trusting only an RSN string because it lets us tie:

- the user account
- the Cerebro account
- the plugin sender

into one verified relationship.

### Visibility and trust

The product should show clear companion status such as:

- not installed
- linked
- last synced recently
- stale
- disconnected or revoked

The app should also make it obvious what better awareness the plugin unlocks.

## Launch MVP Boundary

### Launch MVP includes

- backend support for companion sync
- secure plugin linking flow
- plugin payload support for:
  - completed quests
  - completed diary tiers
  - travel and teleport unlock state
  - utility unlock state
  - equipped gear
  - owned notable gear and account-changing items
- merged account-awareness in Cerebro's backend context
- chat and recommendation logic that uses the richer state

### Launch MVP does not include

- full raw bank mirroring
- every possible OSRS state signal
- partial diary task progression
- live gameplay event streaming
- automated ingestion of every future game update

This is the right launch boundary because it is ambitious in user value without turning the first plugin into an unfinishable data platform.

## Architecture Implications for Cerebro

The companion plugin only matters if Cerebro actually consumes the richer state.

The launch implementation should specifically improve:

- quest and unlock-chain reasoning
- travel and routing advice
- achievement-diary utility guidance
- readiness and prep answers
- gear upgrade reasoning
- notable-item-aware upgrade and route judgment

This means the companion sync work is not complete when data is merely stored. It is complete when that stored data visibly improves answers.

## Risks and Mitigations

### Risk: Launch scope grows into a full bank platform

Mitigation:

- keep launch focused on gear-aware notable item ownership
- defer full raw bank sync until after launch

### Risk: Linking feels confusing or unsafe

Mitigation:

- use short-lived link tokens
- issue scoped sync credentials
- show status clearly and make unlinking possible

### Risk: Companion data and hiscores data drift apart

Mitigation:

- keep sync sources distinct but merged in one account context
- store freshness metadata
- expose stale status where relevant

### Risk: The plugin syncs too much state that does not improve advice

Mitigation:

- keep the launch payload opinionated
- only sync state that materially improves recommendation quality

## Success Criteria

This initiative is successful when:

- a player can install the optional companion and quickly link it to a Cerebro account
- Cerebro becomes more aware of quests, diaries, travel unlocks, gear, and utility state without large manual setup
- the assistant's answers feel noticeably more specific and grounded because of the synced private account state
- the launch experience remains disciplined enough to ship reliably

## Non-Goals

This design is not trying to:

- capture every possible OSRS state signal on day one
- replace hiscores sync
- build a full live telemetry platform
- ingest entire bank contents at raw full fidelity for launch

It is trying to make Cerebro feel deeply aware, trustworthy, and differentiated on day one of deployment.
