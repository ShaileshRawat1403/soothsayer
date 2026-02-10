# EC2 How-To: Common Pitfalls and Workarounds

This guide captures the exact recurring issues seen while bringing up Soothsayer on EC2.

## 1) SSH Timeout to EC2

Symptoms:
- `ssh: connect to host <ip> port 22: Operation timed out`

Checks:
- Instance is running and has public IP.
- Security Group attached to the instance (not default SG unless intended).
- Inbound rule for `22` allows your **current** public IP (`x.x.x.x/32`).

Find your IP:

```bash
curl -s ifconfig.me
```

## 2) Disk Full (`ENOSPC`) During Install

Symptoms:
- `no space left on device`
- pnpm/npm fails extracting rollup/esbuild/monaco

Fix:
1. Increase EBS volume (for this project, 30 GiB+ is practical).
2. Grow filesystem:

```bash
lsblk
df -h /
sudo growpart /dev/nvme0n1 1
sudo xfs_growfs -d /
df -h /
```

3. Reinstall cleanly:

```bash
rm -rf node_modules apps/api/node_modules apps/web/node_modules
npx -y pnpm@8.12.0 install -r --config.include-optional=true
```

## 3) API Crashes with Redis Retry Errors

Symptoms:
- `MaxRetriesPerRequestError`
- `Redis pub client error: connect ETIMEDOUT`

Fix in both root and API env:

```bash
sed -i 's/^WS_REDIS_ENABLED=.*/WS_REDIS_ENABLED=false/' .env
sed -i 's/^WS_REDIS_FORCE_IN_DEV=.*/WS_REDIS_FORCE_IN_DEV=false/' .env
cp -f .env apps/api/.env
npx -y pm2@latest restart soothsayer-api --update-env
```

## 4) API Starts but Login/Register Fails

Checks:
- `DATABASE_URL` present in `apps/api/.env`
- `JWT_SECRET` present in `apps/api/.env`
- DB reachable from EC2

Quick check:

```bash
curl -i http://localhost:3000/api/health
```

## 5) Persona FK Errors in Chat

Symptoms:
- `Referenced record does not exist`
- `Conversation_personaId_fkey` errors

Cause:
- UI sent persona IDs like `auto` or stale IDs not present in DB.

Current backend behavior:
- `auto` and unknown values resolve to an active workspace persona or built-in fallback.
- If no persona exists, create one first.

Create a test persona:

```bash
# TOKEN and WS must be valid first
curl -s -X POST http://localhost:3000/api/personas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin Assistant $(date +%H%M%S)\",\"category\":\"Engineering\",\"description\":\"EC2 test persona\",\"workspaceId\":\"$WS\",\"config\":{\"systemPromptTemplate\":\"You are a practical assistant.\"}}"
```

## 6) Bedrock Doesn’t Answer (Even if Integrated)

Common errors:
- `ResourceNotFoundException`: model use-case/access not enabled for account.
- `ThrottlingException`: account/day quota exhausted.

Reality:
- This is an AWS account/quota problem, not code logic.

Workarounds:
- Switch provider to OpenAI/Groq/Ollama while waiting.
- Use Bedrock model quotas page and request increase for the exact quota key.

## 7) Ollama “Connection failed” or “model not found”

Understand scope:
- UI provider Test for local models is browser-side (`localhost` from your laptop).
- API calls use EC2-side `OLLAMA_BASE_URL` (`127.0.0.1:11434`) if configured.

Verify on EC2:

```bash
curl -s http://127.0.0.1:11434/api/tags
ollama list
```

Use exact tags shown by `ollama list`:
- `llama3.2:1b`
- `phi3:mini`
- `ministral-3:3b`

Do not assume aliases like `phi3:latest` or typo `lama3.2:1b`.

## 8) Model Too Large for Instance RAM

Symptoms:
- Ollama errors about insufficient memory.

Fix:
- Use small models (`llama3.2:1b`) on `t3.micro`.
- Remove larger models to reclaim disk/RAM pressure:

```bash
ollama rm ministral-3:3b
ollama rm phi3:mini
```

## 9) PM2 Shows Online but UI Not Reachable

Checks:
- `pm2 logs soothsayer-web --lines 100`
- `curl -i http://127.0.0.1:5173` on EC2
- Security Group has inbound `5173` from your current IP.

## 10) Fast End-to-End Verification

```bash
./scripts/ec2/functional-check.sh
```

This verifies:
- Health endpoints
- Login validation
- Admin login token issuance
- Protected route access

Then verify in UI:
- Login
- Create/select persona
- Send chat with explicit provider/model

## Recommended Stable Test Profiles

### Profile A: AWS-only
- Provider: Bedrock
- Prereq: account quotas and model access ready

### Profile B: Fast unblock
- Provider: OpenAI/Groq with API key
- Bedrock disabled until quotas approved

### Profile C: No external API
- Provider: Ollama
- Model: `llama3.2:1b`
- Instance must run Ollama service and have enough RAM
