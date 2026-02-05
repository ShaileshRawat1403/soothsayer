# The Soothsayer - Architecture Blueprint

## Executive Summary

The Soothsayer is an enterprise-grade AI workspace platform that combines conversational AI, secure command execution, visual workflow automation, and role-based personas into a unified workbench for technical and non-technical professionals.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        React SPA (apps/web)                              ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ││
│  │  │ Chat UI  │ │ Terminal │ │ Workflow │ │ Analytics│ │ Settings │      ││
│  │  │          │ │ Runner   │ │ Builder  │ │Dashboard │ │ /Admin   │      ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      ││
│  │              │                                                           ││
│  │  ┌───────────────────────────────────────────────────────────────────┐  ││
│  │  │  Zustand Store  │  TanStack Query  │  WebSocket Client            │  ││
│  │  └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │           HTTPS/WSS           │
                    └───────────────┬───────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     NestJS API Server (apps/api)                         ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │                      API Gateway / Router                         │   ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   ││
│  │  │  │  Auth   │ │  RBAC   │ │  Rate   │ │ Helmet  │ │ Logging │    │   ││
│  │  │  │ Guard   │ │ Guard   │ │ Limiter │ │ Security│ │Intercept│    │   ││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │                        Domain Modules                             │   ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   ││
│  │  │  │  Auth   │ │Workspace│ │ Persona │ │  Chat   │ │ Command │    │   ││
│  │  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module  │    │   ││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   ││
│  │  │  │Workflow │ │  Tool   │ │ Policy  │ │Analytics│ │  File   │    │   ││
│  │  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module  │    │   ││
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │                      WebSocket Gateway                            │   ││
│  │  │  • Token Streaming  • Command Updates  • Workflow Progress        │   ││
│  │  │  • Approval Events  • Notifications    • Real-time Analytics      │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │  File Storage   │
│   (Primary DB)  │    │ (Cache/Queue)   │    │  (S3/Local)     │
│                 │    │                 │    │                 │
│ • Users         │    │ • Sessions      │    │ • Artifacts     │
│ • Workspaces    │    │ • Rate Limits   │    │ • Documents     │
│ • Personas      │    │ • Job Queues    │    │ • Exports       │
│ • Workflows     │    │ • Pub/Sub       │    │ • Uploads       │
│ • Audit Logs    │    │ • Cache         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKER LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                   BullMQ Workers (apps/worker)                           ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │   AI Job    │ │  Command    │ │  Workflow   │ │  Analytics  │       ││
│  │  │  Processor  │ │  Executor   │ │   Runner    │ │  Aggregator │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ││
│  │  │ Notification│ │   Report    │ │   Cleanup   │ │   Health    │       ││
│  │  │   Sender    │ │  Generator  │ │    Jobs     │ │   Monitor   │       ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  OpenAI /   │ │   Email     │ │   Slack     │ │   Webhook   │           │
│  │  Anthropic  │ │  Provider   │ │    API      │ │  Endpoints  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Monorepo with pnpm Workspaces + Turborepo

**Decision**: Use pnpm workspaces for package management with Turborepo for build orchestration.

**Rationale**:
- Single source of truth for shared code
- Type-safe contracts between packages
- Efficient caching and parallel builds
- Simplified dependency management

**Tradeoffs**:
- Initial setup complexity
- Learning curve for team members
- Build time increases with project size (mitigated by Turborepo caching)

### 2. NestJS for Backend API

**Decision**: Use NestJS as the primary backend framework.

**Rationale**:
- Strong TypeScript support with decorators
- Built-in dependency injection
- Modular architecture aligns with domain-driven design
- First-class WebSocket support
- OpenAPI/Swagger integration
- Excellent testing utilities

**Tradeoffs**:
- More opinionated than Express
- Decorator-heavy code style
- Bundle size larger than minimal Express app

### 3. Zustand + TanStack Query for Frontend State

**Decision**: Use Zustand for client state, TanStack Query for server state.

**Rationale**:
- Clear separation of concerns
- Zustand: minimal boilerplate, excellent DevTools
- TanStack Query: automatic caching, background refetching, optimistic updates
- Both are lightweight and composable

**Tradeoffs**:
- Two state management paradigms to learn
- Some overlap in caching strategies

### 4. PostgreSQL + Prisma ORM

**Decision**: PostgreSQL as primary database with Prisma ORM.

**Rationale**:
- PostgreSQL: robust, scalable, excellent JSON support
- Prisma: type-safe queries, excellent migrations, intuitive schema DSL
- Strong ecosystem and community support

**Tradeoffs**:
- Prisma generates larger client
- Some complex queries require raw SQL
- Migration workflow has learning curve

### 5. Redis + BullMQ for Background Jobs

**Decision**: Redis for caching and BullMQ for job queues.

**Rationale**:
- Redis: fast, versatile (cache, pub/sub, sessions)
- BullMQ: reliable job processing, retries, scheduling, UI dashboard
- Battle-tested in production environments

**Tradeoffs**:
- Additional infrastructure component
- Redis persistence requires configuration

