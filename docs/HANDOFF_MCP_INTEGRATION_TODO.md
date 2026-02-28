# Handoff: Soothsayer MCP Integration (Resume Notes)

Branch: `feat/soothsayer-mcp-integration`

## Completed
- API MCP bridge added:
  - `GET /api/mcp/health`
  - `POST /api/mcp/tools/call` (allowlisted)
- Chat integration added (feature-flagged):
  - MCP preflight context
  - optional MCP tool-call context injection
- Web API helper methods added for MCP endpoints.
- Env schema + `.env.example` enriched for MCP flags.
- Functional checks and API/web typecheck passed.
- Real-world MCP chat path validated via API (assistant message persisted with `metadata.mcp` + `metadata.mcpTool`).

## Current Constraints / Known Gaps
- Full app-wide regression not yet complete (workflows, analytics, terminal UI deep checks).
- UI Playwright E2E coverage for MCP chat path not yet added/executed.
- Ollama model mismatch can still break chat if `llama3.2:1b` is missing; local test used `llama3:latest`.

## Next Actions (in order)
1. Run full regression matrix across modules (manual + API checks).
2. Execute Redis two-pass validation:
   - Pass A: `WS_REDIS_ENABLED=false`
   - Pass B: `WS_REDIS_ENABLED=true` with running Redis
3. Add/execute Playwright E2E for MCP chat path:
   - login -> send MCP-enabled message -> assert assistant output
4. Run light soak/perf smoke (20-50 sequential MCP-enabled chat requests).
5. Open/convert PR from draft to ready only after above passes.

## Useful Commands
```bash
# Branch status
git status
git log --oneline -n 10

# Start dev
npx -y pnpm@8.12.0 --filter @soothsayer/api dev
npx -y pnpm@8.12.0 --filter @soothsayer/web exec vite --host 0.0.0.0 --port 5173

# MCP kernel (local source install path)
/Users/ananyalayek/soothsayer/workspace-mcp/.venv/bin/workspace-mcp \
  --workspace-root /Users/ananyalayek/soothsayer --profile dev

# Confidence checks
./scripts/ec2/functional-check.sh
npx -y pnpm@8.12.0 --filter @soothsayer/api typecheck
npx -y pnpm@8.12.0 --filter @soothsayer/web typecheck
```

## MCP Flags for test runs
```env
MCP_ENABLED=true
MCP_SERVER_BIN=/Users/ananyalayek/soothsayer/workspace-mcp/.venv/bin/workspace-mcp
MCP_WORKDIR=/Users/ananyalayek/soothsayer/workspace-mcp
MCP_WORKSPACE_ROOT=/Users/ananyalayek/soothsayer
MCP_PROFILE=dev
MCP_TIMEOUT_MS=15000
MCP_ALLOWED_TOOLS=kernel_version,self_check,workspace_info,repo_search,read_file
CHAT_MCP_PREFLIGHT_ENABLED=true
CHAT_MCP_TOOL_CALL_ENABLED=true
```
