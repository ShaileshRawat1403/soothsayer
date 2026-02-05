# The Soothsayer - File Tree Structure

```
the-soothsayer/
├── apps/
│   ├── web/                          # React Frontend Application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Base UI primitives (Button, Input, Modal, etc.)
│   │   │   │   ├── layout/           # Layout components (Shell, Sidebar, Header)
│   │   │   │   ├── chat/             # AI Chat components
│   │   │   │   ├── terminal/         # Command runner components
│   │   │   │   ├── workflow/         # Workflow builder components
│   │   │   │   ├── personas/         # Persona selector & builder
│   │   │   │   ├── analytics/        # Dashboard & charts
│   │   │   │   ├── settings/         # Settings panels
│   │   │   │   └── common/           # Shared components
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── lib/                  # Utilities, API client, WebSocket
│   │   │   ├── pages/                # Route pages
│   │   │   ├── styles/               # Global styles, themes
│   │   │   ├── types/                # Frontend-specific types
│   │   │   └── tests/
│   │   │       ├── unit/             # Vitest unit tests
│   │   │       └── e2e/              # Playwright E2E tests
│   │   ├── public/                   # Static assets
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                          # NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # Authentication (JWT, sessions)
│   │   │   │   ├── users/            # User management
│   │   │   │   ├── workspaces/       # Workspace CRUD
│   │   │   │   ├── projects/         # Project management
│   │   │   │   ├── personas/         # Persona engine
│   │   │   │   ├── chat/             # AI chat & conversations
│   │   │   │   ├── commands/         # Command execution
│   │   │   │   ├── workflows/        # Workflow management
│   │   │   │   ├── tools/            # Tool registry
│   │   │   │   ├── policies/         # Policy & governance
│   │   │   │   ├── analytics/        # Analytics & audit
│   │   │   │   ├── files/            # File management
│   │   │   │   └── notifications/    # Notification system
│   │   │   ├── common/
│   │   │   │   ├── decorators/       # Custom decorators
│   │   │   │   ├── filters/          # Exception filters
│   │   │   │   ├── guards/           # Auth & RBAC guards
│   │   │   │   ├── interceptors/     # Logging, transform interceptors
│   │   │   │   └── pipes/            # Validation pipes
│   │   │   ├── config/               # App configuration
│   │   │   ├── prisma/               # Prisma client & migrations
│   │   │   ├── websocket/            # WebSocket gateway
│   │   │   ├── health/               # Health check endpoints
│   │   │   ├── main.ts               # Application entry
│   │   │   ├── app.module.ts         # Root module
│   │   │   └── tests/
│   │   │       ├── unit/             # Jest unit tests
│   │   │       └── integration/      # API integration tests
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   ├── migrations/           # Migration files
│   │   │   └── seed.ts               # Seed data
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                       # Background Job Worker
│       ├── src/
│       │   ├── processors/           # BullMQ job processors
│       │   │   ├── ai.processor.ts
│       │   │   ├── command.processor.ts
│       │   │   ├── workflow.processor.ts
│       │   │   ├── analytics.processor.ts
│       │   │   ├── notification.processor.ts
│       │   │   └── cleanup.processor.ts
│       │   ├── jobs/                 # Job definitions
│       │   ├── queues/               # Queue configurations
│       │   ├── main.ts               # Worker entry
│       │   └── tests/                # Worker tests
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── ui/                           # Shared UI Component Library
│   │   ├── src/
│   │   │   ├── components/           # Reusable components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── DropdownMenu.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── index.ts
│   │   │   ├── tokens/               # Design tokens
│   │   │   │   ├── colors.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   ├── typography.ts
│   │   │   │   └── themes.ts
│   │   │   ├── hooks/                # UI hooks
│   │   │   └── utils/                # UI utilities
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── config/                       # Shared Configurations
│   │   ├── eslint/
│   │   │   ├── base.js
│   │   │   ├── react.js
│   │   │   └── node.js
│   │   ├── tsconfig/
│   │   │   ├── base.json
│   │   │   ├── react.json
│   │   │   └── node.json
│   │   ├── prettier/
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── types/                        # Shared Type Definitions
│   │   ├── src/
│   │   │   ├── api/                  # API request/response types
│   │   │   │   ├── auth.ts
│   │   │   │   ├── workspaces.ts
│   │   │   │   ├── personas.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── commands.ts
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── tools.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── domain/               # Domain entity types
│   │   │   │   ├── user.ts
│   │   │   │   ├── workspace.ts
│   │   │   │   ├── persona.ts
│   │   │   │   ├── conversation.ts
│   │   │   │   ├── workflow.ts
│   │   │   │   ├── tool.ts
│   │   │   │   └── policy.ts
│   │   │   ├── events/               # WebSocket event types
│   │   │   │   ├── chat.events.ts
│   │   │   │   ├── command.events.ts
│   │   │   │   ├── workflow.events.ts
│   │   │   │   └── approval.events.ts
│   │   │   ├── dto/                  # Data transfer objects
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── utils/                        # Shared Utilities
│   │   ├── src/
│   │   │   ├── validation.ts         # Zod schemas
│   │   │   ├── formatting.ts         # String/date formatting
│   │   │   ├── crypto.ts             # Hashing utilities
│   │   │   ├── errors.ts             # Error classes
│   │   │   ├── logger.ts             # Logging utilities
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ai-core/                      # AI Engine Core
│   │   ├── src/
│   │   │   ├── prompts/              # Prompt templates
│   │   │   │   ├── system.ts
│   │   │   │   ├── persona.ts
│   │   │   │   └── tool-calling.ts
│   │   │   ├── personas/             # Persona definitions
│   │   │   │   ├── developer.ts
│   │   │   │   ├── business.ts
│   │   │   │   ├── specialist.ts
│   │   │   │   └── auto-persona.ts
│   │   │   ├── models/               # Model interfaces
│   │   │   │   └── types.ts
│   │   │   ├── adapters/             # AI provider adapters
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   └── base.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── workflow-core/                # Workflow Engine Core
│   │   ├── src/
│   │   │   ├── dsl/                  # Workflow DSL
│   │   │   │   ├── schema.ts
│   │   │   │   ├── parser.ts
│   │   │   │   └── builder.ts
│   │   │   ├── validators/           # Workflow validators
│   │   │   │   └── workflow.validator.ts
│   │   │   ├── execution/            # Execution runtime
│   │   │   │   ├── engine.ts
│   │   │   │   ├── step-runner.ts
│   │   │   │   └── error-handler.ts
│   │   │   ├── templates/            # Built-in templates
│   │   │   │   ├── bug-triage.ts
│   │   │   │   ├── incident-summary.ts
│   │   │   │   ├── release-checklist.ts
│   │   │   │   ├── data-report.ts
│   │   │   │   └── content-review.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── security/                     # Security & Policy Engine
│       ├── src/
│       │   ├── policies/             # Policy engine
│       │   │   ├── engine.ts
│       │   │   ├── tiers.ts
│       │   │   └── rules.ts
│       │   ├── sanitization/         # Input/output sanitization
│       │   │   ├── input.ts
│       │   │   ├── output.ts
│       │   │   └── secrets.ts
│       │   ├── guardrails/           # Safety guardrails
│       │   │   ├── prompt-injection.ts
│       │   │   ├── path-traversal.ts
│       │   │   └── command-filter.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── infra/                            # Infrastructure
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.worker
│   │   └── nginx.conf
│   ├── migrations/                   # Database migrations
│   ├── scripts/
│   │   ├── setup.sh
│   │   ├── seed.sh
│   │   └── backup.sh
│   └── docker-compose.yml
│
├── docs/                             # Documentation
│   ├── architecture.md
│   ├── api.md
│   ├── security.md
│   ├── personas.md
│   └── runbooks.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, test, build
│       ├── deploy.yml                # Deployment
│       └── security.yml              # Security scanning
│
├── .husky/                           # Git hooks
│   ├── pre-commit
│   └── commit-msg
│
├── package.json                      # Root package.json
├── pnpm-workspace.yaml               # pnpm workspace config
├── turbo.json                        # Turborepo config
├── .gitignore
├── .env.example
├── .prettierrc
├── .eslintrc.js
├── README.md
└── FILE_TREE.md                      # This file
```

