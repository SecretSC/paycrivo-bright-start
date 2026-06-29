#!/usr/bin/env bash
# PayCrivo production update: pull, rebuild, migrate, restart services.
# Run from the project root: bash scripts/update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FRONTEND_DIR="$ROOT"
[ -d "$ROOT/frontend" ] && FRONTEND_DIR="$ROOT/frontend"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Rebuilding frontend ($FRONTEND_DIR)"
cd "$FRONTEND_DIR"
npm install
npm run build

echo "==> Rebuilding server"
cd "$ROOT/server"
npm install
npm run prisma:generate
npm run build
npm run migrate
cd "$ROOT"

echo "==> Restarting services"
sudo systemctl restart paycrivo-api
sudo systemctl restart paycrivo-worker 2>/dev/null || true
sudo systemctl reload apache2 2>/dev/null || true

echo "==> Update complete."
