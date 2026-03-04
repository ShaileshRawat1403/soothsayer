# Post-Release 14-Day Plan

> Maintainers/Internal: this is an operational follow-up plan, not an end-user guide.

Owner: Soothsayer core team  
Scope: Soothsayer app post-release hardening + workspace-mcp parity confidence  
Window: 14 days after release tag `v1.0.1`

## Usage

- Check items daily.
- Keep scope frozen to stability/reliability unless an approved hotfix is needed.
- Record blockers and decisions in the notes section at the end.

## Day 1 - Baseline and Freeze

- [ ] Capture baseline health and release confidence.
- [ ] Confirm critical flows pass end-to-end.
- [ ] Freeze non-hotfix feature merges for 72 hours.

Commands:

```bash
curl -sS http://localhost:3000/api/health
./scripts/release/preflight-soothsayer.sh
```

Exit criteria:

- Health endpoint responds OK.
- Preflight script reports SUCCESS.

## Day 2 - Alerting Setup

- [ ] Add/verify log filters for chat/workflow/mcp/integration failures.
- [ ] Configure alert thresholds (error rate, latency, timeout spikes).

Exit criteria:

- Alert rules documented and enabled.

## Day 3 - Redis Reliability Drill

- [ ] Validate Redis behavior for current deployment mode.
- [ ] Simulate temporary Redis outage and verify recovery behavior/logging.

Exit criteria:

- Outage simulation shows predictable fallback/recovery.

## Day 4 - Workflow UX Review

- [ ] Review current step builder UX with real usage scenarios.
- [ ] Prioritize missing UX improvements (validation hints, defaults, affordances).

Exit criteria:

- Ranked workflow UX backlog (P0/P1/P2) documented.

## Day 5 - Chat Persistence Regression

- [ ] Re-test historical "chat disappears on submit" scenarios.
- [ ] Add/verify automated regression for submit + refresh timing edge case.

Exit criteria:

- Regression scenario reproducible in tests and green.

## Day 6 - Workflow E2E Reliability

- [ ] E2E test: create workflow -> edit steps -> save -> run -> verify status.
- [ ] Verify counts/status stay consistent after refresh.

Exit criteria:

- Workflow E2E path is stable and green.

## Day 7 - Integrations E2E

- [ ] Verify OAuth connect/callback/disconnect for GitHub + Slack.
- [ ] Verify manual token mode UX and API behavior.
- [ ] Verify clear user-facing errors when provider env vars are missing.

Exit criteria:

- Connect + failure-path behavior is documented and tested.

## Day 8 - Observability Polish

- [ ] Add/verify p95 latency and error-rate dashboards by module.
- [ ] Add MCP tool duration breakdown and failure ratio chart.

Exit criteria:

- Dashboard links and ownership added to docs.

## Day 9 - Incident and Rollback Playbook

- [ ] Draft incident severity levels and escalation.
- [ ] Document rollback steps for Soothsayer and workspace-mcp independently.

Exit criteria:

- Playbook doc merged and linked from release docs.

## Day 10 - Security Hygiene Pass

- [ ] Run secret scan sanity pass locally and confirm CI behavior.
- [ ] Verify env examples remain safe and non-secret.

Exit criteria:

- Secret-scan gate remains green without suppressing real leaks.

## Day 11 - workspace-mcp Parity Recheck

- [ ] Verify spec/hash/test parity remains unchanged from `v0.1.2`.
- [ ] Confirm no contract drift in kernel artifacts.

Commands:

```bash
cd workspace-mcp
python3 spec-tests/generate_bundle_hashes.py --check
pytest -q
```

Exit criteria:

- Hash/spec tests and full kernel tests pass.

## Day 12 - Release Process Drill

- [ ] Run release checklist as dry-run from clean clone/environment.
- [ ] Confirm docs are enough for another user to execute release.

Exit criteria:

- Dry-run completed with no undocumented steps.

## Day 13 - Cleanup and Debt

- [ ] Prune stale TODOs and dead docs/scripts.
- [ ] Confirm branch hygiene and pending PR cleanliness.

Exit criteria:

- Candidate release branch is clean and auditable.

## Day 14 - Go/No-Go Review

- [ ] Hold formal review with objective pass/fail for reliability gates.
- [ ] Decide: patch release now vs hold with action list.
- [ ] Publish next milestone plan (Soothsayer + Rust parity track).

Exit criteria:

- Signed go/no-go decision documented.

---

## Recurring Checks (every 2-3 days)

```bash
npx -y pnpm@8.12.0 --filter @soothsayer/api typecheck
npx -y pnpm@8.12.0 --filter @soothsayer/web exec tsc --noEmit
./scripts/release/preflight-soothsayer.sh
cd workspace-mcp && python3 spec-tests/generate_bundle_hashes.py --check && pytest -q
```

## Roles (Suggested)

- Product/Owner: UX priorities, release sign-off, scope control.
- Engineering: reliability fixes, tests, observability.
- Shared: go/no-go decisions and rollback readiness.

## Daily Notes

- Day 1:
- Day 2:
- Day 3:
- Day 4:
- Day 5:
- Day 6:
- Day 7:
- Day 8:
- Day 9:
- Day 10:
- Day 11:
- Day 12:
- Day 13:
- Day 14:
