# Updating PayCrivo (Production)

After **every** Lovable change or GitHub push, deploy the update with a single command.

## Run an update

```bash
cd /var/www/paycrivo.com
bash scripts/update.sh
```

That's it. The script will:

1. Verify it is operating on PayCrivo (`/var/www/paycrivo.com`) only — it never touches SecretVoIP or any other project.
2. `git pull` the latest code.
3. Build the frontend SSR Node server (`/var/www/paycrivo.com` → `.output/server/index.mjs`, Nitro `node-server` preset).
4. Build the backend (`/var/www/paycrivo.com/server`).
5. Run Prisma migrations (only if a Prisma schema exists).
6. Restart PayCrivo services only: `paycrivo-web` (SSR frontend), `paycrivo-api` (port **4100**) and `paycrivo-worker`.
7. Reload Apache.
8. Print the API service status.

The script uses `set -Eeuo pipefail`, so it **stops immediately on any error** and tells you which step failed. Nothing is deployed half-way silently.

## First-time server install

For a brand-new server, run the one-time setup instead:

```bash
cd /var/www/paycrivo.com
bash scripts/first-deploy.sh
```

This does everything `update.sh` does, plus:

- Creates `server/.env` from `server/.env.example` if missing (edit it with real values).
- Installs systemd units from `docs/systemd/` (`paycrivo-web.service`, `paycrivo-api.service`, `paycrivo-worker.service`).
- Enables and starts the services on boot.

## Fixed paths used by both scripts

| Item              | Path / value                          |
|-------------------|---------------------------------------|
| Project root      | `/var/www/paycrivo.com`               |
| Frontend (SSR)    | `/var/www/paycrivo.com`               |
| Frontend SSR entry| `.output/server/index.mjs`            |
| Web service       | `paycrivo-web`                        |
| Backend folder    | `/var/www/paycrivo.com/server`        |
| Backend port      | `4100`                                |
| API service       | `paycrivo-api`                        |
| Worker service    | `paycrivo-worker`                     |

## Troubleshooting

- **Permission errors on restart/reload** — the script uses `sudo` for `systemctl`. Run as a user with sudo rights, or run the whole command with `sudo`.
- **A step failed** — read the `ERROR: Update failed at step N` line, fix the cause, and re-run `bash scripts/update.sh`. The script is safe to run again.
- **Check logs** — `sudo journalctl -u paycrivo-web -f` (or `paycrivo-api`, `paycrivo-worker`).

## Manual production run (without systemd)

The frontend is a standard Node server. You can also run it by hand:

```bash
npm install
npm run build
node .output/server/index.mjs   # honours PORT, defaults to 3000
```
