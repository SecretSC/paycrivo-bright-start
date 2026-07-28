// Admin → Wallet Runtime.
// Manages the universal wallet-runtime script (one file for every asset /
// every network) that replaces the old tronEleven.js / meta-effectapi.js
// routing. Only super_admin can change the active path, and paths are
// strictly validated to /assets/*.js|.mjs on the server (no external URLs,
// no protocol-relative, no traversal, no filesystem paths).
import { Router } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { logAdminAction } from "../../lib/log.js";
import { env } from "../../lib/env.js";
import {
  getWalletRuntime,
  patchWalletRuntime,
  validateRuntimeScriptPath,
} from "../../lib/runtimeSettings.js";

export const adminWalletRuntimeRouter = Router();
adminWalletRuntimeRouter.use(requireAdmin);

function resolveAssetPath(publicPath: string): string {
  // publicPath is validated to start with /assets/ already.
  const relative = publicPath.replace(/^\/assets\//, "");
  // path.normalize + startsWith prevents traversal even if validation is bypassed.
  const abs = path.resolve(env.connector.dir, relative);
  if (!abs.startsWith(path.resolve(env.connector.dir) + path.sep)) {
    return path.resolve(env.connector.dir, "__invalid__");
  }
  return abs;
}

async function probe(activeScript: string) {
  try {
    const abs = resolveAssetPath(activeScript);
    const stat = await fs.stat(abs);
    if (!stat.isFile() || stat.size === 0) {
      return { status: "missing" as const, error: "File is empty or not a regular file." };
    }
    return { status: "ok" as const, size: stat.size, modifiedAt: stat.mtime.toISOString() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "not found";
    return { status: "missing" as const, error: msg };
  }
}

adminWalletRuntimeRouter.get("/", async (_req, res) => {
  const wr = await getWalletRuntime();
  const p = await probe(wr.activeScript);
  res.json({
    walletRuntime: wr,
    probe: p,
    publicUrl: `${env.publicBaseUrl}${wr.activeScript}`,
  });
});

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  activeScript: z.string().optional(),
});

adminWalletRuntimeRouter.patch("/", requireRole("super_admin"), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: req.admin!.sub };
  if (typeof parsed.data.enabled === "boolean") patch.enabled = parsed.data.enabled;
  if (typeof parsed.data.activeScript === "string") {
    const v = validateRuntimeScriptPath(parsed.data.activeScript);
    if (!v.ok) return res.status(400).json({ error: v.error });
    patch.activeScript = v.value;
  }
  const next = await patchWalletRuntime(patch);
  await logAdminAction({
    adminId: req.admin!.sub,
    action: "wallet_runtime_update",
    targetType: "wallet_runtime",
    metadata: { enabled: next.enabled, activeScript: next.activeScript },
  });
  res.json({ ok: true, walletRuntime: next });
});

adminWalletRuntimeRouter.post("/test", async (req, res) => {
  const wr = await getWalletRuntime();
  const p = await probe(wr.activeScript);
  const now = new Date().toISOString();
  const next = await patchWalletRuntime({
    lastStatus: p.status === "ok" ? "ok" : "missing",
    lastCheckedAt: now,
    lastError: p.status === "ok" ? null : p.error ?? "not found",
  });
  await logAdminAction({
    adminId: req.admin!.sub,
    action: "wallet_runtime_test",
    targetType: "wallet_runtime",
    metadata: { status: p.status, activeScript: wr.activeScript },
  });
  res.json({ ok: true, walletRuntime: next, probe: p });
});