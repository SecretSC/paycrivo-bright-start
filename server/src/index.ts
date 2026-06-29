import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./lib/env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { emailRouter } from "./routes/email.js";
import { settingsRouter } from "./routes/settings.js";
import { ordersRouter } from "./routes/orders.js";
import { walletsRouter } from "./routes/wallets.js";
import { supportRouter } from "./routes/support.js";
import { liveRouter } from "./routes/live.js";
import { rewardsRouter } from "./routes/rewards.js";
import { adminRouter } from "./routes/admin/index.js";

const app = express();

// Required behind Apache/Nginx so proxied HTTPS requests and rate limits use
// the real client IP instead of crashing on X-Forwarded-For.
app.set("trust proxy", 1);

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
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true, service: "paycrivo-backend" }));

// Customer API
app.use("/api/auth", authRouter);
app.use("/api/email", emailRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/wallets", walletsRouter);
app.use("/api/support", supportRouter);
app.use("/api/live", liveRouter);
app.use("/api/rewards", rewardsRouter);

// Admin API
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`PayCrivo backend listening on http://localhost:${env.port}`);
});