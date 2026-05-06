# RuneLite Companion Local Installability Design

## Goal

This milestone turns the Cerebro RuneLite companion from "implemented code in the repo" into "something we can actually run and prove end to end on a local Windows machine."

The goal is not public plugin distribution yet. The goal is:

- run the companion locally on Windows
- link it to a real Cerebro account through the website
- send companion sync data into the local backend
- see that richer account-awareness reflected back in the product

This should feel close to a ready-to-drop local testing path, even though under the hood it still uses RuneLite's supported local development workflow rather than public plugin-hub distribution.

## Scope

This milestone includes five concrete deliverables:

1. A Gradle wrapper inside the plugin project so the companion can be built and launched without requiring a separate Gradle install.
2. A Windows-first launcher path so the local test flow is simple and repeatable.
3. Small plugin usability improvements that make link and sync state easier to understand while testing.
4. A clear local test guide that walks through the full companion flow.
5. An end-to-end verification pass against the local Cerebro stack.

This milestone does not include:

- Plugin Hub submission
- public distribution packaging
- cross-platform launch flow
- a fully polished launch-user onboarding experience

Those can come later, after we have proven the local companion loop cleanly.

## User Testing Flow

The intended local Windows test flow is:

1. Start the Cerebro backend and frontend locally.
2. Sign into the website.
3. Link or select the target RSN in the site.
4. Generate a plugin link code from the site.
5. Run a single Windows launcher from the companion plugin folder.
6. Open the RuneLite development client with the Cerebro companion available.
7. Paste the link code into the plugin config.
8. Exchange the link code for a sync secret.
9. Trigger or allow a sync.
10. Confirm on the site that the companion is linked and that richer account-awareness data has been received.

This flow is successful only if the full loop is proven, not merely if the plugin window opens. The test must show:

- link succeeded
- sync succeeded
- companion status updated in the website
- account-awareness fields became fresher or richer

## Packaging And Tooling

The plugin project should gain a Gradle wrapper so the project becomes self-contained. That removes the current dependency on a separately downloaded Gradle binary and makes the workflow much easier to reproduce.

The plugin project should also gain a Windows launcher path. The launcher should:

- use the local Gradle wrapper
- start the RuneLite development client in the plugin project context
- be simple enough that testing does not feel like a manual developer workflow every time

The launcher does not need to hide every implementation detail, but it should hide enough of the setup that a normal local test feels straightforward.

The local test path should remain honest about what it is:

- a Windows-first local development launch flow
- not yet a public plugin installer

## Plugin Testing Improvements

To make the first local test usable, the plugin should expose enough feedback to make link and sync problems diagnosable.

The plugin config experience should support:

- backend base URL
- link token entry
- a manual sync action
- visible state around whether linking is pending or complete

The plugin should also improve failure visibility around the most important local-test failure modes:

- backend not reachable
- bad base URL
- missing or invalid link token
- missing sync secret
- sync request failure

This does not require a fully polished end-user UX. It only requires enough clarity that local testing does not feel blind.

## Documentation

The plugin should gain a local test guide that covers:

- prerequisites on Windows
- how to start the Cerebro backend and frontend
- how to generate a link code in the website
- how to launch the local RuneLite companion client
- how to link the plugin
- how to force or observe sync
- how to confirm success in the site
- what to check when something fails

The documentation should be practical, short, and specific to this repository.

## Verification

Verification for this milestone should include:

- plugin tests still passing
- backend tests still passing for companion-aware flows
- frontend build still passing
- local launch flow verified from the wrapper/launcher path

The milestone should only be considered complete once the companion is locally runnable through the new Windows-first path and the sync loop can be exercised end to end.

## Risks And Boundaries

The biggest risk is pretending there is a simpler stock RuneLite installation flow than RuneLite really supports for local plugin development. This design deliberately avoids that trap.

Instead, the milestone embraces RuneLite's supported local-dev path while packaging it into a much smoother Windows-first workflow.

That gives us:

- a truthful implementation
- a testable companion flow
- a better foundation for later public distribution

## Recommendation

We should implement this as a local installability and proof milestone before doing any public plugin distribution work.

That sequencing gives the fastest path to:

- proving the companion works on a real local stack
- validating the link and sync loop
- identifying any last-mile usability problems
- preparing for later wider distribution with much higher confidence
