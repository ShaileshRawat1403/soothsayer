# Running All Three Projects

Quick reference for running DAX, Soothsayer, and Picobot locally.

---

## Quick Start (All 3 Projects)

```bash
# Start all three projects at once
./run-all.sh
```

Or manually:

```bash
# Terminal 1: DAX (port 4096)
dax serve

# Terminal 2: Picobot (port 8080)
picobot serve

# Terminal 3: Soothsayer (ports 3000 + 5173)
cd soothsayer
./launch.sh
```

---

## Individual Commands

### 1. DAX (Data Agent Executor)

```bash
# Start DAX server
dax serve

# Check health
curl http://localhost:4096/health

# Default port: 4096
```

### 2. Picobot

```bash
# Start Picobot server
picobot serve

# Check health
curl http://localhost:8080/health

# Default port: 8080
```

### 3. Soothsayer (API + Web)

```bash
cd soothsayer

# Option A: Use the launcher script
./launch.sh

# Option B: Manual start
pnpm --filter @soothsayer/api build
pnpm --filter @soothsayer/api prisma:generate
pnpm --filter @soothsayer/api prisma:push
node apps/api/dist/apps/api/src/main.js &

pnpm --filter @soothsayer/web exec vite --host 0.0.0.0

# API: http://localhost:3000
# Web: http://localhost:5173
```

---

## Port Summary

| Project        | Port | URL                   |
| -------------- | ---- | --------------------- |
| DAX            | 4096 | http://localhost:4096 |
| Picobot        | 8080 | http://localhost:8080 |
| Soothsayer API | 3000 | http://localhost:3000 |
| Soothsayer Web | 5173 | http://localhost:5173 |

---

## Environment Variables (Soothsayer)

Create `.env` in soothsayer root:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/soothsayer
JWT_SECRET=your-secret-key

# For local development
WS_REDIS_ENABLED=false
WS_REDIS_FORCE_IN_DEV=false
ADMIN_SEED_EMAIL=admin@soothsayer.local
ADMIN_SEED_PASSWORD=password123
OLLAMA_BASE_URL=http://127.0.0.1:11434
AI_REQUEST_TIMEOUT_MS=600000
VITE_API_TIMEOUT_MS=300000
VITE_CHAT_TIMEOUT_MS=600000
```

---

## Troubleshooting

### Check if services are running

```bash
lsof -i :4096  # DAX
lsof -i :8080   # Picobot
lsof -i :3000   # Soothsayer API
lsof -i :5173   # Soothsayer Web
```

### Restart all

```bash
pkill -f "dax serve" || true
pkill -f "picobot serve" || true
pkill -f "node dist/apps/api" || true
pkill -f "vite" || true
```
