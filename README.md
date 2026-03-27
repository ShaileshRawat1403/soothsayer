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

> **Governed AI Execution Platform** for Autonomous Action, Enterprise Control, and Decision Visibility.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E.svg)](https://nestjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Platform Philosophy

Soothsayer is not just a chatbot; it is a **DAX (Distributed Autonomous eXecution) Control Plane**. It transforms raw AI capability into controlled operational power by providing a professional workstation for operators to monitor, authorize, and audit autonomous AI actions.

### Core Pillars

1.  **Autonomous Execution (DAX)**: Real-world action via the DAX Engine, capable of complex multi-step tasks.
2.  **Operator Authority**: A high-fidelity professional UI designed for triage and rapid decision-making.
3.  **Governance V2**: Fine-grained control over AI providers, behavioral personas, and risk-based approval gates.
4.  **Audit Integrity**: Immutable signal trails and stage-based replays for every execution path.

## High-Fidelity Workstation UI

The Soothsayer operator workstation features a professional, minimalist aesthetic optimized for clarity and trust:

- **Approval Inbox V3**: A triage system that prioritizes actions by risk grade and execution impact.
- **Replay / Audit V3**: Structured, stage-based execution timelines with resource snippet previews.
- **Contextual Control**: Real-time switching between behavioral personas and inference engines.
- **Precision Navigation**: One-click jumps from global alerts to specific execution signals.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Operator Workstation (React)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Dashboard│ Run Cons │ Inbox V3 │ Replay   │ Settings │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST / WebSocket / SSE
┌─────────────────────────┴───────────────────────────────────────┐
│                      Control Plane (NestJS)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Auth │ Workspaces │ Personas │ Policy │ Analytics │ MCP  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────┬────────────────────────────────────┬─────────────────┘
           │                                    │
┌──────────┴──────────┐            ┌───────────┴──────────┐
│    Execution DB     │            │    DAX Engine (Bun)  │
│   (Prisma/Postgres) │            │   Autonomous Action  │
└─────────────────────┘            └──────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │       Inference Layer         │
                              │ OpenAI │ Gemini │ Anthropic   │
                              └───────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (running locally or via Docker)
- [DAX Engine](https://github.com/ShaileshRawat1403/dax) (External runtime, optional)

### Installation

```bash
# Install dependencies
pnpm install
```

### Launch

```bash
# Easy launch (builds and starts everything)
./launch.sh

# Or manually:
# 1. Build API
pnpm --filter @soothsayer/api build

# 2. Setup Prisma
pnpm --filter @soothsayer/api prisma:generate
pnpm --filter @soothsayer/api prisma:push

# 3. Start API
node apps/api/dist/apps/api/src/main.js &

# 4. Start Web
pnpm --filter @soothsayer/web exec vite --host 0.0.0.0
```

Open http://localhost:5173/

### DAX Integration (Optional)

To enable execution features, start the DAX server and ensure `DAX_BASE_URL=http://127.0.0.1:4096` is set in `apps/api/.env`.

- `/runs/new` - Create execution run
- `/runs/:id` - Run console
- `/dax` - DAX overview

## DAX Integration Surface

Soothsayer is the **operator plane** for DAX — the surface through which human operators observe, govern, and recover AI-assisted runs. The integration goes beyond simple API calls:

| Surface                              | Description                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Governed Run Observation**         | Live run console with real-time state, step timelines, and trust scoring                                                                                                |
| **Recovery / Governance Visibility** | Failed-run recovery summaries with legal transition paths and replay artifacts                                                                                          |
| **Approval Triage**                  | Risk-prioritized inbox for pending governance decisions                                                                                                                 |
| **DAX Run Console**                  | Structured audit trail aligned with Soothsayer's Replay V3 UI                                                                                                           |
| **FastMCP-Backed Execution**         | DAX's external substrate exposes governed tools (run.create/get, approvals, recovery) via FastMCP — Soothsayer uses these internally for programmatic run orchestration |

See [docs/GOVERNED_FAILURE_VISIBILITY.md](docs/GOVERNED_FAILURE_VISIBILITY.md) for recovery workflow details.

## Documentation Hub

- **[docs/README.md](docs/README.md)** - Root documentation index
- **[docs/architecture.md](docs/architecture.md)** - Detailed system design
- **[docs/VALIDATION_REPORT_2026_03_19.md](docs/VALIDATION_REPORT_2026_03_19.md)** - Latest runtime stability report
- **[docs/SOOTHSAYER_ELI12_GUIDE.md](docs/SOOTHSAYER_ELI12_GUIDE.md)** - Beginner-friendly system overview

## License

This project is licensed under the MIT License.

---

Built with ❤️ for AI Operators.
