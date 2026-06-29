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
SSR_SERVICE="$PROJECT_ROOT/.output/server/_ssr/ssr.mjs"
BACKEND_DIR="$PROJECT_ROOT/server"
BACKEND_PORT="4100"
WEB_PORT="4000"
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
trap 'die "Update failed at step ${STEP}. No services were left half-restarted beyond this point."' ERR

echo "${BOLD}PayCrivo production update${RESET}"
echo "Project root : $PROJECT_ROOT"
echo "Backend port : $BACKEND_PORT"
echo "Web port     : $WEB_PORT"
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
[ -f "$SSR_SERVICE" ] || die "Build did not produce TanStack SSR service: $SSR_SERVICE (routes are not mounted)"
ok "Frontend SSR server built -> $SSR_ENTRY"
ok "TanStack route service built -> $SSR_SERVICE"

# ---- Backend build ----
step "Building backend ($BACKEND_DIR)"
[ -d "$BACKEND_DIR" ] || die "Backend folder not found: $BACKEND_DIR"
cd "$BACKEND_DIR"
[ -f "$BACKEND_DIR/.env" ] || die "Missing $BACKEND_DIR/.env. Copy server/.env.production.example to server/.env and set DATABASE_URL, SMTP, and JWT secrets before running update."
npm install
if [ -d "$BACKEND_DIR/prisma" ] || [ -f "$BACKEND_DIR/prisma/schema.prisma" ]; then
  npx prisma generate
fi
if npm run | grep -qE '^[[:space:]]*build'; then
  npm run build
  ok "Backend built"
else
  echo "    (no build script defined, skipping)"
fi

# ---- Prisma migration (only if Prisma is present) ----
step "Running database migration (Prisma, if present)"
if [ -d "$BACKEND_DIR/prisma" ] || [ -f "$BACKEND_DIR/prisma/schema.prisma" ]; then
  npx prisma migrate deploy
  node --input-type=module <<'NODE'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tables = [
  'users', 'admin_users', 'sessions', 'live_events', 'orders', 'order_events', 'order_notes',
  'wallets', 'reward_claims', 'support_tickets', 'support_messages',
  'support_conversation_events', 'ticket_notes', 'admin_action_logs', 'email_codes', 'settings',
];
try {
  const missing = [];
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."${table}"') IS NOT NULL AS "exists"`);
    if (!rows?.[0]?.exists) missing.push(table);
  }
  if (missing.length) throw new Error(`Missing required table(s): ${missing.join(', ')}`);
} finally {
  await prisma.$disconnect();
}
NODE
  ok "Prisma migrations applied"
  ok "Verified required database tables exist"
  npm run seed:settings
  if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    npm run seed:admin
  else
    echo "    (ADMIN_EMAIL/ADMIN_PASSWORD not set in shell; seed-admin reads server/.env at runtime if configured)"
    npm run seed:admin || echo "    (admin seed skipped; set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env)"
  fi
else
  echo "    (no Prisma schema found, skipping migration)"
fi

# ---- Reinstall PayCrivo systemd units from the repository ----
step "Installing current PayCrivo systemd units"
if [ -d "$SYSTEMD_SRC" ]; then
  for unit in "$WEB_SERVICE" "$API_SERVICE"; do
    [ -f "$SYSTEMD_SRC/${unit}.service" ] || die "Missing systemd unit: $SYSTEMD_SRC/${unit}.service"
    sudo cp "$SYSTEMD_SRC/${unit}.service" "/etc/systemd/system/${unit}.service"
    ok "Installed ${unit}.service"
  done
  if [ -f "$BACKEND_DIR/dist/worker.js" ] && [ -f "$SYSTEMD_SRC/${WORKER_SERVICE}.service" ]; then
    sudo cp "$SYSTEMD_SRC/${WORKER_SERVICE}.service" "/etc/systemd/system/${WORKER_SERVICE}.service"
    ok "Installed ${WORKER_SERVICE}.service"
  else
    echo "    (worker build not present, leaving $WORKER_SERVICE unchanged/skipped)"
  fi
  sudo systemctl daemon-reload
  sudo systemctl enable "$WEB_SERVICE" "$API_SERVICE"
  ok "systemd reloaded"
else
  die "Systemd unit directory not found: $SYSTEMD_SRC"
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

# ---- Verify the web SSR service is serving the app, not the API 404 ----
step "Verifying frontend SSR routes"
assert_web_route() {
  local path="$1"
  local body
  local headers
  local status
  body="$(mktemp)"
  headers="$(mktemp)"
  status="$(curl -sS --max-time 15 -D "$headers" -o "$body" -w '%{http_code}' "http://127.0.0.1:${WEB_PORT}${path}")" || {
    rm -f "$body" "$headers"
    die "Web route ${path} did not respond on port ${WEB_PORT}"
  }
  if [ "$status" != "200" ]; then
    echo "    Response body:"
    head -c 500 "$body" || true
    echo
    rm -f "$body" "$headers"
    die "Web route ${path} returned HTTP ${status}, expected 200"
  fi
  if ! grep -qi '^content-type: text/html' "$headers"; then
    echo "    Response headers:"
    cat "$headers" || true
    rm -f "$body" "$headers"
    die "Web route ${path} did not return HTML"
  fi
  if grep -q '"error":"Not found"' "$body"; then
    rm -f "$body" "$headers"
    die "Web route ${path} is still returning the backend JSON 404"
  fi
  if ! grep -q 'PayCrivo' "$body"; then
    rm -f "$body" "$headers"
    die "Web route ${path} did not render the PayCrivo app shell"
  fi
  rm -f "$body" "$headers"
  ok "${path} renders the app"
}
assert_web_route "/"
assert_web_route "/login"
assert_web_route "/buy-crypto"

# ---- Reload Apache ----
step "Reloading Apache"
sudo systemctl reload apache2
ok "Apache reloaded"

# ---- Health summary ----
step "Service status"
curl -fsS --max-time 10 "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null || die "API health check failed on port ${BACKEND_PORT}"
ok "API health check passed"
cors_headers="$(mktemp)"
curl -fsS --max-time 10 -X OPTIONS \
  -H "Origin: https://paycrivo.com" \
  -H "Access-Control-Request-Method: POST" \
  -D "$cors_headers" \
  -o /dev/null \
  "http://127.0.0.1:${BACKEND_PORT}/api/email/send-code" || { rm -f "$cors_headers"; die "API CORS preflight failed"; }
grep -qi '^access-control-allow-origin: https://paycrivo.com' "$cors_headers" || { cat "$cors_headers"; rm -f "$cors_headers"; die "API CORS preflight did not allow https://paycrivo.com"; }
rm -f "$cors_headers"
ok "API CORS preflight allows https://paycrivo.com"
systemctl --no-pager --lines=0 status "$WEB_SERVICE" || true
systemctl --no-pager --lines=0 status "$API_SERVICE" || true

echo
echo "${GREEN}${BOLD}✓ PayCrivo update complete.${RESET}"
echo "  Frontend: $SSR_ENTRY ($WEB_SERVICE)"
echo "  API:      http://127.0.0.1:${BACKEND_PORT} ($API_SERVICE)"
