#!/usr/bin/env bash
# PayCrivo restore: load a gzipped SQL dump back into PostgreSQL.
# Usage: bash scripts/restore.sh backups/paycrivo-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DUMP="${1:-}"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Usage: bash scripts/restore.sh <path-to-dump.sql.gz>" >&2
  exit 1
fi

if [ -f "$ROOT/server/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT/server/.env"; set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set (check server/.env)" >&2
  exit 1
fi

echo "WARNING: this overwrites the current database with $DUMP"
read -r -p "Type 'yes' to continue: " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 1; }

echo "==> Restoring database"
gunzip -c "$DUMP" | psql "$DATABASE_URL"

echo "==> Restore complete."