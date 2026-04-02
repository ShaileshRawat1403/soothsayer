# Soothsayer User Adoption Guide

This guide is for operators who are new to Soothsayer and want reliable day-1 usage without guessing.

## What Soothsayer Is

- **Soothsayer** is the operator/control plane.
- **DAX** is the governed execution authority behind chat and live runs.
- **Picobot** is ingress (channel-facing entry), while Soothsayer is where operators triage, approve, and audit.

## What To Expect From Chat

When you send a message in Chat, one of these outcomes is expected:

1. **Inline assistant response (DAX-backed)**  
   DAX completes quickly and returns normal assistant text in chat.

2. **Live run handoff response**  
   If execution is still in progress (or needs approval), chat returns a governed handoff message and links to run context.

3. **Direct fallback override recovery**  
   If you intentionally selected a direct fallback provider and it fails, Soothsayer retries in DAX mode automatically.

## Recommended Default Mode

For stable operator workflows, keep chat on **DAX primary route**:

- Provider: `dax`
- Model: `gemini-2.5-pro` (or your preferred DAX-backed model)

Direct providers (`openai`, `groq`, `bedrock`, `ollama`) are advanced overrides, not the primary path.

## First 10 Minutes (Operator Path)

1. Sign in and confirm your workspace is selected.
2. Open **Chat** and send a simple prompt (for example: “Summarize this project in two bullets.”).
3. Confirm either inline DAX answer or live run handoff appears.
4. Open **Control** and **Audit** to inspect run posture and evidence.
5. If approvals appear, resolve from the approval UI and verify run progression.

## If Something Looks Broken

| Symptom | Likely Cause | Fast Fix |
| --- | --- | --- |
| `Node failure` in chat | Direct fallback provider failed | Switch back to `dax` (or rely on automatic DAX retry), then resend |
| Message sends but no immediate long answer | DAX run still executing | Open run/approval surfaces; this is governed handoff, not a dead chat |
| Conversation creation fails | Missing workspace context | Reload app, confirm workspace selection, retry |
| `No active persona available` | Persona records missing in DB | Run API seed flow (`prisma:seed` or admin seed) |

## Operator Mental Model

- Treat Chat as **governed assistance**, not a blind one-shot completion box.
- Trust **receipts, approvals, and run state** over generic success text.
- Use direct provider overrides only when you intentionally want to bypass DAX-first behavior.

## Adoption Checklist

- DAX server reachable from API (`DAX_BASE_URL` is correct)
- Workspace selected
- Persona available
- Chat provider set to `dax` for default operation
- Approval flow tested once
- Audit/replay view checked once

If all six are true, your team can onboard with high confidence.