### 6. WebSocket for Real-time Communication

**Decision**: Native WebSocket with NestJS Gateway (Socket.IO compatible).

**Rationale**:
- Essential for streaming AI responses
- Live command execution updates
- Workflow progress tracking
- Approval notifications

**Tradeoffs**:
- Requires connection management
- Scaling requires sticky sessions or Redis adapter

## Security Architecture

### Authentication Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Client  │───▶│  Login   │───▶│  Verify  │───▶│  Issue   │
│          │    │ Request  │    │  Creds   │    │  Tokens  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
     ┌────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                    Token Strategy                         │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │  Access Token   │    │  Refresh Token  │             │
│  │  (15 min TTL)   │    │  (7 day TTL)    │             │
│  │  JWT in memory  │    │  HTTP-only      │             │
│  │                 │    │  Secure cookie  │             │
│  └─────────────────┘    └─────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### Authorization Model (RBAC)

```
Organization
    │
    ├── Owner (full control)
    ├── Admin (manage members, settings)
    └── Member (use workspaces)

Workspace
    │
    ├── Admin (full workspace control)
    ├── Editor (create/edit content)
    ├── Operator (execute commands/workflows)
    └── Viewer (read-only access)

Project
    │
    ├── Owner (project settings)
    ├── Contributor (full CRUD)
    └── Viewer (read-only)
```

### Operation Tier System

| Tier | Name | Capabilities | Approval Required |
|------|------|--------------|-------------------|
| 0 | Explain | Read-only analysis, explanations | No |
| 1 | Plan | Generate plans, patches, suggestions | No |
| 2 | Supervised | Execute with approval gates | Yes (high-risk) |
| 3 | Advanced | Full execution capabilities | Policy-based |

### Security Controls

1. **Input Validation**: Zod schemas on all endpoints
2. **Output Sanitization**: XSS prevention, secret redaction
3. **Prompt Injection Defense**: Input sandboxing, content filtering
4. **Path Traversal Protection**: Strict path boundary enforcement
5. **Rate Limiting**: Tiered limits by endpoint sensitivity
6. **Audit Logging**: Immutable logs for privileged operations

