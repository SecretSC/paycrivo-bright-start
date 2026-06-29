#!/usr/bin/env bash
# PayCrivo first-time deployment: install, build, migrate, seed admin.
# Run from the project root: bash scripts/deploy.sh
#
# Layout-flexible: if a ./frontend directory exists it is treated as the
# frontend; otherwise the project root is the frontend. The backend always
# lives in ./server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FRONTEND_DIR="$ROOT"
[ -d "$ROOT/frontend" ] && FRONTEND_DIR="$ROOT/frontend"

echo "==> PayCrivo deploy starting in $ROOT (frontend: $FRONTEND_DIR)"

# --- Frontend ---
echo "==> Building frontend"
cd "$FRONTEND_DIR"
npm install
npm run build

# --- Server ---
echo "==> Building server"
cd "$ROOT/server"
npm install
npm run prisma:generate
npm run build

echo "==> Running database migrations"
npm run migrate

echo "==> Seeding admin + settings (safe to re-run)"
npm run seed:admin || echo "   (admin already seeded, continuing)"
npm run seed:settings || echo "   (settings already seeded, continuing)"

cd "$ROOT"
echo "==> Done. Configure systemd (docs/systemd) + Apache, then start paycrivo-api (port 4100)."
