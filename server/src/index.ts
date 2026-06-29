import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { emailRouter } from "./routes/email.js";
import { ordersRouter } from "./routes/orders.js";
import { walletsRouter } from "./routes/wallets.js";
import { supportRouter } from "./routes/support.js";
import { liveRouter } from "./routes/live.js";
import { adminRouter } from "./routes/admin/index.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl (no origin) and configured frontends.
      if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes("*")) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true, service: "paycrivo-backend" }));

// Customer API
app.use("/api/auth", authRouter);
app.use("/api/email", emailRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/wallets", walletsRouter);
app.use("/api/support", supportRouter);
app.use("/api/live", liveRouter);

// Admin API
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`PayCrivo backend listening on http://localhost:${env.port}`);
});