# R3 Knowledge Brain Phase 2 Design

## Goal

Build the next major backend intelligence phase for Cerebro so the assistant becomes broader, more reliable, and more account-specific at the same time. This phase should move Cerebro beyond a good first retrieval layer and into a system that:

- knows much more OSRS on day one
- chooses the right knowledge more consistently
- applies that knowledge directly inside account-aware answers

The product goal is for replies to feel like "a real OSRS brain applied to my exact account" rather than "a model with some helpful snippets."

## Why This Phase Exists

The first R3 slice established the typed knowledge foundation:

- structured entries
- supporting documents
- a balanced launch corpus scaffold
- retrieval packets in chat
- launch-safe lifecycle states

That was the right first move, but it still leaves three real gaps:

1. the launch corpus is still too thin for the breadth we want
2. retrieval and routing are still too shallow for reliable broad coverage
3. many deterministic account-aware answers still do not consume the richer knowledge brain directly

This phase exists to close those three gaps together instead of treating them as disconnected projects.

## Scope

This design covers the next backend intelligence phase for:

- expanding the curated OSRS corpus across all launch domains
- improving retrieval and routing quality
- making deterministic responders knowledge-driven instead of only prompt-branch driven
- adding the regression coverage needed to keep answer quality stable as the corpus grows

This design does not cover:

- frontend knowledge provenance UI
- live internet retrieval or scraping
- multimodal inputs
- deployment mechanics

## Product Principles

1. Breadth matters. Cerebro should feel broadly knowledgeable across core OSRS topics, not impressive in only one lane.
2. Retrieval quality matters as much as corpus size. More knowledge is not enough if the wrong entries are chosen.
3. Account-specific answers matter more than generic explanation. OSRS knowledge only becomes product value when it is applied to the user's account state.
4. Deterministic and model-backed paths should converge on the same knowledge brain, not drift into separate systems.
5. Growth must stay launch-safe. Expanding the corpus should not quietly lower trust.

## Approaches Considered

### 1. Corpus-First

Add a much larger amount of curated OSRS knowledge first, then improve routing and account-aware usage later.

Strengths:

- fastest path to broader raw coverage
- easiest to see immediate corpus growth

Weaknesses:

- retrieval quality will still bottleneck answer quality
- Cerebro may know more without sounding much smarter
- deterministic account answers remain underpowered

### 2. Routing-First

Improve retrieval, domain detection, and ranking first, then expand the corpus behind it.

Strengths:

- cleaner architecture
- stronger selection logic before scale

Weaknesses:

- the improved engine still has limited content to work with
- day-one user-visible gains will be smaller

### 3. Phased Full-Stack R3

Expand the balanced corpus, improve retrieval/routing on top of it, and then wire deterministic account-aware responders into that richer knowledge brain.

Strengths:

- strongest user-visible gains
- avoids creating three disconnected intelligence tracks
- keeps the product centered on account-specific OSRS reasoning

Weaknesses:

- requires more coordination across corpus, retrieval, and responder layers

## Recommended Approach

Use the phased full-stack R3 approach.

This phase should be treated as one coordinated intelligence upgrade with three pillars:

1. Bigger day-one OSRS brain
2. Smarter retrieval and routing
3. Knowledge-driven account answers

That order gives us compounding gains:

- a larger corpus gives retrieval something meaningful to choose from
- smarter routing makes the larger corpus feel intentionally used
- knowledge-driven responders make the improved knowledge actually visible in direct account answers

## Pillar 1: Bigger Day-One OSRS Brain

### Coverage Goal

Expand the curated corpus across the four balanced launch domains:

1. quests and unlocks
2. skilling and progression
3. gear, combat, bossing, and slayer
4. money, routing, and utility

The goal is not only "more entries." The goal is better coverage of the kinds of questions people actually ask:

- readiness
- prerequisites
- comparisons
- tradeoffs
- unlock value
- route friction
- follow-up planning

### Content Bias

The new corpus should bias toward high-leverage knowledge objects such as:

- quest prerequisite chains
- travel and utility unlocks
- skill method comparisons
- boss access and prep burden
- slayer unlock leverage
- money-maker unlock burden
- route-quality and friction guidance
- progression patterns that translate into practical coaching

### Corpus Shape

The existing typed entry model remains the base shape. This phase should expand:

- entry count
- alias quality
- retrieval tags
- related-entry link coverage
- supporting document depth

Supporting documents should also become more useful for broader questions such as:

- "why now instead of later?"
- "what should I prioritize this weekend?"
- "what gives the best mix of profit and progression?"

## Pillar 2: Smarter Retrieval and Routing

### Problem

The current retrieval layer ranks useful entries, but it still behaves more like a good keyword matcher than a richer routing system. That is good enough for the first foundation, but not enough for broad launch-quality intelligence.

