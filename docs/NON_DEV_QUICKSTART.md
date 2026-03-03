# Non-Dev Quickstart (10 Minutes)

This guide is for people who are not developers but want to use Soothsayer confidently.

## 1) Log in

Open the Soothsayer web app and sign in.

If your team gave you a workspace invite, accept it first.

## 2) Pick your workspace

A workspace is your team room.

- Chat history
- workflows
- integrations

all live inside this room.

## 3) Open AI Chat and ask a simple task

Try:

> “Summarize the current release status and list top 3 risks.”

You should get a structured answer with next steps.

## 4) Run one safe workflow

Go to **Workflows**:

1. Select an existing workflow, or create a new one.
2. Click **Run Now**.
3. Watch status and run count update.

Tip: Start with `read`-heavy workflows first.

## 5) Connect one integration

Go to **Settings -> Integrations** and connect:

- GitHub, or
- Google Drive

Use **Connect OAuth** (recommended), then sign in on the provider page.

## 6) Test the integration

Click **Test** on the integration card.

You should see:

- connection status
- account identity
- latest test result

## 7) Understand safe vs unsafe actions

- **Read**: inspect information
- **Write**: modify files/data
- **Execute**: run commands

Soothsayer uses policy rules to allow or block risky actions.

## Common “what just happened?” moments

### “Connect OAuth” is disabled

Your admin has not configured provider keys yet.

### Chat gave an error

Usually provider/model config mismatch. Retry once, then notify admin with exact message.

### Workflow failed

Open run details and read the failing step. Most failures are config or permission issues.

## Your first-week success checklist

- [ ] Logged in and selected the right workspace
- [ ] Sent at least 3 useful chat requests
- [ ] Ran at least 1 workflow successfully
- [ ] Connected at least 1 integration
- [ ] Tested integration status and got “connected”

