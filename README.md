# The Soothsayer

```text
                    The                          .  |  .                          Soothsayer
                                              '   .---.   '
                                           -     / / \ \     -
                                          --    | | (O) | |    --
                                           -     \ \_/ /     -
                                              '   '---'   '
                                                 /  |  \
                                              _.-'"""""'-._
                                             (_____________)

████████╗██╗  ██╗███████╗   ███████╗ ██████╗  ██████╗ ████████╗██╗  ██╗███████╗ █████╗ ██╗   ██╗███████╗██████╗
╚══██╔══╝██║  ██║██╔════╝   ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██║  ██║██╔════╝██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗
   ██║   ███████║█████╗     ███████╗██║   ██║██║   ██║   ██║   ███████║███████╗███████║ ╚████╔╝ █████╗  ██████╔╝
   ██║   ██╔══██║██╔══╝     ╚════██║██║   ██║██║   ██║   ██║   ██╔══██║╚════██║██╔══██║  ╚██╔╝  ██╔══╝  ██╔══██╗
   ██║   ██║  ██║███████╗   ███████║╚██████╔╝╚██████╔╝   ██║   ██║  ██║███████║██║  ██║   ██║   ███████╗██║  ██║
```

> Enterprise AI Workspace Platform for Planning, Execution, Analysis, and Automation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E.svg)](https://nestjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Release Snapshot

- Default branch: `main`
- Latest tested setup: EC2 + PM2 + Azure OpenAI deployment (`gpt-4o` style deployment IDs)
- Non-dev setup guide: `docs/HOW_TO_DUAL_SETUP_NON_DEVS.md`
- Practical platform comparison: `docs/MY_VERDICT_AWS_VS_AZURE.md`
- EC2 production runbook: `docs/EC2_LIVE_DEPLOY.md`
- Release playbook: `docs/RELEASE_GUIDE.md`

## Overview

The Soothsayer is a comprehensive enterprise AI workspace that enables teams to leverage AI for planning, execution, analysis, and automation through multiple interfaces:

- **🤖 Conversational AI Assistant** - Chat with context-aware AI personas
- **💻 Secure Terminal Runner** - Execute commands with policy enforcement
- **🔄 Visual Workflow Builder** - Create automated workflows with drag-and-drop
- **🎭 Persona Engine** - Role-based AI behavior customization
- **📊 Analytics Dashboard** - Track usage, performance, and audit logs
- **🛡️ Governance & Security** - RBAC, approval gates, and audit trails

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │Dashboard │  Chat    │ Terminal │ Workflow │ Analytics│      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST / WebSocket
┌─────────────────────────┴───────────────────────────────────────┐
│                      Backend (NestJS)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Auth │ Users │ Workspaces │ Personas │ Chat │ Commands │   │
│  │ Workflows │ Tools │ Policies │ Analytics │ Files       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬────────────────────────────────────┬─────────────────┘
           │                                    │
┌──────────┴──────────┐            ┌───────────┴──────────┐
│    PostgreSQL       │            │       Redis          │
│   (Primary Data)    │            │  (Cache/Queue)       │
└─────────────────────┘            └──────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │        Worker (BullMQ)        │
                              │ Commands │ Workflows │ AI     │
                              └───────────────────────────────┘
```

## Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **Tailwind CSS** + Radix UI + Custom Design System
- **Zustand** (State) + TanStack Query (Data Fetching)
- **Monaco Editor** + ECharts/Recharts

### Backend
- **NestJS** + TypeScript
- **Prisma ORM** + PostgreSQL
- **BullMQ** + Redis (Queues & Caching)
- **Socket.IO** (Real-time)

### Infrastructure
- **pnpm Workspaces** + Turborepo (Monorepo)
- **Docker** + Docker Compose
- **GitHub Actions** (CI/CD)

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Development Setup

1. **Clone and install dependencies**
```bash
git clone https://github.com/ShaileshRawat1403/soothsayer.git
cd soothsayer
pnpm install
```

2. **Start infrastructure services**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
pnpm db:migrate
pnpm db:seed
```

5. **Start development servers**
```bash
pnpm dev
```

Access the application:
- **Web App**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs

### Available Scripts

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm dev:web          # Start web app only
pnpm dev:api          # Start API only
pnpm dev:worker       # Start worker only

# Build
pnpm build            # Build all packages
pnpm build:web        # Build web app
pnpm build:api        # Build API

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio

# Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript checks
pnpm test             # Run all tests
pnpm format           # Format code with Prettier
```

## Project Structure

```
soothsayer/
├── apps/
│   ├── web/           # React frontend application
│   ├── api/           # NestJS backend API
│   └── worker/        # Background job processor
├── packages/
│   ├── ui/            # Shared UI components & design tokens
│   ├── types/         # Shared TypeScript types & DTOs
│   ├── utils/         # Shared utility functions
│   ├── config/        # Shared ESLint, TSConfig, Prettier
│   ├── ai-core/       # Persona engine & prompt templates
│   ├── workflow-core/ # Workflow DSL & execution engine
│   └── security/      # Policy engine & sanitization
├── infra/
│   ├── docker/        # Dockerfiles
│   └── migrations/    # Database migrations
├── docs/              # Documentation
└── docker-compose.yml # Production compose
```

## Core Features

### MCP Kernel Integration (workspace-mcp)
- Soothsayer API can bridge to a standalone MCP kernel (`workspace-mcp`) via stdio.
- Bridge endpoints:
  - `GET /api/mcp/health` (calls `kernel_version` + `self_check`)
  - `POST /api/mcp/tools/call` (allowlisted MCP tools only)
- Chat can optionally enrich prompts with MCP context (feature-flagged).

Default behavior is safe-off:
- `MCP_ENABLED=false`
- `CHAT_MCP_PREFLIGHT_ENABLED=false`
- `CHAT_MCP_TOOL_CALL_ENABLED=false`

When enabled, recommended allowlist:
- `MCP_ALLOWED_TOOLS=kernel_version,self_check,workspace_info,repo_search,read_file`

### Persona Engine
- 30+ professional personas (Engineering, Business, Security, etc.)
- Runtime persona switching affects AI behavior
- Custom persona creation with JSON import/export
- Auto-recommendation based on context

### Command Runner
- Secure command execution with policy enforcement
- 4-tier operation model (Explain → Plan → Supervised → Advanced)
- Real-time streaming output via WebSocket
- Approval gates for high-risk operations

### Workflow Builder
- Visual node-based editor
- Trigger types: Manual, Scheduled, Webhook
- Templates: Bug Triage, Release Checklist, Incident Response
- Execution history and analytics

### Governance
- Role-based access control (RBAC)
- Immutable audit logs
- Policy simulator for testing rules
- Secret redaction in logs

## API Documentation

API documentation is available via Swagger UI at `/api/docs` when running the API server.

### Key Endpoints

```
POST   /api/auth/login          # User authentication
POST   /api/auth/register       # User registration
GET    /api/workspaces          # List workspaces
POST   /api/chat/conversations  # Create conversation
POST   /api/commands/execute    # Execute command
POST   /api/workflows/:id/run   # Run workflow
GET    /api/personas            # List personas
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/soothsayer

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
WS_REDIS_ENABLED=false
WS_REDIS_FORCE_IN_DEV=false

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# AI
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_KEEP_ALIVE=30m
OLLAMA_NUM_PREDICT=192
OLLAMA_NUM_CTX=1024
AI_REQUEST_TIMEOUT_MS=600000
VITE_API_TIMEOUT_MS=300000
VITE_CHAT_TIMEOUT_MS=600000
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0

# MCP bridge (Soothsayer API -> workspace-mcp)
MCP_ENABLED=false
MCP_SERVER_BIN=workspace-mcp
MCP_SERVER_ARGS=
MCP_ALLOWED_TOOLS=kernel_version,self_check,workspace_info,repo_search,read_file
MCP_WORKDIR=
MCP_WORKSPACE_ROOT=
MCP_PROFILE=dev
MCP_POLICY_PATH=
MCP_TIMEOUT_MS=15000
CHAT_MCP_PREFLIGHT_ENABLED=false
CHAT_MCP_TOOL_CALL_ENABLED=false

# Server
API_PORT=3000
WEB_PORT=5173
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

## EC2 Notes (Important)

For stable EC2 testing, start with:

```bash
./scripts/ec2/bootstrap-dev.sh
./scripts/ec2/functional-check.sh
```

Recommended env defaults for EC2:

```env
WS_REDIS_ENABLED=false
WS_REDIS_FORCE_IN_DEV=false
ADMIN_SEED_EMAIL=admin@soothsayer.local
ADMIN_SEED_PASSWORD=password123
```

### MCP Bridge Smoke Check (Local/EC2)

1. Start Soothsayer API and web.
2. Start `workspace-mcp` process (or configure `MCP_SERVER_BIN` to its installed path).
3. Enable MCP in Soothsayer API env:

```env
MCP_ENABLED=true
CHAT_MCP_PREFLIGHT_ENABLED=true
CHAT_MCP_TOOL_CALL_ENABLED=true
```

4. Verify health and allowlisted tool calls:

```bash
curl -sS http://localhost:3000/api/mcp/health -H "Authorization: Bearer <token>"
curl -sS -X POST http://localhost:3000/api/mcp/tools/call \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"kernel_version","arguments":{}}'
```

Provider behavior:
- API returns explicit inference errors if provider/model fails.
- Bedrock can fail due account setup or quota (`ResourceNotFoundException`, `ThrottlingException`).
- Ollama model IDs must match exact local tags (`llama3.2:1b`, `phi3:mini`, etc.).
- For CPU-bound EC2 inference, keep Ollama warm and cap generation/context (`OLLAMA_KEEP_ALIVE`, `OLLAMA_NUM_PREDICT`, `OLLAMA_NUM_CTX`).
- If chat shows timeout toast but response appears after refresh, increase and align API/web timeouts (`AI_REQUEST_TIMEOUT_MS`, `VITE_API_TIMEOUT_MS`, `VITE_CHAT_TIMEOUT_MS`) and restart PM2 with `--update-env`.

See:
- `docs/EC2_STABILIZATION_RUNBOOK.md`
- `docs/EC2_LIVE_DEPLOY.md` (production-mode EC2 deploy with build + PM2)
- `docs/HOW_TO_EC2_PITFALLS.md`
- `docs/HOW_TO_DUAL_SETUP_NON_DEVS.md` (non-dev dual setup: AWS hosting + Azure OpenAI)
- `docs/MY_VERDICT_AWS_VS_AZURE.md` (practical comparison and final recommendation)

## Dual Setup (Recommended for Demos)

For non-dev teams and faster go-live demos, use:

- AWS for hosting/runtime: EC2 + Soothsayer web/api
- Azure OpenAI for model inference

Why:

- Avoids early Bedrock account-tier throttling blockers
- Keeps existing AWS app deployment intact
- Uses already-deployed Azure model endpoints

Minimal env for this mode:

```env
OPENAI_BASE_URL=https://<your-azure-resource>.cognitiveservices.azure.com/openai/v1
OPENAI_API_KEY=<azure-openai-key-from-same-resource>
```

UI model value must be the Azure deployment name (example: `gpt-4o`).

EC2 live shortcut (single-origin via Nginx on port 80):

```bash
cp infra/ec2/prod.env.100.48.60.255.example .env
PUBLIC_ORIGIN=http://100.48.60.255 SERVER_NAME=100.48.60.255 ./scripts/ec2/bootstrap-live.sh
```

### Resume Quick Checks (EC2)

When returning to an EC2 testbox after restart/new session:

```bash
cd /home/ec2-user/soothsayer
pm2 restart all --update-env || true
pm2 status
curl -sS http://localhost:3000/api/health
curl -I http://localhost:5173
```

If login page spins:

```bash
curl -i -sS -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@soothsayer.local","password":"password123"}'
```

If API works but browser still fails, clear browser storage/cache and hard refresh.

If chat fails with missing persona, create one from UI Personas page (or run `admin:seed`).

## Deployment

### Docker Compose (Production)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Build all packages: `pnpm build`
2. Run migrations: `pnpm db:migrate`
3. Start API: `cd apps/api && node dist/main.js`
4. Start Worker: `cd apps/worker && node dist/main.js`
5. Serve web build from `apps/web/dist`

## Release to GitHub (Tag + Artifacts)

Create a release with build artifacts:

```bash
git checkout main
git pull origin main

pnpm --filter @soothsayer/web build
pnpm --filter @soothsayer/api build

tar -czf soothsayer-web-dist.tar.gz -C apps/web dist
tar -czf soothsayer-api-dist.tar.gz -C apps/api dist

git tag v1.0.0
git push origin v1.0.0
```

Then in GitHub:
1. Open `Releases` -> `Draft a new release`
2. Choose tag `v1.0.0`
3. Attach:
   - `soothsayer-web-dist.tar.gz`
   - `soothsayer-api-dist.tar.gz`
4. Publish release notes with deploy steps from `docs/EC2_LIVE_DEPLOY.md`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `chore:` Maintenance
- `refactor:` Code refactoring

## Security

- Report security vulnerabilities to sprout@pruningmypothos.com
- See [SECURITY.md](SECURITY.md) for our security policy

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by The Soothsayer Team