## Package Dependencies Graph

```
                    ┌─────────────────────────┐
                    │      packages/types     │
                    │   (Shared Type Defs)    │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ packages/utils  │   │ packages/config │   │   packages/ui   │
│   (Utilities)   │   │ (Lint/TS/etc)   │   │  (Components)   │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         │     ┌───────────────┴───────────────┐     │
         │     │                               │     │
         ▼     ▼                               ▼     ▼
┌─────────────────────┐             ┌─────────────────────┐
│  packages/ai-core   │             │packages/workflow-core│
│   (AI Engine)       │             │  (Workflow Engine)   │
└─────────┬───────────┘             └──────────┬──────────┘
          │                                    │
          │          ┌─────────────────────────┤
          │          │                         │
          ▼          ▼                         ▼
┌─────────────────────────┐         ┌─────────────────────┐
│   packages/security     │         │      apps/web       │
│  (Policy & Guardrails)  │         │   (React Frontend)  │
└───────────┬─────────────┘         └─────────────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────────┐ ┌─────────────┐
│  apps/api   │ │ apps/worker │
│  (NestJS)   │ │  (BullMQ)   │
└─────────────┘ └─────────────┘
```

## Module Responsibilities

### apps/web
- User interface rendering
- Client-side state management
- WebSocket connection management
- Theme and accessibility handling

### apps/api
- REST API endpoints
- WebSocket gateway
- Authentication/Authorization
- Database operations
- Job queue publishing

### apps/worker
- Background job processing
- AI inference orchestration
- Workflow execution
- Notification dispatch
- Analytics aggregation

### packages/types
- Shared TypeScript interfaces
- API contracts
- Domain models
- Event definitions

### packages/utils
- Validation schemas (Zod)
- Formatting utilities
- Cryptographic helpers
- Error definitions

### packages/ui
- Design system components
- Theme tokens
- Accessibility primitives

### packages/ai-core
- Persona definitions
- Prompt engineering
- Model adapters
- Intent classification

### packages/workflow-core
- Workflow DSL
- DAG execution
- Template library
- Error recovery

### packages/security
- Policy evaluation
- Input sanitization
- Prompt injection defense
- Audit logging helpers
