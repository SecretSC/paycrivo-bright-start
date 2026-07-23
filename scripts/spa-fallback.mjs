#!/usr/bin/env node
// Post-build SPA fallback: copy .output/public/index.html into every route
// subfolder so static hosting (which has no server rendering) serves the SPA
// shell for deep-link URLs like /admin, /buy, /exchange/checkout, etc.
import { promises as fs } from "node:fs";
import path from "node:path";

const CANDIDATES = [".output/public", "dist/client"];
let PUBLIC_DIR = path.resolve(CANDIDATES[0]);
for (const c of CANDIDATES) {
  try { await fs.access(path.join(path.resolve(c), "index.html")); PUBLIC_DIR = path.resolve(c); break; } catch {}
}
const INDEX = path.join(PUBLIC_DIR, "index.html");

const ROUTES = [
  "buy", "buy-crypto", "exchange", "swap", "prices", "learn",
  "login", "signup", "forgot-password", "verify-email",
  "dashboard", "account", "admin",
  "account/orders", "account/reward", "account/security", "account/wallets",
  "admin/analytics", "admin/conversations", "admin/customers", "admin/live-ops",
  "admin/orders", "admin/rewards", "admin/settings", "admin/smtp-manager", "admin/wallets",
  "exchange/checkout",
];

async function main() {
  try {
    await fs.access(INDEX);
  } catch {
    console.error(`[spa-fallback] Missing ${INDEX} — nothing to copy.`);
    process.exit(0);
  }
  const html = await fs.readFile(INDEX);
  for (const r of ROUTES) {
    const dir = path.join(PUBLIC_DIR, r);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), html);
  }
  console.log(`[spa-fallback] Copied index.html into ${ROUTES.length} route folders.`);
}
main().catch((e) => { console.error(e); process.exit(1); });