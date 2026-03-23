# DAX Failure Scenarios QA Checklist

## Purpose

This checklist validates that DAX correctly classifies and surfaces different failure types through Soothsayer-facing surfaces.

## Test Scenarios

### 1. Normal Failure (execution_error)

**Trigger:** Run fails due to an unexpected error that is not governance-related.

**Steps:**

1. Create a new run that will fail (e.g., malformed intent)
2. Wait for the run to complete with "failed" status
3. Navigate to the run detail page

**Expected:**

- [ ] Status badge shows "failed"
- [ ] Terminal reason badge shows "Execution Error" or equivalent
- [ ] No governance violation banner
- [ ] Summary card shows "Failure" outcome

---

### 2. Permission Denied (permission_denied)

**Trigger:** User rejects a permission request during run execution.

**Steps:**

1. Create a run that requires a permission (e.g., shell command)
2. When prompted, reject the permission
3. Observe the run failure

**Expected:**

- [ ] Status badge shows "failed"
- [ ] Terminal reason shows "Permission Denied" or equivalent
- [ ] Run summary explains permission was denied
- [ ] Overview row shows failed status (no special badge needed)

---

### 3. Timeout (timeout)

**Trigger:** Run exceeds configured timeout threshold.

**Steps:**

1. Configure a run with a short timeout
2. Execute a long-running operation
3. Wait for timeout to trigger

**Expected:**

- [ ] Status badge shows "failed"
- [ ] Terminal reason shows "Timeout" or equivalent
- [ ] Summary indicates timeout as failure cause
- [ ] Error message includes timeout details

---

### 4. Contract Mutation (contract_mutation)

**Trigger:** Workflow attempts to modify the execution contract after initialization.

**Steps:**

1. Create a run with a defined execution contract
2. Attempt an operation that violates contract constraints
3. Observe the governance block

**Expected:**

- [ ] Status badge shows "failed"
- [ ] Header badge shows "Contract Mutated" in red
- [ ] Alert banner appears: "Execution Contract Violation"
- [ ] Summary card shows "Governance Violation" outcome block
- [ ] Overview row shows red governance badge with shield icon
- [ ] `failureCode` = "contract_mutation"
- [ ] `failureLabel` = "Governance Violation" or similar
- [ ] `failureDescription` provides explanation

---

### 5. Recovery After Interruption

**Trigger:** Run is interrupted mid-execution and needs recovery.

**Steps:**

1. Start a run that requires multiple steps
2. Simulate interruption (close browser, kill process, etc.)
3. Return to the run console

**Expected:**

- [ ] Recovery prompt appears if session state is recoverable
- [ ] Recovery badge shows on overview row
- [ ] Run can resume from checkpoint if recoverable
- [ ] "Restored" badge appears after successful recovery
- [ ] "Needs Recovery" badge appears if manual intervention needed

---

## Validation Commands

### DAX Typecheck

```bash
cd /Users/Shared/MYAIAGENTS/dax && bun run typecheck:dax
```

### DAX Tests

```bash
cd /Users/Shared/MYAIAGENTS/dax && bun test
```

### Soothsayer Typecheck

```bash
cd /Users/ananyalayek/soothsayer && npm run typecheck
```

---

## Failure Taxonomy Reference

| failureCode         | Label                | Severity         | Detection Path                                                       |
| ------------------- | -------------------- | ---------------- | -------------------------------------------------------------------- |
| `contract_mutation` | Governance Violation | error (red)      | `error.code === "contract_mutation"` or message contains "immutable" |
| `permission_denied` | Permission Denied    | warning (orange) | `error.code === "permission_denied"`                                 |
| `timeout`           | Timeout              | warning (orange) | `error.code === "timeout"`                                           |
| `execution_error`   | Execution Error      | error (red)      | default fallback when no other code matches                          |

---

## Notes

- Contract mutation is the canonical "governance blocked" scenario
- Message matching ("immutable") is backward compatibility only; `error.code` is preferred
- Recovery state is session-aware (not persisted across page refreshes)
- Governance violations take precedence over recovery badges in UI display
