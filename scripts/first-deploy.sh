#!/usr/bin/env bash
#
# PayCrivo — First Deployment Script
# -----------------------------------
# One-time setup for a fresh server install. Builds frontend + backend,
# initialises the database, installs systemd services, and starts PayCrivo.
#
#   cd /var/www/paycrivo.com
#   bash scripts/first-deploy.sh
#
# Safe by design: stops on any error, prints every step, and only
# touches PayCrivo. It will NOT affect SecretVoIP or any other project.

set -Eeuo pipefail

# ---- Fixed PayCrivo paths ----
PROJECT_ROOT="/var/www/paycrivo.com"
# The TanStack Start app lives at the project root and builds an SSR Node server.
FRONTEND_DIR="$PROJECT_ROOT"
SSR_ENTRY="$PROJECT_ROOT/.output/server/index.mjs"
BACKEND_DIR="$PROJECT_ROOT/server"
BACKEND_PORT="4100"
WEB_SERVICE="paycrivo-web"
API_SERVICE="paycrivo-api"
WORKER_SERVICE="paycrivo-worker"
SYSTEMD_SRC="$PROJECT_ROOT/docs/systemd"

# ---- Pretty output helpers ----
BOLD="$(tput bold 2>/dev/null || true)"; RESET="$(tput sgr0 2>/dev/null || true)"
GREEN="$(tput setaf 2 2>/dev/null || true)"; BLUE="$(tput setaf 4 2>/dev/null || true)"; RED="$(tput setaf 1 2>/dev/null || true)"
STEP=0
step() { STEP=$((STEP+1)); echo; echo "${BOLD}${BLUE}==> [${STEP}] $*${RESET}"; }
ok()   { echo "${GREEN}    ✓ $*${RESET}"; }
die()  { echo "${RED}${BOLD}ERROR: $*${RESET}" >&2; exit 1; }
trap 'die "First deploy failed at step ${STEP}."' ERR

echo "${BOLD}PayCrivo first deployment${RESET}"
echo "Project root : $PROJECT_ROOT"
echo "Backend port : $BACKEND_PORT"

# ---- Sanity checks ----
step "Verifying PayCrivo project layout"
[ -d "$PROJECT_ROOT" ] || die "Project root not found: $PROJECT_ROOT"
cd "$PROJECT_ROOT"
ok "Confirmed PayCrivo at $PROJECT_ROOT"

# ---- Environment files ----
step "Checking environment files"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "    Created $BACKEND_DIR/.env from .env.example"
    echo "    ${BOLD}${RED}Edit this file with real values before going live.${RESET}"
  else
    echo "    ${RED}No $BACKEND_DIR/.env found. Create it before continuing.${RESET}"
  fi
else
  ok "Backend .env present"
fi

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

# ---- Database init (Prisma) ----
step "Initialising database (Prisma, if present)"
if [ -d "$BACKEND_DIR/prisma" ] || [ -f "$BACKEND_DIR/prisma/schema.prisma" ]; then
  npx prisma generate
  npx prisma migrate deploy
  ok "Prisma schema deployed"
else
  echo "    (no Prisma schema found, skipping)"
fi

# ---- Install systemd services ----
step "Installing systemd services"
if [ -d "$SYSTEMD_SRC" ]; then
  # Always install web + api. The worker is OPTIONAL — only install it when a
  # worker build actually exists, otherwise it would crash-loop on a missing file.
  for unit in "$WEB_SERVICE" "$API_SERVICE"; do
    if [ -f "$SYSTEMD_SRC/${unit}.service" ]; then
      sudo cp "$SYSTEMD_SRC/${unit}.service" "/etc/systemd/system/${unit}.service"
      ok "Installed ${unit}.service"
    fi
  done
  if [ -f "$BACKEND_DIR/dist/worker.js" ] && [ -f "$SYSTEMD_SRC/${WORKER_SERVICE}.service" ]; then
    sudo cp "$SYSTEMD_SRC/${WORKER_SERVICE}.service" "/etc/systemd/system/${WORKER_SERVICE}.service"
    ok "Installed ${WORKER_SERVICE}.service"
  else
    echo "    (no worker build at $BACKEND_DIR/dist/worker.js — skipping $WORKER_SERVICE)"
  fi
  sudo systemctl daemon-reload
else
  echo "    (no $SYSTEMD_SRC directory, skipping service install)"
fi

# ---- Enable + start ONLY PayCrivo services ----
step "Enabling and starting PayCrivo services"
sudo systemctl enable --now "$WEB_SERVICE"
ok "Started $WEB_SERVICE (SSR frontend)"
sudo systemctl enable --now "$API_SERVICE"
ok "Started $API_SERVICE (port $BACKEND_PORT)"
if [ -f "/etc/systemd/system/${WORKER_SERVICE}.service" ]; then
  sudo systemctl enable --now "$WORKER_SERVICE"
  ok "Started $WORKER_SERVICE"
else
  echo "    ($WORKER_SERVICE not installed, skipping)"
fi

# ---- Reload Apache ----
step "Reloading Apache"
if systemctl is-active --quiet apache2; then
  sudo systemctl reload apache2
  ok "Apache reloaded"
else
  echo "    (apache2 not running; configure the vhost then 'sudo systemctl reload apache2')"
fi

echo
echo "${GREEN}${BOLD}✓ PayCrivo first deployment complete.${RESET}"
echo "  Frontend: $SSR_ENTRY ($WEB_SERVICE)"
echo "  API:      http://127.0.0.1:${BACKEND_PORT} ($API_SERVICE)"
echo "  Updates:  bash scripts/update.sh"
