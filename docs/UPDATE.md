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

# Frontend
npm install
npm run build

# Server
cd server
npm install
npm run build
npm run migrate
cd ..

# Restart services
sudo systemctl restart paycrivo-api
sudo systemctl restart paycrivo-worker   # only if a worker service is installed

# Reload the web server
sudo systemctl reload apache2   # or: sudo systemctl reload nginx
```

## Rollback

```bash
cd /var/www/paycrivo.com
git log --oneline -n 5          # find the previous good commit
git checkout <commit-sha>
bash scripts/update.sh
```

Restore the database from a backup if a migration needs reverting — see
[BACKUP.md](./BACKUP.md).