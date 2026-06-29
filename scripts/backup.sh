#!/usr/bin/env bash
# PayCrivo backup: PostgreSQL dump + env files into ./backups
# Run from the project root: bash scripts/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT/backups"
mkdir -p "$BACKUP_DIR"

# Load DATABASE_URL from server/.env
if [ -f "$ROOT/server/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT/server/.env"; set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set (check server/.env)" >&2
  exit 1
fi

DB_FILE="$BACKUP_DIR/paycrivo-$STAMP.sql.gz"
echo "==> Dumping database to $DB_FILE"
pg_dump "$DATABASE_URL" | gzip > "$DB_FILE"

ENV_FILE="$BACKUP_DIR/paycrivo-env-$STAMP.tar.gz"
echo "==> Archiving env files to $ENV_FILE"
tar -czf "$ENV_FILE" \
  $( [ -f "$ROOT/server/.env" ] && echo "server/.env" ) \
  $( [ -f "$ROOT/.env.production" ] && echo ".env.production" ) 2>/dev/null || true

echo "==> Backup complete. Keep $ENV_FILE private (contains secrets)."