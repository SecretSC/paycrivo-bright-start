#!/usr/bin/env node
// PayCrivo — production web (SSR) launcher.
//
// Why this exists:
//   The TanStack Start production build (Nitro `node-server` preset) emits
//   `.output/server/index.mjs`, which is supposed to open an HTTP listener on
//   import. In some environments the bundled `srvx` runtime can take a
//   "serverless loader" code path (`globalThis.__srvxLoader__`) and return
//   WITHOUT binding a socket — the Node process then has nothing keeping the
//   event loop alive and exits with code 0, no error, no port.
//
//   This launcher removes all ambiguity: it strips any inherited loader,
//   guarantees a PORT/HOST, imports the built server (which binds the socket),
//   and then keeps the process alive explicitly. systemd runs THIS file, so
//   the web service can never silently exit.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const entry = resolve(projectRoot, ".output/server/index.mjs");

if (!existsSync(entry)) {
  console.error(
    `[paycrivo-web] Build output not found: ${entry}\n` +
      `Run \`npm run build\` first (Nitro node-server preset must be active).`,
  );
  process.exit(1);
}

// Never take the serverless "loader" path — always bind a real socket.
delete globalThis.__srvxLoader__;

// Defaults match docs/systemd/paycrivo-web.service (Apache proxies to this).
process.env.PORT = process.env.PORT || "4000";
process.env.HOST = process.env.HOST || "127.0.0.1";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

console.log(
  `[paycrivo-web] Starting SSR server on http://${process.env.HOST}:${process.env.PORT}`,
);

// Importing the Nitro node-server entry binds the listener as a side effect.
await import(entry);

// Belt-and-braces: keep the process alive even if, for any reason, the bound
// socket is not enough to hold the event loop open.
const keepAlive = setInterval(() => {}, 1 << 30);

function shutdown(signal) {
  console.log(`[paycrivo-web] Received ${signal}, shutting down.`);
  clearInterval(keepAlive);
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));