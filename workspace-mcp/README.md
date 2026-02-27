# workspace-mcp

Deterministic, policy-governed MCP workspace kernel (stdio).

## Why not just use an MCP tool server directly?

Most MCP servers expose tools and stop there.

`workspace-mcp` is built as a deterministic orchestration kernel:

- Explicit run lifecycle: opt-in state tracking via `run_id`
- Owner scoping: safe semantics for future multi-tenant transports
- Deterministic change bundles: stable `bundle_id` derived from canonical diff hashing
- Strict response contract: runtime-enforced meta shape, stable `violation` payload
- Bounded memory model: TTL + max-size stores for runs, bundles, and audit logs

This makes it reusable as a project-swappable kernel rather than a one-off MCP server.

## Architecture (compact)

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
