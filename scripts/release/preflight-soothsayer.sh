#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
LOGIN_EMAIL="${LOGIN_EMAIL:-admin@soothsayer.local}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-password123}"
CHAT_PROVIDER="${CHAT_PROVIDER:-openai}"
CHAT_MODEL="${CHAT_MODEL:-gpt-4o}"
PREFLIGHT_COMMAND_NAME="${PREFLIGHT_COMMAND_NAME:-Preflight Health Check}"

echo "[preflight] API base: ${API_BASE_URL}"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[preflight] missing dependency: $1"
    exit 1
  }
}

require curl
require python3

echo "[preflight] checking /api/health"
curl -fsS "${API_BASE_URL}/api/health" >/dev/null

echo "[preflight] logging in"
LOGIN_JSON="$(curl -fsS -X POST "${API_BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${LOGIN_EMAIL}\",\"password\":\"${LOGIN_PASSWORD}\"}")"
TOKEN="$(printf '%s' "$LOGIN_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')"
AUTH="Authorization: Bearer ${TOKEN}"

echo "[preflight] resolving workspace/persona"
WS_JSON="$(curl -fsS "${API_BASE_URL}/api/workspaces" -H "$AUTH")"
WS_ID="$(printf '%s' "$WS_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"][0]["workspace"]["id"])')"
P_JSON="$(curl -fsS "${API_BASE_URL}/api/personas?workspaceId=${WS_ID}" -H "$AUTH")"
P_ID="$(printf '%s' "$P_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"]["personas"][0]["id"])')"

echo "[preflight] chat create/send"
C_JSON="$(curl -fsS -X POST "${API_BASE_URL}/api/chat/conversations" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"workspaceId\":\"${WS_ID}\",\"personaId\":\"${P_ID}\",\"title\":\"preflight\"}")"
C_ID="$(printf '%s' "$C_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["id"])')"
curl -fsS -X POST "${API_BASE_URL}/api/chat/conversations/${C_ID}/messages" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"preflight chat\",\"provider\":\"${CHAT_PROVIDER}\",\"model\":\"${CHAT_MODEL}\"}" >/dev/null

echo "[preflight] terminal execution"
CMD_JSON="$(curl -fsS "${API_BASE_URL}/api/commands?workspaceId=${WS_ID}" -H "$AUTH")"
CMD_ID="$(printf '%s' "$CMD_JSON" | PREFLIGHT_COMMAND_NAME="$PREFLIGHT_COMMAND_NAME" python3 -c 'import os,sys,json;d=json.load(sys.stdin);name=os.environ.get("PREFLIGHT_COMMAND_NAME","Preflight Health Check");cmd=next((c for c in d["data"]["commands"] if c.get("name")==name),None);print(cmd["id"] if cmd else "")')"
if [ -z "$CMD_ID" ]; then
  echo "[preflight] missing allowlisted command: ${PREFLIGHT_COMMAND_NAME}" >&2
  exit 1
fi
curl -fsS -X POST "${API_BASE_URL}/api/commands/execute-terminal" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"workspaceId\":\"${WS_ID}\",\"command\":\"${CMD_ID}\"}" >/dev/null

echo "[preflight] workflow run"
W_JSON="$(curl -fsS "${API_BASE_URL}/api/workflows" -H "$AUTH")"
W_ID="$(printf '%s' "$W_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"]["workflows"][0]["id"])')"
W_WS="$(printf '%s' "$W_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"]["workflows"][0]["workspaceId"])')"
curl -fsS -X POST "${API_BASE_URL}/api/workflows/${W_ID}/run" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"workspaceId\":\"${W_WS}\"}" >/dev/null

echo "[preflight] MCP health"
curl -fsS "${API_BASE_URL}/api/mcp/health" -H "$AUTH" >/dev/null

echo "[preflight] integrations status"
curl -fsS "${API_BASE_URL}/api/integrations/status?workspaceId=${WS_ID}" -H "$AUTH" >/dev/null

echo "[preflight] SUCCESS"
