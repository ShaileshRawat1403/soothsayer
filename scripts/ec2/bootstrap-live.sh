#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/soothsayer}"
cd "$ROOT_DIR"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-http://100.48.60.255}"
ENABLE_NGINX="${ENABLE_NGINX:-true}"
SERVER_NAME="${SERVER_NAME:-100.48.60.255}"

upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

echo "[1/8] Verifying required environment variables"
for key in DATABASE_URL JWT_SECRET; do
  if ! grep -q "^${key}=" .env; then
    echo "Missing ${key} in .env"
    exit 1
  fi
done

jwt_secret_value="$(grep '^JWT_SECRET=' .env | tail -n1 | cut -d'=' -f2- || true)"
if [ "${#jwt_secret_value}" -lt 32 ]; then
  echo "JWT_SECRET must be at least 32 characters"
  exit 1
fi

echo "[2/8] Setting safe EC2 defaults"
upsert_env NODE_ENV production
upsert_env WS_REDIS_ENABLED false
upsert_env WS_REDIS_FORCE_IN_DEV false
upsert_env API_PORT 3000
upsert_env APP_URL "${PUBLIC_ORIGIN}"
upsert_env CORS_ORIGINS "${PUBLIC_ORIGIN}"
cp -f .env apps/api/.env
rm -f .env.bak

echo "[3/8] Installing dependencies"
pnpm install -r --frozen-lockfile

echo "[4/8] Generating Prisma client and applying schema"
pnpm --filter @soothsayer/api prisma:generate
pnpm --filter @soothsayer/api prisma:push

echo "[5/8] Seeding admin user"
pnpm --filter @soothsayer/api admin:seed

echo "[6/8] Building API and Web"
pnpm --filter @soothsayer/api build
pnpm --filter @soothsayer/web build

echo "[7/9] Starting PM2 production services"
pm2 delete soothsayer-api soothsayer-web >/dev/null 2>&1 || true
pm2 start infra/ec2/ecosystem.prod.config.cjs --update-env
pm2 save

echo "[8/9] Configuring nginx reverse proxy (optional)"
if [ "${ENABLE_NGINX}" = "true" ]; then
  SERVER_NAME="${SERVER_NAME}" ROOT_DIR="${ROOT_DIR}" ./scripts/ec2/setup-nginx.sh
else
  echo "Skipping nginx setup (ENABLE_NGINX=${ENABLE_NGINX})"
fi

echo "[9/9] Running functional check"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}" ./scripts/ec2/functional-check.sh

echo "Live bootstrap completed."
echo "App: ${PUBLIC_ORIGIN}/login"
echo "API health: ${PUBLIC_ORIGIN}/api/health"
