import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { authRouter } from "./modules/auth";
import { adminAuthHandler } from "./modules/admin-auth";
import { doctorsRouter } from "./modules/doctors";
import { tenantsRouter } from "./modules/tenants";
import { dashboardRouter } from "./modules/dashboard";
import { authenticate, requireSuperAdmin } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 4000;

// --- Database (Prisma 7 requires driver adapter) ---
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- Middleware ---
app.set("trust proxy", 1);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// --- Public routes ---
// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected", timestamp: new Date().toISOString() });
  }
});

// Auth (login/refresh verify their own rate limits and tokens)
app.use("/api/auth", authRouter());

// SaaS platform login (AdminUser) — public, self rate-limited
app.post("/api/admin-auth", adminAuthHandler());

// --- Protected routes: every request below requires a valid JWT and runs
// inside AsyncLocalStorage tenant context (Prisma auto-filters by tenant) ---
const api = express.Router();
api.use(authenticate);

api.use("/tenants", requireSuperAdmin, tenantsRouter());
api.use("/doctors", doctorsRouter());
api.use("/dashboard", dashboardRouter());

app.use("/api", api);

// --- 404 for unknown API routes ---
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Error handler ---
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- Graceful shutdown ---
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// --- Start ---
app.listen(PORT, () => {
  console.log(`Carelim Backend (full API) running on port ${PORT}`);
});

export default app;
