# Workflows Explained (ELI12)

Think of a workflow like a cooking recipe:

- ingredients = inputs/context
- steps = actions
- final dish = outcome

Soothsayer workflows are reusable recipes for team operations.

## Why workflows exist

Without workflows, people repeat the same process manually.

With workflows, you get:

- repeatability
- fewer mistakes
- clearer accountability

## Current builder model

Soothsayer currently uses a **step-based editor** (form-based), not drag-and-drop nodes.

You can:

1. create workflow
2. define trigger
3. add/edit/remove steps
4. save
5. run now
6. pause/activate

## Trigger types in plain language

- **manual**: run when a human clicks “Run Now”
- **scheduled**: run on a timetable
- **event/webhook**: run when a connected system sends an event

## Step types in plain language

- **read**: gather info
- **analysis**: reason on info
- **task/execute**: run command/task
- **write/notification**: save/update/notify

## A practical example

“Release Checklist” workflow:

1. Validate branch state
2. Run tests
3. Build artifacts
4. Publish summary

If step 2 fails, you stop and fix before release.

## Good workflow habits

- Keep steps small and clear.
- Name steps so a new teammate understands them.
- Start with manual trigger before automation.
- Add high-risk steps later, not first.

## Failure recovery

If a workflow run fails:

1. open run details
2. identify failing step
3. fix config/permissions/input
4. re-run

Don’t edit five things at once. Change one thing, retry, confirm.

