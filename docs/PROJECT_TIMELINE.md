# The Soothsayer: Project Timeline & Roadmap

This document tracks the evolution of The Soothsayer from an AI execution experiment to a professional, governed operator workstation.

---

## ✅ Completed Milestones

### Phase 1: Foundation & Boundary (Initial)
- **Execution Authority**: Established DAX as the source of truth for all AI actions.
- **Control Plane**: Defined Soothsayer as the human-in-the-loop interface.
- **Milestone 1 Workstation**: Implemented the first vertical slice of governed execution (Create → Observe → Approve → Complete).

### Phase 2: System Resilience & Targeting (March 19, Morning)
- **Phase 3A Targeting**: Introduced `repoPath` as the explicit execution target, removing "cwd-dependency."
- **SSE Proxy Hardening**: Implemented cursor-aware event resume and backoff logic for terminal connectivity.
- **Interruption Recovery**: Fixed critical boundary bugs ensuring pending approvals survive API restarts.
- **Event Integrity**: Serialized run event appends and fixed `approvalCount` drift in terminal summaries.

### Phase 3: Governance & Triage (March 19, Afternoon)
- **Provider Governance V2**: Added workspace-level default engines and persona-to-model mapping.
- **Fallback Transparency**: Added explicit visibility into engine selection and fallback reasoning in the console.
- **Approval Inbox V3**: Built a priority-scored triage system with aging indicators (Normal/Warning/Critical).
- **Replay / Audit V3**: Implemented stage-based event grouping and resource snippet previews for file writes.

### Phase 4: Professional UI/UX Overhaul (March 19, Evening)
- **Workstation Aesthetic**: Adopted a monochromatic design with high-fidelity typography and shadows.
- **Emoji Purge**: Replaced all tacky emojis with professional Lucide icons across all surfaces.
- **Micro-Interactions**: Integrated spring-based animations, staggered entry effects, and smooth terminal auto-scrolling.
- **Notification Center**: Restored and enhanced the animated signal popover with unread tracking.

---

## 🚀 Future Roadmap

### Immediate Priority: Replay / Audit V4
- [ ] **Full Diff Engine**: Inline visual diffs for `patch_apply` and `file_write` events.
- [ ] **Step Causality**: Visual linking showing exactly which thought/planning step led to which action.
- [ ] **Exportable Reports**: Generate PDF/Markdown summaries of a run's impact for team review.

### Next Horizon: Provider Mastery (Governance V3)
- [ ] **BYOK UI**: Encrypted user-provided API key management at the workspace level.
- [ ] **Cost Tracking**: Real-time token usage and cost estimation per run/provider.
- [ ] **Risk-Aware Routing**: Automatically route high-risk tasks to stronger models (e.g., Gemini 2.5 Pro) and low-risk to faster ones.

### Operator Leverage: Approval Inbox V4
- [ ] **Bulk Triage**: Allow operators to "Acknowledge" multiple low-risk informational signals at once.
- [ ] **Approver Roles**: Team-based approvals (e.g., only "Lead Engineer" can authorize shell commands).
- [ ] **SLA Alerts**: Push notifications for approvals that have entered the "Critical" aging state (>15 min).

### Platform Expansion
- [ ] **Interactive Workflow Canvas**: A professional node-based editor for defining complex governance sequences.
- [ ] **Global Search**: Search across runs, artifacts, and chat history using the unified workstation header.

---

## 📊 Current State: As-Is vs. To-Be (March 19 Wrap-up)

| Surface | As-Is (Morning) | To-Be (Now) |
| :--- | :--- | :--- |
| **Visuals** | Generic, emoji-heavy | Professional, high-fidelity workstation |
| **Governance** | Implicit/Hardcoded | Explicit (Workspace + Persona mapping) |
| **Visibility** | Raw Event Stream | Structured Timeline + Snippet Previews |
| **Triage** | Run-by-run navigation | Priority-based Global Inbox |
| **Stability** | Fragmented Reconnects | Resilient, cursor-aware recovery |

---
*Last updated: Thursday, March 19, 2026*
