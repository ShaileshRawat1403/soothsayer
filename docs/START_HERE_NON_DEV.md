# Start Here (Non-Dev)

If you are new to Soothsayer, start with this page.

## Choose Your Path

- I want to use the app now: [NON_DEV_QUICKSTART.md](NON_DEV_QUICKSTART.md)
- I want to understand how it works: [NON_DEV_SYSTEM_EXPLAINED.md](NON_DEV_SYSTEM_EXPLAINED.md)
- I want to run workflows: [NON_DEV_WORKFLOWS_EXPLAINED.md](NON_DEV_WORKFLOWS_EXPLAINED.md)
- I want to connect external tools: [NON_DEV_INTEGRATIONS_EXPLAINED.md](NON_DEV_INTEGRATIONS_EXPLAINED.md)
- I am stuck and need fixes: [NON_DEV_TROUBLESHOOTING.md](NON_DEV_TROUBLESHOOTING.md)

## How Soothsayer Handles a Request

```mermaid
flowchart LR
  U[You in Web App] --> C[Chat or Workflow]
  C --> API[Soothsayer API]
  API --> P{Policy Check}
  P -->|Allowed| W[Worker or Immediate Action]
  P -->|Blocked| B[Explain Why Blocked]
  W --> R[Result Saved and Shown]
```

## Workflow Process at a Glance

```mermaid
flowchart LR
  T[Trigger] --> S1[Step 1: Read]
  S1 --> S2[Step 2: Analyze]
  S2 --> S3[Step 3: Execute or Notify]
  S3 --> O[Outcome + Run History]
```

## Architecture in Plain Language

```mermaid
flowchart TB
  UI[Web UI]
  API[API Service]
  WORKER[Background Worker]
  DB[(PostgreSQL)]
  REDIS[(Redis Queue/Cache)]
  MCP[workspace-mcp Optional]

  UI --> API
  API --> DB
  API --> REDIS
  API --> MCP
  REDIS --> WORKER
  WORKER --> DB
```

## Important Release Note

`workspace-mcp` is maintained in this repository and should be used from source here unless official package coordinates are explicitly announced in release notes.
