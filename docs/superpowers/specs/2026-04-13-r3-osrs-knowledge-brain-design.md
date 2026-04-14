# R3 OSRS Knowledge Brain Design

## Goal

Build the next intelligence phase for Cerebro so it feels like a deeply knowledgeable Old School RuneScape advisor instead of a collection of prompt-specific branches. The launch target is a broad curated OSRS knowledge brain with balanced day-one coverage across the main gameplay domains, paired with a retrieval architecture that can expand safely as the game evolves.

The product goal is not just "know more facts." The goal is for Cerebro to combine trusted OSRS knowledge with the player's real account state so answers feel specific, grounded, and unique to the account in front of it.

## Scope

This design covers the backend intelligence architecture for:

- a curated launch corpus with broad OSRS coverage
- a typed knowledge-entry model instead of loose snippets
- a hybrid retrieval pipeline that combines structured facts with explanatory context
- an update path that supports growth and game changes over time
- an answer assembly flow that combines account state and retrieved knowledge cleanly

This design does not yet cover:

- frontend UI changes for showing citations or knowledge provenance
- live external crawling or unrestricted internet retrieval
- full multimodal support
- production deployment mechanics

## Product Principles

1. Cerebro should know a lot on day one, across quests, skilling, combat, routing, and money, not just one lane deeply.
2. Launch knowledge should be curated and trusted, not scraped live and accepted blindly.
3. The architecture should support future expansion without rewriting the assistant.
4. Account state and retrieved OSRS knowledge must stay separate but composable.
5. Answers should feel like "OSRS knowledge applied to my account," not generic encyclopedia output.

## Recommended Approach

Use a balanced launch corpus plus expandable retrieval architecture.

This means:

- launch with a broad curated corpus across all major OSRS domains
- structure knowledge as typed entries with metadata and tags
- retrieve both exact structured entries and supporting explanatory context
- keep the interface stable so a larger indexed corpus can be plugged in later

This approach gives the product strong breadth on day one without sacrificing trust, and it keeps the path open for future scale.

## Domain Coverage

The launch corpus should be balanced across four equal knowledge domains:

1. Quests and unlocks
2. Skilling and progression
3. Gear, combat, and bossing
4. Money makers, routing, and utility

Each domain should include enough knowledge for Cerebro to handle direct questions, readiness checks, tradeoff questions, and "what should I do next?" style coaching without sounding thin.

## Knowledge Model

### Typed Entries

Knowledge should be stored as typed entries instead of plain paragraphs. Initial entry types:

- `quest_chain`
- `unlock`
- `skill_method`
- `boss_profile`
- `gear_progression`
- `money_maker`
- `travel_utility`
- `account_routing_pattern`

These types are enough for the launch corpus while still being simple enough to reason about and test.

### Common Entry Fields

Every entry should support a shared base shape:

- `id`
- `canonical_name`
- `entry_type`
- `domain`
- `aliases`
- `summary`
- `prerequisites`
- `benefits`
- `tradeoffs`
- `related_entries`
- `retrieval_tags`
- `source_type`
- `status`
- `confidence`
- `last_reviewed_at`
- `change_note`

Typed entries can also carry domain-specific fields. Examples:

- quest entries can store prerequisite quests, skill checks, and unlock rewards
- skill method entries can store XP profile, profit profile, attention cost, and unlock burden
- boss profiles can store access friction, prep burden, and repeatability notes
- money maker entries can store GP profile, unlock burden, setup complexity, and consistency

### Explanatory Documents

In addition to structured entries, the corpus should include longer supporting documents that explain:

- why a progression route matters
- common tradeoffs
- milestone sequencing
- routine planning
- "why now" logic

These are not replacements for structured entries. They are secondary supporting context for broader questions.

## Retrieval Architecture

### Two-Layer Retrieval

Retrieval should be built as a two-layer pipeline behind one service interface.

Layer 1: Structured entry retrieval

- high trust
- exact facts
- aliases and tagged lookup
- best for direct questions, readiness checks, and prerequisites

Layer 2: Supporting document retrieval

- explanatory guidance
- tradeoffs
- route logic
- broader planning context

The assistant should be able to receive both layers in one response-building flow.

### Retrieval Flow

For each user message:

1. classify the question type
2. infer primary and secondary domains
3. retrieve top structured entries
4. retrieve optional supporting documents when the question is broader or comparative
5. merge account context with retrieved OSRS knowledge
6. build the grounded reasoning packet for the final answer

### Retrieval Inputs

Retrieval should use:

- normalized user message
- inferred session intent
- inferred session focus
- current page or entry surface when available later
- account context hints when those hints improve routing

### Retrieval Outputs

The retrieval service should return a compact object that includes:

- matched structured entries
- matched supporting documents
- why each item matched
- confidence or ranking notes

That output should be consumable by both:

