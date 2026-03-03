# Soothsayer Guide (ELI12)

This guide explains Soothsayer in simple terms so anyone can get it running and use the important features.

## 1) What is Soothsayer?

Think of Soothsayer as a smart control room:

- `Chat` lets you talk to AI.
- `Terminal` lets you run commands safely.
- `Workflows` let you automate repeated tasks.
- `Integrations` connect tools like GitHub, Slack, Jira, Notion.
- `MCP` is an optional brain-extension layer that adds safe tool context.

## 2) What is MCP here?

There are two parts:

- `Soothsayer app` (this repo root): web UI + API + worker.
- `workspace-mcp` (subfolder package): standalone MCP kernel/tool server.

Soothsayer can run without MCP, but with MCP enabled it can call allowlisted tools for extra context.

## 3) First-time local setup

From repo root:

```bash
pnpm install
docker-compose -f docker-compose.dev.yml up -d
cp .env.example .env
```

Then run DB setup:

```bash
pnpm db:migrate
pnpm db:seed
```

Start app:

```bash
pnpm dev
```

Open:

- Web: `http://localhost:5173`
- API docs: `http://localhost:3000/api/docs`

## 4) Redis setup (for real-time and scaling tests)

Set the same values in both:

- `.env`
- `apps/api/.env`

Required keys:

```env
REDIS_HOST=<your-redis-host>
REDIS_PORT=<your-redis-port>
REDIS_PASSWORD=<your-redis-password>
REDIS_TLS=false
WS_REDIS_ENABLED=true
WS_REDIS_FORCE_IN_DEV=true
```

Restart API after changes.

When it works, API logs should show Redis adapter connected/enabled.

## 5) Enable MCP bridge (optional)

In `.env` and `apps/api/.env`:

```env
MCP_ENABLED=true
MCP_SERVER_BIN=/absolute/path/to/workspace-mcp/.venv/bin/workspace-mcp
MCP_WORKDIR=/absolute/path/to/workspace-mcp
MCP_WORKSPACE_ROOT=/absolute/path/to/soothsayer
MCP_PROFILE=dev
MCP_TIMEOUT_MS=15000
CHAT_MCP_PREFLIGHT_ENABLED=true
CHAT_MCP_TOOL_CALL_ENABLED=true
MCP_ALLOWED_TOOLS=kernel_version,self_check,workspace_info,repo_search,read_file
```

Health check:

- `GET /api/mcp/health`

## 6) Integrations: OAuth and manual token modes

Soothsayer supports both:

- `OAuth connect` (recommended for normal users)
- `Manual token` (PAT/API token for power users/self-hosted)

### OAuth mode

Set provider client env values (for example GitHub):

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/integrations/github/callback
```

If client IDs are empty, `Connect OAuth` will return `Missing *_CLIENT_ID` (expected).

### Manual token mode

In Settings -> Integrations:

- Paste token in `Manual token mode`
- Click `Save Token`
- Click `Test`

Token is encrypted before storage.

## 7) Test core features quickly

1. Login.
2. Chat: send a message using configured model.
3. Terminal: run `echo hello`.
4. Workflows: run an active workflow and confirm `completed`.
5. Integrations: test one provider.
6. MCP health: confirm enabled + connected if MCP is on.

## 8) Common errors and what they mean

- `Missing GITHUB_CLIENT_ID`:
  OAuth credentials are not set yet.
- `WebSocket Redis adapter disabled`:
  Check `WS_REDIS_ENABLED` and `WS_REDIS_FORCE_IN_DEV`.
- `EADDRINUSE :3000`:
  Another API process already using port 3000.
- `No persona found`:
  Seed/create persona first.

## 9) Security basics

- Do not commit `.env`.
- Rotate secrets if shared accidentally.
- Keep OAuth secrets server-side only.
- Use least-privilege scopes for tokens and OAuth apps.

## 10) Release model

Release Soothsayer app and `workspace-mcp` package separately.

- Soothsayer release: app/API/worker features.
- MCP release: kernel package changes under `workspace-mcp/`.

