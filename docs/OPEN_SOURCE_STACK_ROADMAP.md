# Open Source Stack Roadmap

## Context

DAX is the **execution authority / workstation**. The open-source stack should reinforce DAX's role as a governed execution substrate without turning it into a bloated platform.

## Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAX CORE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Soothsayer │  │Workspace MCP│  │       Picobot            │  │
│  │  (Governance│  │  (Policy &  │  │     (Ingress)           │  │
│  │  & Observe) │  │  Capability │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Phase A (Immediate): ─────────────────────────────────────────────
  Workspace MCP → Soothsayer UI → Picobot improvements

Phase B (Next Wave): ─────────────────────────────────────────────
  FastMCP → GitHub Actions → Event taxonomy cleanup

Phase C (Transport): ─────────────────────────────────────────────
  NATS/JetStream

Phase D (Production): ────────────────────────────────────────────
  ZITADEL → Infisical → OTel/Prometheus/Grafana/Loki
```

## Implementation Phases

### Phase A: Finish the Core Loop

**Priority: HIGH**

| Item                       | Description                                   | Repository               |
| -------------------------- | --------------------------------------------- | ------------------------ | --- |
| Soothsayer UI completion   | Finalize run detail, summary, overview polish | soothsayer               | ✅  |
| `repo_analyze` via Picobot | Deterministic repo analysis through ingress   | soothsayer/workspace-mcp | 🔄  |
| MCP capability cleanup     | Standardize tool pack interface               | workspace-mcp            | ⏳  |

**Exit criteria:**

- [x] All governance failure scenarios visible in UI
- [x] Recovery flows work end-to-end
- [x] Approval UX is complete
- [x] Governance badge takes priority over recovery badges

---

### Phase B: Externalize DAX as Real Substrate

**Priority: MEDIUM**

| Item                       | Description                                          | Repository    |
| -------------------------- | ---------------------------------------------------- | ------------- |
| FastMCP                    | Clean API/capability boundary for external consumers | workspace-mcp |
| GitHub Actions integration | DAX as CI gate/patch approval layer                  | dax           |
| Event taxonomy cleanup     | Standardize all event types                          | dax           |
| Operator-grade overview    | Dashboard polish, metrics                            | soothsayer    |

**Exit criteria:**

- [ ] FastMCP exposes DAX capabilities cleanly
- [ ] GitHub Actions can invoke DAX with policy gates
- [ ] Overview shows run health metrics

---

### Phase C: Scale Transport

**Priority: MEDIUM**

| Item                   | Description                                 | Repository     |
| ---------------------- | ------------------------------------------- | -------------- |
| NATS/JetStream         | Replace HTTP polling with durable event bus | dax            |
| Distributed run state  | Multi-subscriber run observation            | dax            |
| Remote approval sync   | Approvals over event bus                    | dax            |
| Recovery notifications | Push-based recovery alerts                  | dax/soothsayer |

**Exit criteria:**

- [ ] Multiple consumers can subscribe to run state
- [ ] Approvals sync across instances
- [ ] Polling eliminated for real-time flows

---

### Phase D: Production Posture

**Priority: LOW (team/org scale)**

| Item          | Description                                  | Repository |
| ------------- | -------------------------------------------- | ---------- |
| ZITADEL       | User/org/workspace identity                  | infra      |
| Infisical     | Secrets, env injection, provider credentials | infra      |
| OpenTelemetry | Traces/events/metrics instrumentation        | dax        |
| Prometheus    | Metrics collection                           | dax        |
| Grafana       | Dashboards                                   | infra      |
| Loki          | Log aggregation                              | infra      |

**Exit criteria:**

- [ ] DAX is observable end-to-end
- [ ] Secrets handled securely
- [ ] Multi-user auth working

---

## Current State

### Completed ✅

- Determinism and replay/recovery
- Picobot ingress (basic)
- Workspace MCP (core)
- Tool allowlisting
- Soothsayer API

### In Progress 🔄

- Soothsayer UI completion (Phase A)
- Governance failure visibility (Phase 3B/3C)

### Deferred ⏳

- NATS/JetStream
- FastMCP
- GitHub CI integration
- ZITADEL/Infisical
- Observability stack

---

## What NOT to Integrate Yet

- Kubernetes-heavy deployment complexity
- Service mesh
- Multiple message buses
- Large data platform pieces
- Vector DB infrastructure

---

## Stack Principle

> Build DAX outward in this order:
> **capabilities → ingress → CI/substrate → transport → identity/secrets → observability**

DAX's value is **governed execution**, not "look how many infra logos we use."

---

## Feature Branches

| Branch                   | Repository      | Phase   |
| ------------------------ | --------------- | ------- |
| `feat/open-source-stack` | dax, soothsayer | Roadmap |

## Related Documents

- [GOVERNED_FAILURE_VISIBILITY.md](./GOVERNED_FAILURE_VISIBILITY.md)
- [DAX_FAILURE_SCENARIOS_QA.md](./DAX_FAILURE_SCENARIOS_QA.md)
- [DAX_WORKSTATION_MILESTONE_1.md](./DAX_WORKSTATION_MILESTONE_1.md)
