const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ============================================================
// DATABASE INITIALIZATION
// ============================================================
const initDatabase = require("./database/initDatabase");
const initCashbook = require("./database/initCashbook");
const initLedger = require("./database/initLedger");

// ============================================================
// UTILITIES
// ============================================================
const { loginLimiter } = require("./utils/rateLimiter");
const { requireAuth } = require("./middleware/authMiddleware");

// ============================================================
// ROUTES
// ============================================================
const employeeRoutes = require("./routes/employees");
const authRoutes = require("./routes/auth");
const payrollRoutes = require("./routes/payroll");
const financeRoutes = require("./routes/finance");
const cashbookRoutes = require("./routes/cashbook");
const ledgerRoutes = require("./routes/ledger");

// ============================================================
// APP
// ============================================================
const app = express();

const PORT = Number(process.env.PORT || 3001);

// ============================================================
// CORS
// ============================================================
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

// ============================================================
// BODY PARSER
// ============================================================
app.use(express.json({ limit: "10mb" }));

// ============================================================
// SECURITY HEADERS
// ============================================================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// ============================================================
// LOGIN RATE LIMITER
// ============================================================
app.use("/api/auth/login", loginLimiter);


// ============================================================
// UPLOADS
// ============================================================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "Blue Farm Finance System",
  });
});

// ============================================================
// API STATUS
// ============================================================
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Blue Farm Finance API is Running",
  });
});

// ============================================================
// AUTH ROUTES
// PUBLIC
// ============================================================
app.use("/api/auth", authRoutes);

// ============================================================
// PROTECTED API ROUTES
// ============================================================
app.use("/api", requireAuth);

app.use("/api/employees", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/cashbook", cashbookRoutes);
app.use("/api/ledger", ledgerRoutes);

// ============================================================
// FRONTEND
// ============================================================
const distPath = path.join(__dirname, "..", "client", "dist");

app.use(express.static(distPath));

// ============================================================
// SPA FALLBACK
// ============================================================
app.use((req, res) => {
  if (
    req.headers.accept &&
    req.headers.accept.includes("application/json")
  ) {
    return res.status(404).json({
      success: false,
      message: "API not found",
    });
  }

  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(500).send(
    "Frontend not built. Run: cd client && npm run build"
  );
});

// ============================================================
// START SERVER AFTER DATABASE INITIALIZATION
// ============================================================
async function startServer() {
  try {
    await initDatabase();
    await initCashbook();
    await initLedger();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("======================================");
      console.log("✅ Blue Farm Finance System");
      console.log(`✅ Server running on port ${PORT}`);
      console.log("✅ PostgreSQL mode enabled");
      console.log("======================================");
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
}

const shutdown = async (signal) => {
  console.log(`
${signal} received. Shutting down...`);
  try {
    const db = require("./database/database");
    await db.end();
  } finally {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer();