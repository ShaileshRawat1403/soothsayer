# Soothsayer Release Gate Checklist

Use this checklist before every Soothsayer release.

Scope: this is for the app release (`apps/api`, `apps/web`, `apps/worker`) and not for `workspace-mcp` package publishing.

## 1) Scope and versioning

- Confirm release branch and target tag.
- Confirm release notes scope:
  - Soothsayer app changes
  - MCP package changes (if any) listed separately
- Confirm DB migration impact (none / additive / breaking).

## 2) Mandatory static gates

Run from repo root:

```bash
npx -y pnpm@8.12.0 typecheck
npx -y pnpm@8.12.0 lint
```

If lint is noisy in your environment, at minimum run:

```bash
npx -y pnpm@8.12.0 --filter @soothsayer/api typecheck
npx -y pnpm@8.12.0 --filter @soothsayer/web exec tsc --noEmit
```

## 3) Runtime preflight gates (required)

Run the local preflight script:

```bash
./scripts/release/preflight-soothsayer.sh
```

This validates:

- API health endpoint
- login flow
- chat inference path
- terminal execution path
- workflow run path
- MCP health path
- integrations status path

## 4) Redis gate

Confirm Redis behavior in logs:

- expected when enabled:
  - `WebSocket Redis adapter enabled`
  - `Connected Socket.IO adapter to Redis ...`

Required env:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_TLS`
- `WS_REDIS_ENABLED=true`
- `WS_REDIS_FORCE_IN_DEV=true` (for dev verification only)

## 5) Integrations gate

Validate both auth modes:

- OAuth mode:
  - `GET /api/integrations/:name/connect` returns `authUrl` when client ID/secret configured
- Manual token mode:
  - save token in Settings page
  - `Test` succeeds or returns provider-auth error clearly

If OAuth credentials are not configured, `Missing *_CLIENT_ID` is expected and should be documented in release notes.

## 6) Secrets and compliance gate

- Rotate any secret that was pasted into terminal/chat/history.
- Verify no secrets in diff:

```bash
rg -n "API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE KEY" . --glob '!node_modules'
```

- CI secret scan should pass.

## 7) Release artifacts and rollback

- Confirm deployment artifact versions.
- Confirm rollback target (previous release) is known and runnable.
- Confirm migration rollback strategy.

## 8) Post-release checks

- API health: `/api/health`
- Web loads and login works
- One chat, one terminal command, one workflow run
- Integrations status endpoint responds
- Error budget / logs clean for first hour

