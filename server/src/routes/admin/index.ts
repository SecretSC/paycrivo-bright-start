import { Router } from "express";
import { adminAuthRouter } from "./auth.js";
import { adminDashboardRouter } from "./dashboard.js";
import { adminSupportRouter } from "./support.js";
import { adminUsersRouter } from "./users.js";
import { adminOrdersRouter } from "./orders.js";
import { adminRewardsRouter } from "./rewards.js";
import { adminSettingsRouter } from "./settings.js";
import { adminLogsRouter } from "./logs.js";
import { adminSmtpRouter } from "./smtp.js";
import { adminConnectorsRouter } from "./connectors.js";

export const adminRouter = Router();

adminRouter.use("/", adminAuthRouter); // /login, /logout, /me
adminRouter.use("/", adminDashboardRouter); // /stats, /overview, /live-sessions
adminRouter.use("/support", adminSupportRouter);
adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/rewards", adminRewardsRouter);
adminRouter.use("/settings", adminSettingsRouter);
adminRouter.use("/smtp", adminSmtpRouter);
adminRouter.use("/connectors", adminConnectorsRouter);
adminRouter.use("/logs", adminLogsRouter);