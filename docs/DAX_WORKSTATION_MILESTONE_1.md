# DAX Workstation Milestone 1

This note captures the current milestone outcome for the first DAX-powered Soothsayer workstation slice.

## Proven End to End

- Direct run creation from `/runs/new`
- Live run observation in `/runs/:id`
- Approval generation, approve, and deny behavior
- Truthful terminal summary for completed and failed runs
- Refresh recovery during active and approval-paused runs
- Deep-link recovery into an existing run
- Chat handoff for execution-shaped requests
- Browser-validated CTA navigation from chat into `/runs/:id`

## Product Boundary

- Chat detects execution intent and creates a run handoff.
- DAX remains the execution authority and source of lifecycle truth.
- The run console remains the single live execution surface.
- Soothsayer does not embed a second execution UI inside chat.

## Current Assumptions

- `DAX_BASE_URL` points to a live DAX server.
- DAX auth posture must be compatible with the Soothsayer proxy.
- Repo targeting may still rely on the DAX server cwd unless directory propagation is added.
- Summary is operational outcome summary, not a rich narrative recap.
- Manual recovery is supported; automatic reconnect/backoff is still a known gap.

## Stabilization Work Completed

- Run-console behavior extracted into a dedicated hook/helper path.
- DAX DTOs centralized into `@soothsayer/types` so API and web now share one contract source.
- Runtime notes documented in `docs/DAX_RUN_CONSOLE_RUNTIME.md`.
- Chat handoff UX refined and browser-validated with Playwright coverage.

## Next Deliberate Choices

Choose one only after the current path has sat long enough to reveal rough edges:

- Continue stabilization and small UX polish
- Add explicit repo-target propagation if Soothsayer must choose workspace/repo
- Revisit workflow-native DAX execution later
- Revisit inbox, replay, and richer analytics later
