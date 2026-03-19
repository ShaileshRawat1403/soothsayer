# DAX Run Console Runtime Notes

This note captures the current runtime assumptions, supported behavior, and known gaps for the first Soothsayer to DAX workstation slice.

## Runtime Assumptions

- DAX is the execution authority. Soothsayer does not own run lifecycle truth.
- Soothsayer is a guarded proxy and browser control surface for DAX runs.
- `DAX_BASE_URL` must point at a live DAX server.
- The current proof used an unsecured local DAX server. If DAX server auth is enabled, Soothsayer must support the upstream auth posture or the test environment must disable it.
- `intent.repoPath` is the execution target when Soothsayer knows the target repo/workspace. `metadata.workspaceId` and `metadata.projectId` remain context only.
- If `intent.repoPath` is missing, Soothsayer now falls back explicitly to the DAX server cwd and annotates that as `default_cwd` targeting rather than silently relying on it.
- SSE behavior depends on live runtime transport. Local proof passed with backend-proxied SSE and fetch-based browser streaming.

## Supported Now

- Launch a DAX run from `/runs/new`
- Launch a DAX run from chat handoff with explicit target propagation when workspace context is known
- Launch a DAX run from workflow `dax_run` with explicit target propagation when workflow context is known
- Load a run snapshot from `/runs/:id`
- Observe live events in the browser
- Resolve approvals from the run page
- Show terminal summary for completed and failed runs
- Recover correctly on refresh during active runs
- Recover correctly on refresh during pending approval
- Open `/runs/:id` directly and continue from current DAX truth

## Operational Truths

- Approval truth comes from DAX approval records, not local UI inference.
- Deny now converges to truthful terminal failure across DAX lifecycle, snapshot, summary, and the Soothsayer run page.
- Summary is operational outcome summary, not a rich assistant-written recap.
- Event-to-snapshot projection in the web app is lightweight and intentionally subordinate to DAX snapshot truth.

## Known Gaps

- Automatic reconnect and retry/backoff for interrupted event streams
- Explicit repo targeting still falls back to DAX cwd in legacy/dev flows when no repo context is available
- Rich natural-language run summary text
- Frontend/backend mirrored DAX DTOs are temporary and should move to a shared/generated contract later

## Phase 2 Focus

The next stabilization and product-shaping work should stay in this order:

1. Keep the run console clean and stable
2. Validate and polish the chat handoff that creates a DAX run and links to `/runs/:id`
3. Revisit workflows, replay, inbox, and richer analytics only after the run console and chat handoff are stable
