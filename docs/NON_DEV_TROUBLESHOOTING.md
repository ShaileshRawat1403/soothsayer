# Non-Dev Troubleshooting (Quick Fixes)

This guide helps you recover quickly without technical deep-dives.

## 1) Chat is not responding

What to do:

1. Retry once.
2. Refresh page.
3. Check if provider/model is selected correctly.
4. If still failing, copy exact error and send to admin.

What it usually means:

- provider config issue
- temporary timeout
- model deployment mismatch

## 2) My message “disappeared”

What to do:

1. Open conversation list and reselect chat.
2. Refresh browser once.
3. Check if message appears after a few seconds.

If this repeats, report:

- timestamp
- conversation name/id
- what you typed

## 3) Workflow failed

What to do:

1. Open run details.
2. Identify first failing step.
3. Fix only that issue.
4. Re-run.

Don’t change many settings at once; it hides root cause.

## 4) Integration won’t connect

If **Connect OAuth** is disabled:

- admin must configure provider keys first.

If OAuth opened but callback failed:

- likely redirect URI mismatch.

If connected but test failed:

- token/scope issue; disconnect + reconnect.

## 5) I cannot run a command

Likely blocked by policy/permissions.

What to do:

1. Use lower-risk step first (`read`).
2. Request admin approval/policy update if needed.
3. Re-run with allowed scope.

## 6) Who should I contact, and with what details?

When reporting an issue, include:

- what you clicked
- exact error text
- time it happened
- workspace name
- whether it is blocking work

Good reports get fixed faster.