### Target Behavior

Retrieval should become better at identifying:

- what kind of question is being asked
- which domain or domains matter
- whether the user wants facts, readiness, tradeoffs, or planning
- whether supporting documents should be included
- which entries should be favored because of account context or session context

### Retrieval Additions

This phase should introduce a more explicit routing layer that can infer:

- question mode:
  - factual
  - readiness
  - comparison
  - planning
  - explanation
- primary domain
- secondary domain
- whether supporting documents are required

The retrieval packet should also become more expressive. In addition to matched entries and documents, it should carry:

- route classification
- domain hints
- compact match reasons
- ranking notes useful for deterministic responders

### Account-Aware Retrieval

Retrieval should stay account-aware without collapsing account state and knowledge into one object.

That means account context may influence ranking, but never replace curated knowledge. Examples:

- a prayer-light account may favor entries about sustain or route comfort
- a weak-travel account may favor utility unlock and travel entries
- a money-focused session may favor lower-burden money methods even when absolute GP is not highest

## Pillar 3: Knowledge-Driven Account Answers

### Problem

Some of Cerebro's strongest account-aware answers still come from deterministic responders that rely mostly on hand-built local logic. Those responders are useful, but they are not yet fully powered by the richer knowledge brain we just built.

### Target Behavior

Direct account answers should increasingly combine:

- account state
- stored progress
- session context
- retrieved OSRS knowledge

This is where the product becomes meaningfully more special.

### High-Value Responder Lanes

The first deterministic lanes to make knowledge-driven should be:

- readiness checks
- unlock advice
- route and utility guidance
- skilling tradeoff answers
- money and planning comparisons
- boss and slayer preparation guidance

These are the places where the gap between generic logic and true OSRS reasoning is most noticeable.

### Answer Contract

When a deterministic responder uses the knowledge brain, the answer should still follow the same response order:

1. direct answer
2. account-specific interpretation
3. next-step guidance

The knowledge layer should make those answers broader and smarter, not more verbose or more encyclopedic.

## Architecture Changes

### Existing Foundation to Keep

Keep the current split between:

- `knowledge_models.py`
- `knowledge_loader.py`
- `knowledge_store.py`
- `knowledge_ranker.py`
- `knowledge_retrieval.py`
- `knowledge_base.py`

That structure is still right.

### New Responsibilities

This phase should add or extend responsibilities for:

- domain and question-mode routing
- richer retrieval packet metadata
- corpus expansion tooling or patterns
- deterministic responder helpers that consume structured knowledge packets

If a new helper module is needed for chat-side knowledge application, it should be introduced deliberately rather than stuffing that logic into `chat.py`.

## Testing Strategy

This phase should raise backend intelligence coverage in four directions:

### 1. Corpus Coverage Tests

Prove that the curated launch corpus reaches the intended breadth across:

- quests
- skilling
- combat
- economy

### 2. Retrieval Routing Tests

Prove that different question types pull the right domains and the right types of context:

- factual
- readiness
- comparison
- planning

### 3. Knowledge-Backed Chat Tests

Prove that model-backed chat receives the correct structured knowledge for broader OSRS questions.

### 4. Deterministic Responder Tests

Prove that direct account-aware responses now use retrieved knowledge where appropriate, instead of only narrow local heuristics.

## Execution Order

This phase should be implemented in this order:

1. expand the curated corpus and supporting documents
2. improve retrieval routing and ranking
3. wire deterministic responders into the richer knowledge packets
4. strengthen regression coverage across all three layers

This order matters. It gives each layer a better base before the next one is built.

## Risks and Mitigations

### Risk: Corpus growth becomes noisy

Mitigation:

- keep entries typed and scoped
- prefer high-leverage knowledge over random fact accumulation
- preserve canonical versus staged separation

### Risk: Retrieval gets too clever and becomes opaque

Mitigation:

- keep routing signals compact and testable
- expose match reasons in the retrieval packet
- add ranking tests for representative questions

### Risk: Deterministic responders become bloated

Mitigation:

- add focused helper functions or modules for knowledge application
- keep chat orchestration separate from answer assembly logic where possible

## Success Criteria

This phase is successful when:

- Cerebro can answer a noticeably broader set of OSRS questions with grounded knowledge on day one
- retrieval chooses the right knowledge more consistently for broad and comparative questions
- direct account-aware answers feel more uniquely tied to the player's account because they now use the knowledge brain directly
- regression tests protect both corpus quality and routing quality

## Non-Goals

This phase is not trying to:

- finish all future RAG work
- ingest the whole OSRS internet
- solve update automation completely
- replace every existing deterministic answer path at once

It is trying to make the next R3 step strong, broad, and durable enough to feel like a real leap in product intelligence.
