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

# --- Frontend (TanStack Start SSR -> Node server via Nitro node-server preset) ---
echo "==> Building frontend SSR server"
cd "$FRONTEND_DIR"
npm install
npm run build
[ -f "$FRONTEND_DIR/.output/server/index.mjs" ] || \
  echo "   (warning: .output/server/index.mjs not found — check Nitro preset is node-server)"

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
echo "==> Done. Configure systemd (docs/systemd) + Apache, then start:"
echo "    - paycrivo-web (SSR frontend: node .output/server/index.mjs)"
echo "    - paycrivo-api (Express API on port 4100)"
