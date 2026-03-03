# workspace-mcp

Deterministic, policy-governed MCP orchestration kernel (stdio transport).

## Release Scope

Scope for `v0.1.2` and current reference releases: `workspace-mcp/` package only.
The Soothsayer application is out of scope for this kernel baseline.

## Why This Exists

Most MCP servers are tool-first and stateless.  
`workspace-mcp` is built as a reusable kernel with explicit state, governance, and a frozen response contract.

## Reference Implementation Freeze Policy

Python is the reference implementation for Kernel API v1.  
Feature surface is frozen in `0.1.x`.

- Allowed in Python track: bug fixes, docs/spec clarifications, spec-test additions, packaging hygiene
- Not allowed in Python track: new tools, policy feature expansion, meta/schema shape changes, output behavior drift
- Rust parity track uses the same repo (sibling implementation) and must pass spec-tests before replacement

## What It Provides

- Deterministic policy layering: packaged kernel policy + optional project overlay
- Explicit run lifecycle: opt-in tracking with `run_id`
- Owner-scoped state access for runs and bundles
- Deterministic change bundles via canonical diff hashing
- Bounded in-memory state (runs, bundles, audits) with TTL + max size
- Canonical violation shape for blocked/error flows
- Strict meta contract freeze enforced at runtime and in tests
- `kernel_version` and `self_check` tools for handshake + sanity

## Contract Guarantees

- Top-level `code` is canonical, and `meta.code` is forced to match
- Meta shape is strict and immutable unless intentionally versioned
- Timestamp format is ISO8601 UTC (`...Z`)
- Violations are structured and deterministic for client handling

## Deprecation Policy

Violation payload compatibility in Python `0.1.x`:

- Current compatibility fields may include `data.policy_violation` (blocked paths) and `data.details` (error details).
- Canonical target is `data.violation = {"key": "...", "details": {...}}`.
- Legacy fields will be removed only with a documented contract bump (not in frozen `0.1.x` unless explicitly announced).

## Quickstart

1. Install from source:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

2. Run the server (stdio):

```bash
workspace-mcp --workspace-root /tmp/workspace --profile dev
```

3. Run checks:

```bash
pytest -q
ruff check .
mypy src
```

## Minimal Example

A full lifecycle demo is included in:

- `examples/minimal-project/README.md`
- `examples/minimal-project/demo_flow.json`

Demo flow:

1. `kernel_version`
2. `self_check`
3. `start_run`
4. `repo_search`
5. `create_change_bundle`
6. `bundle_report`
7. `end_run`
8. `get_run_summary`

## Architecture

```text
Client (JSON-RPC)
  |
  v
workspace-mcp (stdio)
  |
  +-- Governor (policy + decisions + audit)
  |     |
  |     +-- Bounded Stores (runs, bundles, audit)
  |
  +-- Tools
        |
        +-- read tools (workspace_info, repo_search, read_file)
        +-- write tools (apply_patch, bundles)
        +-- execute tools (run_task)
        +-- control-plane tools (kernel_version, self_check, lifecycle)
```

## Policy Model

- Kernel default policy ships in `src/workspace_mcp/policies/kernel_policy.yaml`
- Project policies can overlay kernel defaults using `--policy-path`
- Profile selection is explicit: `dev | ci | read_only`

## Roadmap

- Stability track: contract snapshots, invariant checks, release discipline
- Adoption track: examples, operator docs, integration guides
- Expansion track: plugins, additional transports, external audit sinks