- deterministic structured responders
- the model-backed assistant layer

## Answer Composition

The assistant should answer from the overlap of account state and retrieved knowledge.

### Target Answer Order

1. Direct answer first
2. Account-specific interpretation second
3. Next-step guidance third

### Behavioral Rules

- answer the actual question before expanding
- use retrieved OSRS knowledge to explain prerequisites, tradeoffs, and alternatives
- use account state to personalize the answer
- avoid generic encyclopedia tone unless the question clearly asks for explanation
- avoid generic coaching if the player asks for a precise factual answer

### Example

If the user asks, "Am I ready for Barrows?"

The answer builder should combine:

- account stats
- tracked gear and progress
- travel access and prayer context
- retrieved `boss_profile` and `travel_utility` knowledge

The answer should then produce:

- a direct readiness judgment
- the main blockers or strengths
- the cleanest next step

## Growth and Update Path

### Knowledge Status Model

Knowledge entries should support lifecycle states:

- `canonical`
- `staged`
- `deprecated`

At launch, Cerebro should prefer `canonical` knowledge by default.

### Update Modes

The system should support three update modes over time:

1. Manual curated additions
2. Structured refresh passes for changed game areas
3. Later, semi-automated ingestion that creates reviewable draft entries

This preserves trust while still giving the system a realistic path to growth.

### Metadata for Change Management

Each entry should carry enough metadata to help manage change:

- `source_type`
- `status`
- `confidence`
- `last_reviewed_at`
- `change_note`

This allows the corpus to expand safely and lets stale or changed information be updated intentionally instead of drifting silently.

## Architecture Changes

### New Backend Responsibilities

Add a dedicated knowledge subsystem with responsibilities split cleanly:

- corpus loading and validation
- structured entry retrieval
- supporting document retrieval
- ranking and packaging
- future indexing hooks

This should not stay as a single small snippet file once R3 begins.

### Recommended Modules

- `knowledge_models.py`
- `knowledge_store.py`
- `knowledge_retrieval.py`
- `knowledge_ranker.py`
- `knowledge_loader.py`

The current retrieval service can be evolved into this structure rather than replaced all at once.

### Integration Points

The chat/assistant pipeline should integrate with the knowledge system in two places:

1. deterministic structured reasoning path
2. model-backed assistant prompt construction

That ensures both fallback and AI responses benefit from the same brain.

## Data Storage Strategy

For the launch phase, use repo-managed curated data files so the corpus is:

- inspectable
- version-controlled
- testable
- easy to review

A practical first launch shape is:

- structured JSON or YAML knowledge entry files by domain
- supporting markdown or text documents by domain

The service layer should load these into typed in-memory models for retrieval.

This is the right tradeoff for launch because it is safer and easier to verify than introducing a heavier storage system too early.

## Error Handling

The knowledge system should fail safely.

If retrieval finds nothing useful:

- the assistant should fall back to account-grounded reasoning
- it should avoid pretending to know more than the corpus supports

If a knowledge entry is missing a related field:

- retrieval should still work with the fields that are present
- the loader should emit validation warnings in tests

If supporting documents are available but no structured entries are found:

- the assistant may use the documents carefully
- but should express lower confidence than when structured entries are present

## Testing Strategy

Testing should move beyond "did a prompt branch fire."

### Unit Tests

- entry validation
- alias matching
- domain classification
- retrieval ranking
- knowledge status filtering

### Integration Tests

- direct factual question uses structured knowledge
- broad planning question uses both structured and explanatory knowledge
- account-specific answer still respects account state over generic knowledge
- canonical entries are preferred over staged ones

### Regression Tests

- important launch questions across all four major domains
- readiness questions
- unlock chain questions
- skilling tradeoff questions
- money-maker burden questions
- boss-prep questions

## Rollout Plan

### Phase 1

- define the typed knowledge model
- create repo-managed launch corpus structure
- migrate current snippet logic into the new shape
- keep the existing assistant interface stable

### Phase 2

- expand day-one corpus across the four balanced domains
- improve retrieval ranking and packaging
- add regression tests for launch-critical question families

### Phase 3

- add staged-versus-canonical workflow
- prepare future indexing hooks
- prepare semi-automated draft-ingestion path

## Success Criteria

R3 is successful when:

- Cerebro can answer a much wider set of OSRS questions with grounded confidence
- answers feel noticeably more personal because broader OSRS knowledge is being applied to the player's real account
- launch coverage is broad across quests, skilling, combat, and money/routing
- the retrieval system is structured enough to grow without rewriting the assistant
- knowledge updates can be reviewed and expanded safely over time

## Open Decisions Already Resolved

- prioritize broad OSRS knowledge first over deeper account-state modeling
- use a hybrid retrieval architecture
- launch with a large curated trusted corpus
- balance launch coverage across all four major domains
- design the system to expand over time instead of trying to know literally everything from day one
