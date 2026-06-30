# Deploy on Debian / Ubuntu VPS

Base setup for a fresh Debian 12 or Ubuntu 22.04+ server. After this, follow
either [DEPLOY-NGINX.md](./DEPLOY-NGINX.md) or [DEPLOY-APACHE.md](./DEPLOY-APACHE.md).

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw postgresql postgresql-contrib

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. PostgreSQL database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER paycrivo WITH PASSWORD 'STRONG_DB_PASSWORD';
CREATE DATABASE paycrivo OWNER paycrivo;
GRANT ALL PRIVILEGES ON DATABASE paycrivo TO paycrivo;
SQL
```

## 3. Clone the project

```bash
sudo mkdir -p /var/www
sudo chown "$USER" /var/www
cd /var/www
git clone <your-repo-url> paycrivo.com
cd paycrivo.com
```

## 4. Configure environment

```bash
cp .env.production.example .env.production
cp server/.env.production.example server/.env
nano .env.production    # set VITE_API_BASE_URL=https://api.paycrivo.com
nano server/.env        # set DATABASE_URL, JWT secrets, admin, SMTP
```

## 5. First build & migrate

```bash
bash scripts/deploy.sh
```

This installs dependencies, builds the frontend, builds the server, runs
database migrations, and seeds the first admin account.

The frontend build uses the Nitro **`node-server`** preset (configured in
`vite.config.ts`) and emits the TanStack Start SSR service under
`.output/server/_ssr/`. In production PayCrivo starts through
`scripts/start-web.mjs`, a hardened Node launcher that serves `.output/public`
assets and dispatches application routes directly to the generated SSR service.
This avoids generic JSON 404 fallthroughs and guarantees `/`, `/login`, and
`/buy-crypto` render the app on port 3005.

```bash
npm install
npm run build
PORT=3005 node scripts/start-web.mjs
```

Cloudflare Workers is **not** the default target. To build for Cloudflare
anyway, set `NITRO_PRESET=cloudflare-module npm run build`.

## 6. Run the web (SSR) + API as services

### Frontend SSR server — `paycrivo-web`

Create `/etc/systemd/system/paycrivo-web.service` (or copy from
`docs/systemd/paycrivo-web.service`):

```ini
[Unit]
Description=PayCrivo Web (TanStack Start SSR)
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/paycrivo.com
Environment=PORT=3005
Environment=HOST=127.0.0.1
Environment=NODE_ENV=production
ExecStart=/usr/bin/node scripts/start-web.mjs
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now paycrivo-web
sudo systemctl status paycrivo-web
```

### Express API service

Create `/etc/systemd/system/paycrivo-api.service`:

```ini
[Unit]
Description=PayCrivo API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/paycrivo.com/server
EnvironmentFile=/var/www/paycrivo.com/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

(Optional) a background worker service `/etc/systemd/system/paycrivo-worker.service`
follows the same pattern with `ExecStart=/usr/bin/node dist/worker.js` if/when a
worker process is added.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now paycrivo-api
sudo systemctl status paycrivo-api
```

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'WWW Full'   # 80 + 443
sudo ufw enable
```

The frontend runs as the `paycrivo-web` Node SSR server on `127.0.0.1:3005`
and is reverse-proxied by Nginx or Apache at `paycrivo.com` (next guide). The
Express API stays internal on `127.0.0.1:4100` and is reverse-proxied at
`api.paycrivo.com`.