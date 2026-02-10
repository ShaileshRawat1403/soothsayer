# TODO - Tomorrow

## 1) Bedrock reliability (highest priority)
- Verify Anthropic use-case approval status in `us-east-1`.
- Verify Bedrock quota usage for selected model/profile and confirm reset window.
- Re-test Bedrock from EC2 with one fixed model and log request IDs/errors.
- Keep provider fallback disabled; return explicit provider errors only.

## 2) Ollama local-model path hardening
- Keep default EC2-safe model as `llama3.2:1b`.
- Validate UI model list exactly matches installed tags from `ollama list`.
- Add explicit UI warning when selected model tag is not installed.
- Add memory-capacity hint when model load fails due to RAM limits.

## 3) Persona and chat UX correctness
- Fix persona selection flow so `auto` and built-in personas map to valid DB records.
- Ensure first chat message always creates conversation with a valid persona ID.
- Add API/UI guardrails for missing/invalid `workspaceId`/`personaId`.

## 4) Environment + process stability
- Keep `WS_REDIS_ENABLED=false` and `WS_REDIS_FORCE_IN_DEV=false` on EC2 test env.
- Confirm PM2 startup persistence after reboot (`pm2 save`, startup script).
- Validate API/web health checks from both EC2 localhost and public endpoint.

## 5) Cleanup and type quality
- Finish remaining Prisma/type drift cleanup across API modules.
- Resolve remaining web type issues and remove dead imports.
- Add one command script for deterministic EC2 bootstrap and verification.

## 6) Ship-readiness verification
- Run full functional matrix (auth, protected routes, personas, chat, providers).
- Produce final `Working / Partial / Broken` report with root causes.
- Define go/no-go criteria for production trial.
