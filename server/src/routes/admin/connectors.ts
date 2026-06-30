// Admin → Settings → Wallet Connector Scripts.
// View / replace the production connector files, toggle connectors on/off, and
// verify the public URLs return 200. Hardened: only a fixed whitelist of keys
// maps to fixed absolute paths (no path traversal, no arbitrary writes), file
// type is enforced (.js / .json), size is capped, and every action is audited.
import { Router } from "express";
import express from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { logAdminAction } from "../../lib/log.js";
import { env } from "../../lib/env.js";
import { getConnectorFlags, patchConnectorFlags } from "../../lib/runtimeSettings.js";

export const adminConnectorsRouter = Router();
adminConnectorsRouter.use(requireAdmin);
// Connector files can be larger than the global 1mb JSON limit.
adminConnectorsRouter.use(express.json({ limit: "5mb" }));

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

type ConnectorKey = "meta" | "tron" | "tron-settings";

const FILES: Record<ConnectorKey, { absPath: string; ext: ".js" | ".json"; publicPath: string; label: string }> = {
  meta: {
    absPath: path.join(env.connector.dir, "meta-effectapi.js"),
    ext: ".js",
    publicPath: "/assets/meta-effectapi.js",
    label: "Meta / EVM connector (meta-effectapi.js)",
  },
  tron: {
    absPath: path.join(env.connector.dir, "tronEleven.js"),
    ext: ".js",
    publicPath: "/assets/tronEleven.js",
    label: "Tron connector (tronEleven.js)",
  },
  "tron-settings": {
    absPath: env.connector.tronSettingsPath,
    ext: ".json",
    publicPath: "/tron-settings.json",
    label: "Tron settings (tron-settings.json)",
  },
};

function isKey(k: string): k is ConnectorKey {
  return k === "meta" || k === "tron" || k === "tron-settings";
}

async function statFile(absPath: string) {
  try {
    const s = await fs.stat(absPath);
    return { exists: true, size: s.size, modifiedAt: s.mtime.toISOString() };
  } catch {
    return { exists: false, size: 0, modifiedAt: null as string | null };
  }
}

adminConnectorsRouter.get("/", async (_req, res) => {
  const flags = await getConnectorFlags();
  const entries = await Promise.all(
    (Object.keys(FILES) as ConnectorKey[]).map(async (key) => {
      const f = FILES[key];
      const meta = await statFile(f.absPath);
      return {
        key,
        label: f.label,
        ext: f.ext,
        publicPath: f.publicPath,
        publicUrl: `${env.publicBaseUrl}${f.publicPath}`,
        enabled: key === "meta" ? flags.metaEnabled : key === "tron" ? flags.tronEnabled : true,
        ...meta,
      };
    }),
  );
  res.json({ files: entries, flags });
});

adminConnectorsRouter.get("/:key/content", async (req, res) => {
  const key = req.params.key;
  if (!isKey(key)) return res.status(404).json({ error: "Unknown connector file" });
  try {
    const content = await fs.readFile(FILES[key].absPath, "utf8");
    res.json({ key, content });
  } catch {
    res.json({ key, content: "", missing: true });
  }
});

const replaceSchema = z.object({ content: z.string().min(1).max(MAX_BYTES) });

adminConnectorsRouter.put("/:key", requireRole("super_admin"), async (req, res) => {
  const key = req.params.key;
  if (!isKey(key)) return res.status(404).json({ error: "Unknown connector file" });
  const parsed = replaceSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "File content is required (max 4MB)." });
  const f = FILES[key];
  const content = parsed.data.content;
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_BYTES) return res.status(413).json({ error: "File exceeds the 4MB limit." });

  // Type validation: JSON must parse; JS must not be empty / not be JSON-only.
  if (f.ext === ".json") {
    try { JSON.parse(content); } catch { return res.status(400).json({ error: "Content must be valid JSON." }); }
  } else if (!/[;(){}=]/.test(content)) {
    return res.status(400).json({ error: "Content does not look like a JavaScript connector file." });
  }

  try {
    await fs.mkdir(path.dirname(f.absPath), { recursive: true });
    // Atomic write: temp file in the same dir then rename.
    const tmp = `${f.absPath}.tmp-${Date.now()}`;
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, f.absPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Write failed";
    await logAdminAction({ adminId: req.admin!.sub, action: "connector_replace_failed", targetType: "connector", targetId: key, metadata: { error: msg } });
    return res.status(500).json({ error: `Could not write connector file: ${msg}` });
  }
  await logAdminAction({ adminId: req.admin!.sub, action: "connector_replace", targetType: "connector", targetId: key, metadata: { bytes } });
  const meta = await statFile(f.absPath);
  res.json({ ok: true, key, ...meta });
});

const toggleSchema = z.object({ metaEnabled: z.boolean().optional(), tronEnabled: z.boolean().optional() });

adminConnectorsRouter.patch("/flags", requireRole("super_admin"), async (req, res) => {
  const parsed = toggleSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid flags" });
  const flags = await patchConnectorFlags(parsed.data);
  await logAdminAction({ adminId: req.admin!.sub, action: "connector_toggle", targetType: "connector", metadata: parsed.data });
  res.json({ ok: true, flags });
});

adminConnectorsRouter.get("/verify", async (_req, res) => {
  const results = await Promise.all(
    (Object.keys(FILES) as ConnectorKey[]).map(async (key) => {
      const url = `${env.publicBaseUrl}${FILES[key].publicPath}`;
      try {
        const r = await fetch(url, { method: "GET" });
        return { key, url, status: r.status, ok: r.ok };
      } catch (e) {
        return { key, url, status: 0, ok: false, error: e instanceof Error ? e.message : "fetch failed" };
      }
    }),
  );
  res.json({ results });
});