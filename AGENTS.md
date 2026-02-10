# AGENTS.md

Operational guidance for engineers/agents running Soothsayer in development and EC2 test environments.

## Environment Baseline

- API: `apps/api` (NestJS)
- Web: `apps/web` (Vite React)
- Default API port: `3000`
- Default Web port: `5173`
- EC2 path used in this project: `/home/ec2-user/soothsayer`

## Required Runtime Variables

Minimum required:

- `DATABASE_URL`
- `JWT_SECRET`

Strongly recommended on EC2 dev:

- `WS_REDIS_ENABLED=false`
- `WS_REDIS_FORCE_IN_DEV=false`
- `ADMIN_SEED_EMAIL=admin@soothsayer.local`
- `ADMIN_SEED_PASSWORD=password123`
- `AWS_REGION=us-east-1` (if Bedrock used)
- `BEDROCK_MODEL_ID=<model-id>` (if Bedrock used)
- `OLLAMA_BASE_URL=http://127.0.0.1:11434` (if Ollama used)

## Process Model

Use PM2 for persistence:

```bash
pm2 start infra/ec2/ecosystem.config.cjs
pm2 save
pm2 status
```

Foreground dev commands:

```bash
npx -y pnpm@8.12.0 --filter @soothsayer/api dev
npx -y pnpm@8.12.0 --filter @soothsayer/web exec vite --host 0.0.0.0 --port 5173
```

## Known Failure Modes and First Checks

1. `MaxRetriesPerRequestError` from Redis:
- Confirm `WS_REDIS_ENABLED=false` in both `.env` and `apps/api/.env`.
- Restart API with env refresh: `pm2 restart soothsayer-api --update-env`.

2. API fails with env validation:
- Confirm `DATABASE_URL` and `JWT_SECRET` exist in `apps/api/.env`.

3. Prisma not initialized:
- Run:
  - `npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:generate`
  - `npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:push`

4. Bedrock errors:
- `ResourceNotFoundException`: account/model use-case access not completed.
- `ThrottlingException`: account quota exhausted; switch provider/model or request quota increase.

5. Ollama 404 model not found:
- Model tag mismatch. Check exact tags with `ollama list`.
- Use exact IDs in UI and backend (e.g., `llama3.2:1b`, `phi3:mini`).

## Functional Validation

Use:

```bash
./scripts/ec2/functional-check.sh
```

Then validate provider chat with explicit provider/model in UI.

## Non-Goals in Dev

- Do not enable blanket auth bypass by default.
- Do not hide provider inference failures with generic fallback replies.
