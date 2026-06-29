import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2021") {
    return res.status(503).json({
      error: "Database migration required. Please run the deployment update script and try again.",
      code: "DATABASE_MIGRATION_REQUIRED",
    });
  }
  console.error("[error]", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}