import { prisma } from "./prisma.js";

export async function logAdminAction(args: {
  adminId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
}) {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId: args.adminId ?? null,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        metadataJson: (args.metadata as object) ?? undefined,
      },
    });
  } catch (e) {
    console.error("logAdminAction failed", e);
  }
}