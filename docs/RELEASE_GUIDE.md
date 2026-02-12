# Soothsayer Release Guide

## Purpose

This guide is for shipping a clean GitHub release with deployable artifacts.

## Release Checklist

| Area | Check | Command |
|---|---|---|
| Git | Working tree clean | `git status --short` |
| Build | Web build passes | `pnpm --filter @soothsayer/web build` |
| Build | API build passes | `pnpm --filter @soothsayer/api build` |
| Runtime | API health returns 200 | `curl -sS http://localhost:3000/api/health` |
| Runtime | Web reachable | `curl -I http://localhost:5173` |
| Docs | Runbooks updated | Review `docs/EC2_LIVE_DEPLOY.md` |

## Build Artifacts

```bash
tar -czf soothsayer-web-dist.tar.gz -C apps/web dist
tar -czf soothsayer-api-dist.tar.gz -C apps/api dist
```

## Tag and Publish

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

Create a GitHub Release and attach:

- `soothsayer-web-dist.tar.gz`
- `soothsayer-api-dist.tar.gz`

## Notes for EC2 Runtime

> `pm2 save` is done, but startup is not fully enabled until you run the exact `sudo env ... pm2 startup ...` command printed by PM2.

After enabling startup once:

```bash
pm2 save
pm2 status
```

## Mobile Access

- If you run via Vite dev server: `http://<EC2_PUBLIC_IP>:5173`
- If using nginx proxy (recommended): `http://<EC2_PUBLIC_IP>` or your domain
- For stable URL across restarts, use Elastic IP.
