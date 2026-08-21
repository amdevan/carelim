import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TODO: Import and mount route modules
// import authRoutes from "./routes/auth";
// app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Carelim Backend running on port ${PORT}`);
});

export default app;
