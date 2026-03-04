# POST_RELEASE v1.0.2 Ops Checklist

Use this checklist for production handoff and first 48-hour monitoring.

Status values:

- `ok`
- `investigate`

Fill each item with:

- owner
- timestamp
- status
- evidence link

## Release verification

- [ ] Verify `v1.0.2` release is published and points to merged `main` commit.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Verify PR merged cleanly and release notes include hardening scope.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Verify production deploy completed for `v1.0.2`.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## Hotfix guardrails

- [ ] Create/push `hotfix/v1.0.2` branch from `main`.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Confirm branch protection/rules for hotfix branch are active (critical-only policy).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Confirm team acknowledgment: no feature work on `hotfix/v1.0.2`.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## 48h monitoring

- [ ] Monitoring owner/rotation assigned for first 48 hours.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Checkpoint cadence confirmed (every 2-4 hours) and calendar/reminders set.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Incident escalation path confirmed (channel + on-call + fallback).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## Auth/session checks

- [ ] `/auth/refresh` error rate within expected baseline.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] `/auth/forgot-password` failure rate within expected baseline.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] `/auth/reset-password` failure rate within expected baseline.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] No anomalous logout/session invalidation spikes after token hashing migration.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## Terminal allowlist/cwd checks

- [ ] `execute-terminal` 403 count is stable and attributable to invalid command/cwd attempts only.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] No successful execution of non-allowlisted command text observed.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] No path traversal/outside-workspace `cwd` execution observed.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## WebSocket auth checks

- [ ] WebSocket auth rejection count is within expected range (no broad client breakage).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] No unauthenticated socket access in production logs.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Dev bypass flag remains disabled in production (`WS_AUTH_ALLOW_IN_DEV=false`).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## CI/preflight checks

- [ ] Latest `Release Gates` workflow on `main` is green.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Latest `Spec Tests` workflow on `main` is green.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Preflight script passes in target environment(s).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## MCP baseline confirmation

- [ ] Confirm `workspace-mcp` baseline unchanged at `v0.1.2`.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Confirm no unintended MCP behavior drift post-release.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`

## Go/No-Go signoff

- [ ] 24-hour checkpoint signoff: no blocking regressions.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] 48-hour checkpoint signoff: stable posture; hotfix branch remains unused or contains only critical fixes.  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
- [ ] Final `GO` for normal roadmap velocity (close elevated monitoring).  
      owner: `________` | timestamp: `________` | status: `ok / investigate` | evidence: `________`
