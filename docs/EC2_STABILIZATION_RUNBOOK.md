# EC2 Stabilization + Functional Readiness Runbook

This runbook assumes:
- Amazon Linux 2023
- project at `/home/ec2-user/soothsayer`
- PostgreSQL reachable by `DATABASE_URL`
- EC2 role attached for Bedrock access

## 1) Host normalization (disk + runtime)

```bash
lsblk
df -h /
sudo growpart /dev/nvme0n1 1 || true
sudo xfs_growfs -d /
df -h /
node -v
npm -v
```

Expected:
- root filesystem shows expanded size (for example ~30G)
- Node major version is 20.x

## 2) Standardize environment

```bash
cd ~/soothsayer
cp -f .env apps/api/.env

grep -q '^WS_REDIS_ENABLED=' .env || echo 'WS_REDIS_ENABLED=false' >> .env
grep -q '^WS_REDIS_FORCE_IN_DEV=' .env || echo 'WS_REDIS_FORCE_IN_DEV=false' >> .env
grep -q '^AWS_REGION=' .env || echo 'AWS_REGION=us-east-1' >> .env
grep -q '^BEDROCK_MODEL_ID=' .env || echo 'BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0' >> .env
grep -q '^ADMIN_SEED_EMAIL=' .env || echo 'ADMIN_SEED_EMAIL=admin@soothsayer.local' >> .env
grep -q '^ADMIN_SEED_PASSWORD=' .env || echo 'ADMIN_SEED_PASSWORD=password123' >> .env
grep -q '^ADMIN_SEED_NAME=' .env || echo 'ADMIN_SEED_NAME=Admin User' >> .env
grep -q '^ADMIN_SEED_ORGANIZATION=' .env || echo 'ADMIN_SEED_ORGANIZATION=Soothsayer Admin Org' >> .env

cp -f .env apps/api/.env
```

## 3) Clean cache and reinstall deterministically

```bash
cd ~/soothsayer
rm -rf ~/.npm/_cacache/tmp/* ~/.pnpm-store/v3/tmp/* 2>/dev/null || true
rm -rf node_modules apps/api/node_modules apps/web/node_modules

npx -y pnpm@8.12.0 install -r --config.include-optional=true
```

If prompted to recreate `node_modules`, answer `y`.

## 4) Verify native deps and Prisma

```bash
cd ~/soothsayer
node -e "require('@rollup/rollup-linux-x64-gnu'); console.log('rollup native OK')"

npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:generate
npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:push
npx -y pnpm@8.12.0 --filter @soothsayer/api admin:seed
```

## 5) Verify Bedrock IAM path

```bash
aws sts get-caller-identity
aws bedrock list-foundation-models --region us-east-1 | head -40
```

Expected:
- role ARN for the EC2 instance
- list of available model summaries

## 6) Start API and Web (foreground)

Terminal A:
```bash
cd ~/soothsayer
npx -y pnpm@8.12.0 --filter @soothsayer/api dev
```

Terminal B:
```bash
cd ~/soothsayer
pkill -f "vite --host 0.0.0.0 --port 5173" || true
npx -y pnpm@8.12.0 --filter @soothsayer/web exec vite --host 0.0.0.0 --port 5173
```

## 7) Optional persistent startup with PM2

```bash
cd ~/soothsayer
npm i -g pm2
pm2 start infra/ec2/ecosystem.config.cjs
pm2 save
pm2 startup
pm2 status
```

## 8) Functional smoke test and report

```bash
cd ~/soothsayer
API_BASE_URL=http://localhost:3000 \
ADMIN_SEED_EMAIL=admin@soothsayer.local \
ADMIN_SEED_PASSWORD=password123 \
./scripts/ec2/functional-check.sh
```

Then verify UI:
- `http://<EC2_PUBLIC_IP>:5173/login`
- login with seeded admin
- create conversation
- send message with provider/model selection
- if chat fails, inspect provider-specific error directly (no silent fallback expected)

## 9) Security group requirements

Allow inbound from your current public IP only:
- TCP 22 (SSH)
- TCP 3000 (API)
- TCP 5173 (Web dev)

Keep default SG (`sg-0bdec2f3ab714a92e`) unattached unless intentionally required.

## 10) Common pitfalls

For troubleshooting patterns (Bedrock throttling, Ollama tag mismatch, Redis ETIMEDOUT, persona FK issues), see:

- `docs/HOW_TO_EC2_PITFALLS.md`
