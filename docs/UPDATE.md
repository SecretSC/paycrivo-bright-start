# Updating Production

Updates are a single command once the server is set up.

## One command

```bash
cd /var/www/paycrivo.com && bash scripts/update.sh
```

`scripts/update.sh` pulls the latest code, rebuilds the frontend and server,
runs database migrations, and restarts the services.

## Manual equivalent

```bash
cd /var/www/paycrivo.com
git pull

# Frontend (served from /var/www/paycrivo.com/frontend/dist)
cd frontend
npm install
npm run build

# Server (API on 127.0.0.1:4100)
cd ../server
npm install
npm run build
npm run migrate

# Restart services + reload Apache
sudo systemctl restart paycrivo-api
sudo systemctl restart paycrivo-worker   # only if a worker service is installed
sudo systemctl reload apache2
```

> If your checkout keeps the frontend at the repository root instead of a
> `frontend/` subfolder, run the frontend `npm` commands from the root and
> point Apache's DocumentRoot at the build output there. `scripts/update.sh`
> auto-detects either layout.

## Rollback

```bash
cd /var/www/paycrivo.com
git log --oneline -n 5          # find the previous good commit
git checkout <commit-sha>
bash scripts/update.sh
```

Restore the database from a backup if a migration needs reverting — see
[BACKUP.md](./BACKUP.md).