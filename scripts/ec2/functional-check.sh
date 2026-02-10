#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_SEED_EMAIL:-admin@soothsayer.local}"
ADMIN_PASSWORD="${ADMIN_SEED_PASSWORD:-password123}"

pass() { printf "PASS: %s\n" "$1"; }
fail() { printf "FAIL: %s\n" "$1"; exit 1; }

echo "Running functional check against ${API_BASE_URL}"

health="$(curl -sS "${API_BASE_URL}/api/health" || true)"
echo "${health}" | grep -q '"success":true' && pass "Health endpoint" || fail "Health endpoint"

ready="$(curl -sS "${API_BASE_URL}/api/health/ready" || true)"
echo "${ready}" | grep -q '"ready":true' && pass "Readiness endpoint" || fail "Readiness endpoint"

short_login="$(curl -sS -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"x\"}" || true)"
echo "${short_login}" | grep -q 'password must be longer than or equal to 8 characters' \
  && pass "Login validation for short password" \
  || fail "Login validation for short password"

login="$(curl -sS -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" || true)"

echo "${login}" | grep -q '"accessToken"' && pass "Admin login returns token" || fail "Admin login returns token"

access_token="$(echo "${login}" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
[ -n "${access_token}" ] || fail "Extract access token"

me="$(curl -sS "${API_BASE_URL}/api/users/me" \
  -H "Authorization: Bearer ${access_token}" || true)"
echo "${me}" | grep -q '"email"' && pass "Protected route /api/users/me" || fail "Protected route /api/users/me"

echo "Functional checks completed."
