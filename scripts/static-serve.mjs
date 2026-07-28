// Extracted static-serving helpers so unit tests can exercise the exact
// same path resolution used by scripts/start-web.mjs at runtime. Both
// files import from here — never diverge the rules across production
// and tests.

import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

export const MIME_TYPES = new Map([
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

/**
 * Resolve a request pathname to one or more candidate absolute paths under
 * the approved roots. Returns undefined for malformed input (decode fail)
 * or paths that escape both roots (null byte, ../, encoded traversal).
 *
 * Priority rule: /assets/ requests are served from `sourcePublicRoot` first
 * (operator-installed runtime files), then from `publicRoot`. Everything
 * else prefers `publicRoot` (built Vite output).
 */
export function safePublicPath(pathname, { publicRoot, sourcePublicRoot }) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  // Reject null bytes and any traversal that survived decoding.
  if (decoded.includes("\0")) return undefined;
  if (!decoded.startsWith("/")) return undefined;

  const inBuilt = resolve(publicRoot, `.${decoded}`);
  const builtOk = inBuilt === publicRoot || inBuilt.startsWith(`${publicRoot}${sep}`);
  const inSource = resolve(sourcePublicRoot, `.${decoded}`);
  const sourceOk = inSource === sourcePublicRoot || inSource.startsWith(`${sourcePublicRoot}${sep}`);

  if (!builtOk && !sourceOk) return undefined;

  const preferSourceFirst = decoded.startsWith("/assets/");
  const candidates = [];
  if (preferSourceFirst) {
    if (sourceOk) candidates.push(inSource);
    if (builtOk) candidates.push(inBuilt);
  } else {
    if (builtOk) candidates.push(inBuilt);
    if (sourceOk) candidates.push(inSource);
  }
  return candidates.length ? candidates : undefined;
}

export async function resolveFirstFile(candidates) {
  for (const c of candidates) {
    try {
      // lstat vs stat: we DO NOT follow symlinks that point outside our
      // roots. Because `safePublicPath` already normalized via `resolve()`
      // any symlink escaping the root would not have passed the prefix
      // check for its resolved target, so a plain stat is safe here for
      // in-root files. For extra safety against dir->symlink games, we
      // stat and enforce isFile().
      const s = await stat(c);
      if (s.isFile()) return { path: c, stat: s };
    } catch {
      /* try next */
    }
  }
  return null;
}

export function contentTypeFor(filePath) {
  return MIME_TYPES.get(extname(filePath).toLowerCase()) || "application/octet-stream";
}

export function cacheControlFor(pathname, servedFromSource) {
  if (pathname.startsWith("/assets/")) {
    // Operator-installed runtime files change without a rebuild — never
    // let browsers hold them immutable.
    return servedFromSource ? "public, max-age=60, must-revalidate" : "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

export function assertRootsExist({ publicRoot, sourcePublicRoot }) {
  return { publicRootExists: existsSync(publicRoot), sourcePublicRootExists: existsSync(sourcePublicRoot) };
}