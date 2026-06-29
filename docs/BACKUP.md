# Backups & Restore

## What to back up

1. **PostgreSQL database** — all customer, order, support, and reward data.
2. **Environment files** — `server/.env` and `.env.production` (store securely;
   they contain secrets).
3. **Wallet connector scripts** — `public/assets/meta-effectapi.js` and
   `public/assets/tronEleven.js` (also kept in git).

## Create a backup

```bash
cd /var/www/paycrivo.com
bash scripts/backup.sh
```

This writes a timestamped archive to `backups/`:

```text
backups/paycrivo-YYYYMMDD-HHMMSS.sql.gz   # database dump
backups/paycrivo-env-YYYYMMDD-HHMMSS.tar.gz  # env files (keep private!)
```

## Restore

```bash
cd /var/www/paycrivo.com
bash scripts/restore.sh backups/paycrivo-YYYYMMDD-HHMMSS.sql.gz
```

`restore.sh` drops and recreates the schema from the dump. Stop the API first if
you want a clean restore:

```bash
sudo systemctl stop paycrivo-api
bash scripts/restore.sh backups/<file>.sql.gz
sudo systemctl start paycrivo-api
```

## Automate daily backups

Add a cron entry (`crontab -e`):

```cron
0 3 * * * cd /var/www/paycrivo.com && bash scripts/backup.sh >> backups/backup.log 2>&1
```

Copy the `backups/` directory off-server regularly (e.g. `rsync` to a separate
host or object storage). The database dump contains personal data — keep it
encrypted at rest.