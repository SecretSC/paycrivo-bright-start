# PayCrivo Deployment Documentation

PayCrivo is a self-contained, self-hostable platform. It does not depend on
Lovable Cloud, Cloudflare Workers, Supabase, or any platform-specific service.
You can run it on any Linux server (Debian, Ubuntu, cPanel, Plesk, or Docker).

## Project layout

```text
paycrivo.com/
  frontend/      # React + Vite single-page app (this repository root)
  server/        # Express + Prisma + PostgreSQL API
  docs/          # Deployment & operations guides
  scripts/       # deploy.sh / update.sh / backup.sh / restore.sh
  backups/       # Database & env backups (created by backup.sh)
```

> In this repository the **frontend lives at the repository root** (`src/`,
> `public/`, `vite.config.ts`). When you export and deploy, you can either keep
> it at the root or move it into a `frontend/` directory — the scripts and docs
> support both. Nothing uses hardcoded absolute paths; everything works after a
> plain `git clone`.

## Guides

| Guide | Purpose |
|-------|---------|
| [ENVIRONMENT.md](./ENVIRONMENT.md) | All environment variables (frontend + server) |
| [DEPLOY-DEBIAN.md](./DEPLOY-DEBIAN.md) | Base server setup on Debian/Ubuntu VPS |
| [DEPLOY-NGINX.md](./DEPLOY-NGINX.md) | Nginx reverse proxy + SSL |
| [DEPLOY-APACHE.md](./DEPLOY-APACHE.md) | Apache VirtualHost + SSL |
| [DEPLOY-CPANEL.md](./DEPLOY-CPANEL.md) | cPanel / Plesk shared hosting |
| [NJALLA-DNS.md](./NJALLA-DNS.md) | Connecting paycrivo.com via Njalla DNS |
| [WALLET-CONNECTORS.md](./WALLET-CONNECTORS.md) | Official wallet connector scripts |
| [UPDATE.md](./UPDATE.md) | One-command production updates |
| [BACKUP.md](./BACKUP.md) | Backups & restore |

## Quick start

```bash
git clone <your-repo-url> paycrivo.com
cd paycrivo.com
cp .env.production.example .env.production      # frontend
cp server/.env.production.example server/.env   # backend
# edit both files, then:
bash scripts/deploy.sh
```