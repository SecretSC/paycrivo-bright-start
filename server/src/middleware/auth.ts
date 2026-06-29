import type { Request, Response, NextFunction } from "express";
import { verifyCustomer, verifyAdmin, type CustomerToken, type AdminToken } from "../lib/jwt.js";
import type { AdminRole } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: CustomerToken;
      admin?: AdminToken;
    }
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = bearer(req);
  const decoded = token ? verifyCustomer(token) : null;
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });
  req.customer = decoded;
  next();
}

// Optional customer — attaches if present, never blocks.
export function optionalCustomer(req: Request, _res: Response, next: NextFunction) {
  const token = bearer(req);
  const decoded = token ? verifyCustomer(token) : null;
  if (decoded) req.customer = decoded;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = bearer(req);
  const decoded = token ? verifyAdmin(token) : null;
  if (!decoded) return res.status(401).json({ error: "Admin unauthorized" });
  req.admin = decoded;
  next();
}

// Role gate — super_admin always allowed.
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: "Admin unauthorized" });
    if (req.admin.role === "super_admin" || roles.includes(req.admin.role)) return next();
    return res.status(403).json({ error: "Forbidden: insufficient role" });
  };
}