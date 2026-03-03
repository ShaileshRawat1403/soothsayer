# Integrations Explained (ELI12)

Integrations let Soothsayer talk to other apps (like GitHub and Google Drive).

Think of each integration like giving Soothsayer a **visitor pass**:

- no pass -> cannot enter that app
- wrong pass -> denied
- right pass -> can perform approved actions

## OAuth vs Manual Token

## OAuth (recommended)

1. Click **Connect OAuth** in Soothsayer.
2. You are redirected to the provider (GitHub/Google).
3. You sign in there.
4. Provider sends you back to Soothsayer.

Why better:

- safer for most users
- easier account verification
- easier revoke/reconnect

## Manual token (advanced users)

You paste an API token/PAT manually.

Use when:

- OAuth app is not configured yet
- self-hosted/custom enterprise environments

## What users should see

On each integration card:

- configured vs not configured
- connected vs disconnected
- connected account name/email
- last test result

If OAuth is disabled, card should show exactly what admin must configure.

## Common errors and what they mean

### “Missing GITHUB_CLIENT_ID” / “Missing GOOGLE_CLIENT_ID”

Admin setup issue, not user mistake.

### “Connected but test failed”

Token expired/revoked or missing scope permissions.

### “OAuth callback failed”

Usually redirect URI mismatch or provider-side config mismatch.

## Disconnect and reconnect

If access seems stale:

1. Disconnect integration in Settings.
2. Connect OAuth again.
3. Run Test.

## Privacy and trust

Soothsayer should only request minimum scopes needed for features.

When in doubt, ask admin:

- what scopes are requested?
- what data is read/written?

