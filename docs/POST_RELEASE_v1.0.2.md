# POST_RELEASE v1.0.2

Post-release checklist and guardrails for Soothsayer `v1.0.2`.

## 1) Hotfix Branch Guardrail

Create a protected hotfix branch for critical issues only.

```bash
git checkout main
git pull origin main
git checkout -b hotfix/v1.0.2
git push -u origin hotfix/v1.0.2
```

Policy:

- Only production-breaking/security fixes.
- No feature work or refactors.
- Keep PRs small and reversible.

## 2) 48-Hour Monitoring Checklist

Track these indicators every 2-4 hours for the first 48 hours.

- `/auth/refresh` error rate
- `/auth/forgot-password` + `/auth/reset-password` failures
- `execute-terminal` `403` count (unknown command/cwd violations)
- WebSocket auth rejection count
- CI preflight pass-rate trend

### 2.1 API endpoint checks (quick smoke)

```bash
curl -sS http://localhost:3000/api/health
```

### 2.2 Local/EC2 log queries (PM2)

Use these while API is managed by PM2.

```bash
pm2 logs soothsayer-api --lines 300
```

Focused filters:

```bash
pm2 logs soothsayer-api --lines 1000 | rg "/auth/refresh|/auth/forgot-password|/auth/reset-password"
pm2 logs soothsayer-api --lines 1000 | rg "execute-terminal|Only allowlisted command templates|Working directory is outside workspace root|403"
pm2 logs soothsayer-api --lines 1000 | rg "rejected: missing websocket authentication token|rejected: invalid websocket token"
```

### 2.3 CI pass-rate checks

```bash
gh run list --workflow "Release Gates" --limit 20
gh run list --workflow "Spec Tests" --limit 20
```

Inspect failures if any:

```bash
gh run view <run-id> --log-failed
```

## 3) Release Runbook Notes (Pin)

Pin these in release discussion / ops notes:

- Terminal API is now allowlist-only (command id/name), not freeform shell text.
- WebSocket unauthenticated clients are rejected by default.
- `AUTH_BYPASS` is forbidden in production.

## 4) MCP Baseline Confirmation

Confirm and document that MCP baseline is unchanged in this release:

- `workspace-mcp` remains at `v0.1.2`.

## 5) Next PR Scope

Start follow-up work as a separate PR:

- Integrations UX (GitHub + Google Drive OAuth + token fallback).

Suggested branch:

```bash
git checkout main
git pull origin main
git checkout -b feat/integrations-ux-oauth-fallback
```
