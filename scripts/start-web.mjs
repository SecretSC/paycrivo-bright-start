#!/usr/bin/env node
// PayCrivo — production web (SSR) launcher.
//
// This is intentionally a small Node HTTP adapter around the TanStack Start SSR
// service emitted at `.output/server/_ssr/ssr.mjs`.
//
// Why not rely on importing `.output/server/index.mjs` directly?
//   Nitro's generated node-server bootstrap is normally fine, but on some VPS
//   builds it can boot the outer server without dispatching to the Start SSR
//   service, leaving every app route to fall through to a generic JSON 404.
//   This launcher bypasses that ambiguity: it serves `.output/public` assets and
//   sends every application request directly to the generated TanStack SSR
//   service, so `/`, `/login`, `/buy-crypto`, etc. always mount the real route
//   tree.

import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve, sep } from "node:path";
import { Readable } from "node:stream";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const nitroEntry = resolve(projectRoot, ".output/server/index.mjs");
const ssrEntry = resolve(projectRoot, ".output/server/_ssr/ssr.mjs");
const publicRoot = resolve(projectRoot, ".output/public");

if (!existsSync(nitroEntry)) {
  console.error(
    `[paycrivo-web] Build output not found: ${nitroEntry}\n` +
      `Run \`npm run build\` first (Nitro node-server preset must be active).`,
  );
  process.exit(1);
}

if (!existsSync(ssrEntry)) {
  console.error(
    `[paycrivo-web] TanStack SSR service not found: ${ssrEntry}\n` +
      `Run \`npm run build\` again and confirm the Start route tree is emitted.`,
  );
  process.exit(1);
}

if (!existsSync(publicRoot)) {
  console.error(
    `[paycrivo-web] Public asset directory not found: ${publicRoot}\n` +
      `Run \`npm run build\` again before starting the web service.`,
  );
  process.exit(1);
}

// Never let an inherited serverless loader alter the generated SSR service.
delete globalThis.__srvxLoader__;

// Defaults match docs/systemd/paycrivo-web.service (Apache proxies to this).
const port = Number.parseInt(process.env.PORT || "4000", 10);
const host = process.env.HOST || "127.0.0.1";
process.env.PORT = String(port);
process.env.HOST = host;
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const ssrModule = await import(ssrEntry);
const ssr = ssrModule.default ?? ssrModule;

if (!ssr || typeof ssr.fetch !== "function") {
  console.error(`[paycrivo-web] Invalid TanStack SSR service: ${ssrEntry}`);
  process.exit(1);
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function safePublicPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }

  const normalized = resolve(publicRoot, `.${decoded}`);
  if (normalized !== publicRoot && !normalized.startsWith(`${publicRoot}${sep}`)) {
    return undefined;
  }
  return normalized;
}

async function maybeServeStatic(req, res, pathname) {
  const filePath = safePublicPath(pathname);
  if (!filePath) {
    res.statusCode = 400;
    res.end("Bad request");
    return true;
  }

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return false;
  }

  if (!info.isFile()) return false;

  const ext = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeTypes.get(ext) || "application/octet-stream");
  res.setHeader("Content-Length", String(info.size));
  res.setHeader("Last-Modified", info.mtime.toUTCString());
  if (pathname.startsWith("/assets/")) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  createReadStream(filePath).pipe(res);
  return true;
}

function headersFromIncoming(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

function requestUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0]?.trim() || "http";
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host || `${host}:${port}`;
  const requestHost = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return new URL(req.url || "/", `${proto}://${requestHost}`);
}

async function sendFetchResponse(res, response, method) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;

  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  if (setCookies.length > 0) res.setHeader("set-cookie", setCookies);

  if (method === "HEAD" || !response.body) {
    res.end();
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = requestUrl(req);

    if (url.pathname === "/_paycrivo/web-health") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, service: "paycrivo-web" }));
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && await maybeServeStatic(req, res, url.pathname)) {
      return;
    }

    const init = {
      method: req.method,
      headers: headersFromIncoming(req),
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req;
      init.duplex = "half";
    }

    const response = await ssr.fetch(new Request(url, init), process.env, {});
    await sendFetchResponse(res, response, req.method);
  } catch (error) {
    console.error("[paycrivo-web] Request failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }
    res.end("<!doctype html><title>PayCrivo</title><h1>This page didn't load</h1>");
  }
});

server.listen(port, host, () => {
  console.log(`[paycrivo-web] Serving TanStack SSR on http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error("[paycrivo-web] Server failed", error);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`[paycrivo-web] Received ${signal}, shutting down.`);
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));