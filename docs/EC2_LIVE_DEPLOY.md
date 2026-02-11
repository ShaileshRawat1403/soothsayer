# EC2 Live Deploy Runbook (Production Mode)

This runbook starts Soothsayer in production mode on EC2 using built artifacts and PM2.

## 1) Prerequisites

- Amazon Linux 2023
- Node 20.x
- `pnpm` 8.12.0+
- project path: `/home/ec2-user/soothsayer`
- reachable Postgres in `DATABASE_URL`

## 2) Production env template

Use this prepared template for your instance/IP:

```bash
cd /home/ec2-user/soothsayer
cp infra/ec2/prod.env.100.48.60.255.example .env
# Then edit .env and set real DATABASE_URL + JWT_SECRET (+ provider keys if used)
```

## 3) Required `.env` values

Minimum:

- `DATABASE_URL`
- `JWT_SECRET` (minimum 32 characters)

Recommended:

- `NODE_ENV=production`
- `APP_URL=http://100.48.60.255`
- `CORS_ORIGINS=http://100.48.60.255`
- `WS_REDIS_ENABLED=false`
- `WS_REDIS_FORCE_IN_DEV=false`
- `ADMIN_SEED_EMAIL=admin@soothsayer.local`
- `ADMIN_SEED_PASSWORD=password123`

## 4) Security Group Inbound

Allow only your current IP for:

- TCP `22` (SSH)
- TCP `80` (Nginx HTTP)
- TCP `443` (Nginx HTTPS, optional)

You can keep `3000`/`4173` closed externally because nginx proxies to localhost.

## 5) Bootstrap and start

```bash
cd /home/ec2-user/soothsayer
PUBLIC_ORIGIN=http://100.48.60.255 \
SERVER_NAME=100.48.60.255 \
./scripts/ec2/bootstrap-live.sh
pm2 status
```

This script will:

- validate required env
- generate/push Prisma schema
- seed admin
- build API + web
- start PM2 with `infra/ec2/ecosystem.prod.config.cjs`
- install/configure nginx with `scripts/ec2/setup-nginx.sh`
- run `scripts/ec2/functional-check.sh`

If you want to skip nginx setup:

```bash
ENABLE_NGINX=false ./scripts/ec2/bootstrap-live.sh
```

## 6) Verify

- API health: `http://100.48.60.255/api/health`
- Web: `http://100.48.60.255/login`

Then login with seeded admin and send a chat message with explicit provider/model.

## 7) Useful PM2 commands

```bash
pm2 logs soothsayer-api --lines 200
pm2 logs soothsayer-web --lines 200
pm2 restart soothsayer-api --update-env
pm2 restart soothsayer-web --update-env
```

## 8) HTTPS (optional next step)

After DNS points to this instance, use certbot with nginx:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```
