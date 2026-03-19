# Runtime Validation Report — March 19, 2026

## Overview
This report documents the end-to-end validation of the DAX governed execution system across multiple providers and interruption scenarios.

## Validation Scenarios

### Scenario A: Gemini Baseline
- **Goal:** Verify standard human-in-the-loop lifecycle using the Google/Gemini provider.
- **Provider:** `google/gemini-2.5-pro`
- **Intent:** `Use the shell to list files, then create TEST_A.md with "ok"`
- **Result:** **PASS**
- **Run ID:** `ses_2f99b7ad8ffeWMetsomA7vByu6`
- **Observations:** 
  - Model correctly planned a multi-step sequence (shell + write).
  - Both actions triggered distinct approval boundaries.
  - Approval resolution correctly resumed execution.
  - Terminal summary accurately reflected `approvalCount: 2`.

### Scenario B: OpenAI/Azure (Post-Quota)
- **Goal:** Verify recovery from provider-specific quota stalls and confirm cross-provider stability.
- **Provider:** `openai/gpt-5.3-codex`
- **Intent:** `Use the shell to list files, then create TEST_B.md with "ok"`
- **Result:** **PASS**
- **Run ID:** `ses_2f999f262ffeeh20QiLE2ELs2e`
- **Observations:**
  - No stalls observed after quota reset.
  - Approval boundary reached successfully.
  - Execution summary matches timeline truth.

### Scenario C: Control-Plane Interruption
- **Goal:** Prove that pending approvals and run state survive a Soothsayer API restart.
- **Provider:** `google/gemini-2.5-pro`
- **Intent:** `Use the shell to list files, then create TEST_C.md with "ok"`
- **Result:** **PASS**
- **Run ID:** `ses_2f997a168ffeUMekVcPt5kRQ3j`
- **Observations:**
  - Run started and reached `waiting_approval`.
  - API session was invalidated/restarted.
  - Approval record correctly persisted and was retrievable post-restart.
  - `deny` action correctly terminated the run with the expected failure outcome.

## Conclusion
The execution authority (DAX) and control plane (Soothsayer) interaction is stable, provider-agnostic, and resilient to host-level interruptions.
