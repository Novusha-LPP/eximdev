require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://0.0.0.0:3000" }));
app.use(express.json());
app.use(morgan("dev"));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/scorecards", require("./routes/scorecards"));

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Database & Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/suraj_scorecard";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
