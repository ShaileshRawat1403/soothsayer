# Governed Failure Visibility - Phase 3B Release Notes

## Summary

DAX now exposes structured failure reasons through Soothsayer-facing surfaces, enabling operators to understand why a run was blocked rather than treating failures as generic crashes.

## What Changed

### DAX (`dax-tui`)

**Terminal Reason Classification**

- Added `contract_mutation` as a first-class `WorkflowTerminalReason` enum value
- `extractTerminalReason()` now detects:
  - `contract_mutation` via `error.code === "contract_mutation"` (canonical path)
  - `contract_mutation` via `error.message.includes("immutable")` (backward compatibility)
  - `permission_denied` via `error.code === "permission_denied"`
  - `timeout` via `error.code === "timeout"`
  - `execution_error` as the default fallback

**Event Propagation**

- Fixed error code propagation from failed steps to `run.failed` events
- Run snapshot now includes `terminalReason`, `failureCode`, `failureLabel`, `failureDescription`

**Regression Tests**

- Added unit tests for `contract_mutation` terminal reason extraction
- Tests cover both explicit error.code and immutable message fallback

### Soothsayer

**Type Contracts**

- Added `failureCode`, `failureLabel`, `failureDescription` to `DaxRunListItem`
- These fields flow through API adapters from DAX to Soothsayer

**Run Detail Surfacing**

- `RunHeader`: Shows red "Contract Mutated" badge + violation alert banner
- `RunSummaryCard`: Shows "Governance Violation" outcome block

**Overview Surfacing**

- `DaxOverviewPage`: Shows governance violation badge on failed runs
- Added "Governance" filter to quickly find contract-mutation failures

## Architecture

```
DAX Engine
    │
    ├─> Step fails with error.code = "contract_mutation"
    │
    ├─> Run transitions to "failed" state
    │
    ├─> run.failed event emitted with error payload
    │
    └─> extractTerminalReason() classifies based on error.code
            │
            └─> terminalReason = "contract_mutation"
                    │
                    └─> failureCode = "contract_mutation"
                            │
                            └─> failureLabel = "Governance Violation"
```

## Failure Taxonomy

| Code                | Label                | Severity | Detection                              |
| ------------------- | -------------------- | -------- | -------------------------------------- |
| `contract_mutation` | Governance Violation | error    | `error.code` or "immutable" in message |
| `permission_denied` | Permission Denied    | warning  | `error.code === "permission_denied"`   |
| `timeout`           | Timeout              | warning  | `error.code === "timeout"`             |
| `execution_error`   | Execution Error      | error    | default fallback                       |

## API Contracts

### Run Snapshot (DAX → Soothsayer)

```typescript
interface DaxRunSnapshot {
  // ... existing fields
  terminalReason?: WorkflowTerminalReason;
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
}
```

### Run List Item (DAX → Soothsayer)

```typescript
interface DaxRunListItem {
  // ... existing fields
  terminalReason?: string;
  terminalReasonLabel?: string;
  failureCode?: string;
  failureLabel?: string;
  failureDescription?: string;
}
```

## Testing

See [DAX_FAILURE_SCENARIOS_QA.md](./DAX_FAILURE_SCENARIOS_QA.md) for validation checklist.

## Future Work

- Add `policy_blocked` for policy violations
- Add `tool_allowlist_violation` for tool restrictions
- Add `trust_blocked` for trust posture failures
- Add automated UI tests for governance surfacing
