#!/usr/bin/env bash
# PayCrivo first-time deployment: install, build, migrate, seed admin.
# Run from the project root: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> PayCrivo deploy starting in $ROOT"

# --- Frontend ---
echo "==> Building frontend"
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
echo "==> Done. Configure systemd + reverse proxy, then start paycrivo-api."