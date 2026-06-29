import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { DEFAULT_SETTINGS } from "../lib/settings.js";

// Public, unauthenticated settings the website needs before render.
// Only safe, non-sensitive values are exposed here.
export const settingsRouter = Router();

type GeneralSettings = { defaultTheme?: string };
type StoredSettings = { general?: GeneralSettings };

settingsRouter.get("/public", async (_req, res) => {
  try {
    const row = await prisma.settings.findUnique({ where: { id: "global" } });
    const settings = ((row?.json as StoredSettings) ?? DEFAULT_SETTINGS) as StoredSettings;
    const dt = settings.general?.defaultTheme;
    res.json({ defaultTheme: dt === "light" ? "light" : "dark" });
  } catch {
    // If settings cannot be read, advertise the seeded default.
    res.json({ defaultTheme: "dark" });
  }
});
