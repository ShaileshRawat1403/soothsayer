#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/soothsayer}"
cd "$ROOT_DIR"

echo "[1/8] Verifying disk and filesystem"
lsblk || true
df -h /
if command -v xfs_growfs >/dev/null 2>&1; then
  sudo xfs_growfs -d / || true
fi
df -h /

echo "[2/8] Normalizing environment files"
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

echo "[3/8] Cleaning broken caches and previous installs"
rm -rf ~/.npm/_cacache/tmp/* ~/.pnpm-store/v3/tmp/* 2>/dev/null || true
rm -rf node_modules apps/api/node_modules apps/web/node_modules

echo "[4/8] Installing dependencies"
npx -y pnpm@8.12.0 install -r --config.include-optional=true

echo "[5/8] Verifying rollup native package"
node -e "require('@rollup/rollup-linux-x64-gnu'); console.log('rollup native OK')"

echo "[6/8] Running Prisma generate/push and admin seed"
npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:generate
npx -y pnpm@8.12.0 --filter @soothsayer/api prisma:push
npx -y pnpm@8.12.0 --filter @soothsayer/api admin:seed

echo "[7/8] Verifying Bedrock IAM identity"
aws sts get-caller-identity || true

echo "[8/8] Done. Start services in two terminals:"
echo "  API: npx -y pnpm@8.12.0 --filter @soothsayer/api dev"
echo "  WEB: npx -y pnpm@8.12.0 --filter @soothsayer/web exec vite --host 0.0.0.0 --port 5173"
echo "Then run: ./scripts/ec2/functional-check.sh"