## Persona Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERSONA ENGINE                                      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Persona Definition                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │   Mission   │ │    Tone     │ │   Risk      │ │   Tools     │     │  │
│  │  │  Statement  │ │  & Style    │ │  Tolerance  │ │ Preferences │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │  Verbosity  │ │   Output    │ │  Expertise  │ │ Constraints │     │  │
│  │  │    Level    │ │   Format    │ │    Tags     │ │  & Limits   │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Runtime Behavior Engine                           │  │
│  │                                                                        │  │
│  │  Input ──▶ [Intent Classifier] ──▶ [Persona Matcher] ──▶ Output      │  │
│  │                    │                       │                           │  │
│  │                    ▼                       ▼                           │  │
│  │           ┌──────────────┐        ┌──────────────┐                    │  │
│  │           │ Auto-Persona │        │   Prompt     │                    │  │
│  │           │ Recommender  │        │  Assembler   │                    │  │
│  │           └──────────────┘        └──────────────┘                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Persona Analytics                                │  │
│  │  • Success rate per persona    • Average task completion time         │  │
│  │  • User satisfaction ratings   • Tool usage patterns                  │  │
│  │  • Common task types           • Recommendation accuracy              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW ENGINE                                      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Workflow Definition (DSL)                         │  │
│  │                                                                        │  │
│  │  {                                                                     │  │
│  │    "id": "bug-triage-workflow",                                        │  │
│  │    "name": "Bug Triage",                                               │  │
│  │    "trigger": { "type": "webhook", "event": "issue.created" },         │  │
│  │    "steps": [                                                          │  │
│  │      { "id": "classify", "tool": "ai-classifier", "inputs": {...} },   │  │
│  │      { "id": "assign", "tool": "team-assigner", "depends": ["classify"]│  │
│  │      { "id": "notify", "tool": "slack-notifier", "depends": ["assign"]}│  │
│  │    ],                                                                  │  │
│  │    "errorHandling": { "retries": 3, "compensate": [...] }              │  │
│  │  }                                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Execution Runtime                                 │  │
│  │                                                                        │  │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │  │
│  │  │ Parse & │───▶│  Build  │───▶│ Execute │───▶│ Handle  │            │  │
│  │  │Validate │    │   DAG   │    │  Steps  │    │ Results │            │  │
│  │  └─────────┘    └─────────┘    └─────────┘    └─────────┘            │  │
│  │                                     │                                  │  │
│  │                      ┌──────────────┼──────────────┐                  │  │
│  │                      ▼              ▼              ▼                  │  │
│  │               ┌──────────┐   ┌──────────┐   ┌──────────┐             │  │
│  │               │  Retry   │   │  Timeout │   │Compensate│             │  │
│  │               │  Logic   │   │  Handler │   │  Actions │             │  │
│  │               └──────────┘   └──────────┘   └──────────┘             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tool Registry Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOOL REGISTRY                                       │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Tool Definition                                  │  │
│  │  {                                                                     │  │
│  │    "id": "code-generator",                                             │  │
│  │    "name": "Code Generator",                                           │  │
│  │    "domain": "engineering",                                            │  │
│  │    "riskLevel": "low",                                                 │  │
│  │    "requiredTier": 1,                                                  │  │
│  │    "timeout": 30000,                                                   │  │
│  │    "inputSchema": { ... },                                             │  │
│  │    "outputSchema": { ... },                                            │  │
│  │    "healthCheck": { "endpoint": "/health", "interval": 60000 }         │  │
│  │  }                                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Tool Execution Pipeline                             │  │
│  │                                                                        │  │
│  │  Request ──▶ [Auth] ──▶ [Policy] ──▶ [Rate Limit] ──▶ [Execute]       │  │
│  │                            │                              │            │  │
│  │                            ▼                              ▼            │  │
│  │                    ┌──────────────┐              ┌──────────────┐      │  │
│  │                    │  Approval    │              │   Metrics    │      │  │
│  │                    │    Gate      │              │   Logging    │      │  │
│  │                    └──────────────┘              └──────────────┘      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Patterns

### AI Chat with Streaming

```
Client                    API                     Worker                  AI Service
   │                       │                        │                         │
   │──POST /chat/send─────▶│                        │                         │
   │                       │──Queue AI Job─────────▶│                         │
   │◀──WS: job.started─────│                        │                         │
   │                       │                        │──API Call──────────────▶│
   │                       │                        │◀──Stream Tokens─────────│
   │◀──WS: token.chunk─────│◀───────────────────────│                         │
   │◀──WS: token.chunk─────│◀───────────────────────│                         │
   │◀──WS: token.chunk─────│◀───────────────────────│                         │
   │                       │                        │◀──Complete──────────────│
   │◀──WS: job.complete────│◀───────────────────────│                         │
   │                       │                        │                         │
```

### Command Execution with Approval

```
Client                    API                     Worker                  Approval
   │                       │                        │                         │
   │──POST /command/run───▶│                        │                         │
   │                       │──Check Policy─────────▶│                         │
   │                       │◀──Requires Approval────│                         │
   │◀──WS: approval.req────│                        │                         │
   │                       │                        │                         │
   │ [User approves in UI] │                        │                         │
   │                       │                        │                         │
   │──POST /approval/───── │                        │                         │
   │    approve            │                        │                         │
   │                       │──Resume Execution─────▶│                         │
   │◀──WS: exec.started────│◀───────────────────────│                         │
   │◀──WS: exec.output─────│◀───────────────────────│                         │
   │◀──WS: exec.complete───│◀───────────────────────│                         │
   │                       │                        │                         │
```

## Performance Considerations

1. **Database Indexing**: Strategic indexes on frequently queried columns
2. **Query Optimization**: Prisma query batching, relation loading strategies
3. **Caching**: Redis caching for personas, tools, policies
4. **Connection Pooling**: PgBouncer for database connections
5. **Lazy Loading**: Code splitting in frontend, lazy module loading
6. **CDN**: Static assets served via CDN
7. **Compression**: Gzip/Brotli for API responses

## Scalability Path

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  API #1  │      │  API #2  │      │  API #3  │
    └──────────┘      └──────────┘      └──────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Redis Cluster  │
                    │  (Session/Pub)  │
                    └────────┬────────┘
                             │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    ▼                         ▼                         ▼
┌──────────┐           ┌──────────┐           ┌──────────┐
│ Worker#1 │           │ Worker#2 │           │ Worker#3 │
└──────────┘           └──────────┘           └──────────┘
```

## Observability

- **Structured Logging**: Pino with correlation IDs
- **Metrics**: Custom metrics hooks for Prometheus/Datadog
- **Error Tracking**: Sentry abstraction layer
- **Distributed Tracing**: OpenTelemetry integration points
- **Health Checks**: Kubernetes-ready probes

## Disaster Recovery

- **Database Backups**: Automated daily backups with point-in-time recovery
- **Redis Persistence**: AOF + RDB for cache durability
- **File Replication**: Multi-region S3 bucket replication
- **Failover**: Database read replicas, Redis Sentinel

---

## Technology Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript + Vite | SPA Framework |
| Styling | Tailwind CSS + CSS Variables | Design System |
| State | Zustand + TanStack Query | Client/Server State |
| Backend | NestJS + TypeScript | API Server |
| Database | PostgreSQL + Prisma | Data Persistence |
| Cache/Queue | Redis + BullMQ | Caching & Jobs |
| Auth | JWT + Refresh Tokens | Authentication |
| Realtime | WebSocket (NestJS Gateway) | Live Updates |
| Monorepo | pnpm + Turborepo | Build System |
| Testing | Vitest + Jest + Playwright | Test Suites |
| DevOps | Docker + GitHub Actions | CI/CD |

---

*Document Version: 1.0.0*
*Last Updated: 2024*
