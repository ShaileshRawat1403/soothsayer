# Soothsayer Dual Setup Guide (Non-Developers)

This guide is for users who want:

- Soothsayer web app running on AWS (EC2)
- AI responses from Azure OpenAI (`gpt-4o` or your deployed model)

No coding is required if you follow steps exactly.

## What You Are Building

- AWS EC2 hosts the app (`web + api`)
- Azure OpenAI provides the model responses

Think of it like:

- AWS = your office building
- Azure OpenAI = expert consultant you call
- Soothsayer = receptionist that routes your question to the consultant

## Before You Start

You need:

1. EC2 access with SSH key
2. Azure OpenAI deployment already created (example: `gpt-4o`)
3. Azure endpoint + API key from the same deployment resource

## Step 1: Confirm Azure Values

From Azure OpenAI deployment page, copy:

- Endpoint host (example): `https://shail-mkt74lrg-eastus2.cognitiveservices.azure.com/`
- API key
- Deployment name (example): `gpt-4o`

Important:

- Use key and endpoint from the same resource.
- Do not mix keys from one resource with endpoint of another.

## Step 2: Connect to EC2

```bash
ssh -i /path/to/your-key.pem ec2-user@<EC2_PUBLIC_IP>
cd /home/ec2-user/soothsayer
```

## Step 3: Configure `.env` on EC2

Set Azure OpenAI as provider backend:

```bash
sed -i '/^OPENAI_BASE_URL=/d;/^OPENAI_API_KEY=/d' .env
echo 'OPENAI_BASE_URL=https://shail-mkt74lrg-eastus2.cognitiveservices.azure.com/openai/v1' >> .env
echo 'OPENAI_API_KEY=PASTE_REAL_AZURE_KEY_HERE' >> .env
```

Optional hardening:

```bash
sed -i '/^WS_REDIS_ENABLED=/d;/^WS_REDIS_FORCE_IN_DEV=/d' .env
echo 'WS_REDIS_ENABLED=false' >> .env
echo 'WS_REDIS_FORCE_IN_DEV=false' >> .env
```

## Step 4: Restart App Processes

```bash
pm2 restart soothsayer-api --update-env
pm2 restart soothsayer-web --update-env
pm2 status
```

## Step 5: Set Provider in UI

Open: `http://<EC2_PUBLIC_IP>:5173`

1. Go to `Settings -> AI Providers -> OpenAI`
2. Ensure provider key is set
3. Set model to your deployment name (example: `gpt-4o`)
4. Start a new chat

## Step 6: Verification Checklist

Run in EC2 shell:

```bash
grep -E '^OPENAI_BASE_URL=|^OPENAI_API_KEY=' .env | sed 's/OPENAI_API_KEY=.*/OPENAI_API_KEY=***set***/'
curl -sS http://localhost:3000/api/health
```

Expected:

- API health returns success
- OpenAI key line exists (masked)
- Chat replies without `Missing API key` or `401 invalid subscription key`

## Quick Troubleshooting

### Error: `Missing API key`

Cause: key missing/empty at runtime.

Fix:

```bash
grep '^OPENAI_API_KEY=' .env
pm2 restart soothsayer-api --update-env
```

### Error: `401 invalid subscription key or wrong endpoint`

Cause: endpoint/key mismatch.

Fix:

- Recopy endpoint and key from same Azure resource page
- Ensure endpoint is `...cognitiveservices.azure.com/openai/v1`

### UI still shows old model/provider

Cause: browser cache.

Fix in browser console:

```js
localStorage.removeItem('soothsayer-ai-providers');
location.reload();
```

## Daily Operations (Non-Dev)

When EC2 restarts:

```bash
cd /home/ec2-user/soothsayer
pm2 restart all --update-env || true
pm2 status
```

Health checks:

```bash
curl -sS http://localhost:3000/api/health
curl -I http://localhost:5173
```

## What You Do Not Need

- You do not need Bedrock quota changes if using Azure OpenAI path.
- You do not need Redis for single-instance dev/test mode.
- You do not need to create a new resource group if your existing Azure OpenAI resource works.
