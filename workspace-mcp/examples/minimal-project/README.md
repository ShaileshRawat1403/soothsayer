# Minimal Project Example (workspace-mcp)

This example demonstrates a complete stateful orchestration flow using `workspace-mcp`:

- Explicit run lifecycle (`start_run` -> work -> `end_run`)
- Owner scoping (multi-tenant safe semantics)
- Deterministic change bundles (`create_change_bundle` + `bundle_report`)
- Strict response contract (meta is frozen and validated)

## Prerequisites

- Python 3.11+ recommended
- `pipx` installed

## Install

If you have a built wheel locally, install from it. Otherwise install from source (editable).

### Option A: Install from local wheel

From `workspace-mcp/`:

```bash
pipx install dist/workspace_mcp-0.1.2-py3-none-any.whl --force
```

### Option B: Install from source (editable)

From `workspace-mcp/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Start the MCP server (stdio)

From `workspace-mcp/examples/minimal-project/`:

```bash
workspace-mcp \
  --workspace-root ./workspace \
  --policy-path ./project_policy.yaml \
  --profile dev
```

Expected behavior:

- STDOUT: JSON-RPC (MCP protocol messages)
- STDERR: logs (server initialized, audit logs, etc.)

## The demo workspace

The workspace is intentionally tiny:

- `workspace/app.py` contains a simple function.
- `project_policy.yaml` overlays the packaged kernel policy (demonstrates policy layering).

## Run the lifecycle demo

This repo includes `demo_flow.json` containing example JSON-RPC calls.

This kernel is transport-stdio, so you can drive it with any JSON-RPC client.
For a quick manual check, use the MCP initialize handshake first.

### 1) Initialize handshake (required)

Send an `initialize` request to stdin. You should receive a valid MCP response on stdout.

### 2) Run lifecycle (stateful mode)

The flow is:

1. `kernel_version` (handshake fingerprint)
2. `self_check` (sanity)
3. `start_run` (returns `run_id`)
4. `repo_search` (uses `run_id`)
5. `create_change_bundle` (returns `bundle_id`)
6. `bundle_report`
7. `end_run`
8. `get_run_summary`

#### Notes on placeholders

`demo_flow.json` includes placeholders like:

- `__RUN_ID__`
- `__BUNDLE_ID__`

Copy the IDs returned by the server into subsequent calls.

## What to look for in responses

Every tool response follows a strict contract.

### Meta contract (frozen)

`response.meta` contains keys:

- `audit_id`
- `tool`, `risk`, `decision`, `code`
- `duration_ms`
- `run_id` (nullable)
- `policy_profile`, `policy_hash`
- `server_instance_id`
- `timestamp` (ISO8601 UTC ending with `Z`)

The kernel enforces this at runtime. Any drift raises immediately.

### Violation contract (canonical)

Blocked or error responses include:

- `response.data.violation = {"key": "...", "details": {...}}`

This is stable and suitable for deterministic client handling.

## Why this example matters

Most MCP servers expose tools.
This kernel exposes tools plus:

- explicit run lifecycle (state)
- deterministic change bundling (planning)
- strict, versioned response contract (governance)
- bounded memory model (safety)

That combination is what makes it usable as a reusable orchestration spine.
