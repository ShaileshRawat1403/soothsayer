#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Launching Soothsayer..."

# Build and start API
echo "📦 Building API..."
pnpm --filter @soothsayer/api build
pnpm --filter @soothsayer/api prisma:generate
pnpm --filter @soothsayer/api prisma:push

echo "🔧 Starting API on port 3000..."
cd apps/api && node dist/apps/api/src/main.js &
cd "$SCRIPT_DIR"

# Start Web
echo "🌐 Starting Web on port 5173..."
cd apps/web && pnpm exec vite --host 0.0.0.0 &

echo ""
echo "✅ Soothsayer is running!"
echo "   Web:  http://localhost:5173/"
echo "   API:  http://localhost:3000/"
echo ""
echo "Press Ctrl+C to stop"
wait
