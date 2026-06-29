#!/usr/bin/env bash
#
# PayCrivo — Production Update Script
# -----------------------------------
# Deploys the latest Lovable/GitHub changes with one command.
#
#   cd /var/www/paycrivo.com
#   bash scripts/update.sh
#
# Safe by design: stops on any error, prints every step, and only
# touches PayCrivo. It will NOT affect SecretVoIP or any other project.

set -Eeuo pipefail

# ---- Fixed PayCrivo paths (do not point these at other projects) ----
PROJECT_ROOT="/var/www/paycrivo.com"
# The TanStack Start app lives at the project root and builds an SSR Node server.
FRONTEND_DIR="$PROJECT_ROOT"
SSR_ENTRY="$PROJECT_ROOT/.output/server/index.mjs"
BACKEND_DIR="$PROJECT_ROOT/server"
BACKEND_PORT="4100"
WEB_SERVICE="paycrivo-web"
API_SERVICE="paycrivo-api"
WORKER_SERVICE="paycrivo-worker"

# ---- Pretty output helpers ----
BOLD="$(tput bold 2>/dev/null || true)"; RESET="$(tput sgr0 2>/dev/null || true)"
GREEN="$(tput setaf 2 2>/dev/null || true)"; BLUE="$(tput setaf 4 2>/dev/null || true)"; RED="$(tput setaf 1 2>/dev/null || true)"
STEP=0
step() { STEP=$((STEP+1)); echo; echo "${BOLD}${BLUE}==> [${STEP}] $*${RESET}"; }
ok()   { echo "${GREEN}    ✓ $*${RESET}"; }
die()  { echo "${RED}${BOLD}ERROR: $*${RESET}" >&2; exit 1; }
trap 'die "Update failed at step ${STEP}. No services were left half-restarted beyond this point."' ERR

echo "${BOLD}PayCrivo production update${RESET}"
echo "Project root : $PROJECT_ROOT"
echo "Backend port : $BACKEND_PORT"
echo "Services     : $WEB_SERVICE, $API_SERVICE, $WORKER_SERVICE"

# ---- Sanity checks: make sure we are operating on PayCrivo only ----
step "Verifying PayCrivo project layout"
[ -d "$PROJECT_ROOT" ] || die "Project root not found: $PROJECT_ROOT"
[ -d "$PROJECT_ROOT/.git" ] || die "Not a git repository: $PROJECT_ROOT"
cd "$PROJECT_ROOT"
ok "Confirmed PayCrivo at $PROJECT_ROOT"

# ---- Pull latest code ----
step "Pulling latest code from GitHub"
git pull --ff-only
ok "Code up to date"

# ---- Frontend build (TanStack Start SSR -> Node server) ----
step "Building frontend SSR server ($FRONTEND_DIR)"
[ -d "$FRONTEND_DIR" ] || die "Frontend folder not found: $FRONTEND_DIR"
cd "$FRONTEND_DIR"
npm install
npm run build
[ -f "$SSR_ENTRY" ] || die "Build did not produce SSR server: $SSR_ENTRY (check Nitro preset is node-server)"
ok "Frontend SSR server built -> $SSR_ENTRY"

# ---- Backend build ----
step "Building backend ($BACKEND_DIR)"
[ -d "$BACKEND_DIR" ] || die "Backend folder not found: $BACKEND_DIR"
cd "$BACKEND_DIR"
npm install
if npm run | grep -qE '^[[:space:]]*build'; then
  npm run build
  ok "Backend built"
else
  echo "    (no build script defined, skipping)"
fi

# ---- Prisma migration (only if Prisma is present) ----
step "Running database migration (Prisma, if present)"
if [ -d "$BACKEND_DIR/prisma" ] || [ -f "$BACKEND_DIR/prisma/schema.prisma" ]; then
  npx prisma generate
  npx prisma migrate deploy
  ok "Prisma migrations applied"
else
  echo "    (no Prisma schema found, skipping migration)"
fi

# ---- Restart ONLY PayCrivo services ----
step "Restarting PayCrivo services"
sudo systemctl restart "$WEB_SERVICE"
ok "Restarted $WEB_SERVICE (SSR frontend)"
sudo systemctl restart "$API_SERVICE"
ok "Restarted $API_SERVICE (port $BACKEND_PORT)"
if systemctl list-unit-files | grep -q "^${WORKER_SERVICE}\.service"; then
  sudo systemctl restart "$WORKER_SERVICE"
  ok "Restarted $WORKER_SERVICE"
else
  echo "    ($WORKER_SERVICE not installed, skipping)"
fi

# ---- Reload Apache ----
step "Reloading Apache"
sudo systemctl reload apache2
ok "Apache reloaded"

# ---- Health summary ----
step "Service status"
systemctl --no-pager --lines=0 status "$API_SERVICE" || true

echo
echo "${GREEN}${BOLD}✓ PayCrivo update complete.${RESET}"
echo "  Frontend: $SSR_ENTRY ($WEB_SERVICE)"
echo "  API:      http://127.0.0.1:${BACKEND_PORT} ($API_SERVICE)"
