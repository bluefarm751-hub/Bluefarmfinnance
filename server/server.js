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
const { requireAuth, requireAdmin } = require("./middleware/authMiddleware");

// ============================================================
// ROUTES
// ============================================================
const employeeRoutes = require("./routes/employees");
const authRoutes = require("./routes/auth");
const payrollRoutes = require("./routes/payroll");
const financeRoutes = require("./routes/finance");
const cashbookRoutes = require("./routes/cashbook");
const ledgerRoutes = require("./routes/ledger");
const adminRoutes = require("./routes/admin");
const { startScheduledBackups } = require("./utils/backupPostgres");

// ============================================================
// APP
// ============================================================
const app = express();

const PORT = Number(process.env.PORT || 3001);

// Render (and most hosts) put the app behind a reverse proxy. Without this,
// req.ip and req.secure reflect the proxy's connection, not the real
// visitor — which quietly breaks the login rate limiter (every user would
// appear to share the proxy's IP) and any "is this HTTPS" checks.
app.set("trust proxy", 1);

// ============================================================
// CORS
// ============================================================
// The client is served from this same Express server (see the static
// `dist` mount below), so normal use of the app never needs cross-origin
// requests at all. Previously this defaulted to `origin: true`, which
// reflects and allows ANY origin — combined with `credentials: true` that
// let any website's JavaScript make authenticated-looking requests to this
// API from a visitor's browser. In production we now default to blocking
// cross-origin requests entirely unless CORS_ORIGIN is explicitly set
// (comma-separated list) for a legitimate separate frontend deployment.
// Local development (Vite dev server on a different port) keeps the old
// permissive behavior automatically.
const isProd = process.env.NODE_ENV === "production";
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : isProd
        ? false
        : true,
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
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Force HTTPS on every future request once a browser has seen this over
  // HTTPS (Render terminates TLS at the proxy, so req.secure only works
  // correctly now that "trust proxy" is set above).
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
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
// Payroll, Finance, Cash Book and Ledger are admin-only in the UI (the
// Sidebar shows them locked for non-admin "farm" accounts) — requireAdmin
// enforces that same rule on the server, so a non-admin session token
// can't be used to call these endpoints directly and bypass the UI lock.
app.use("/api/payroll", requireAdmin, payrollRoutes);
app.use("/api/finance", requireAdmin, financeRoutes);
app.use("/api/cashbook", requireAdmin, cashbookRoutes);
app.use("/api/ledger", requireAdmin, ledgerRoutes);
// Backup status/trigger — admin only, see routes/admin.js.
app.use("/api/admin", requireAdmin, adminRoutes);

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

    // Automated database backups (JSON snapshot, gzipped, uploaded to
    // Cloudinary when configured). Runs shortly after startup and then
    // every 6 hours. Deliberately NOT awaited — a slow/failed first
    // backup should never block the server from coming up and serving
    // requests; failures are logged and visible via
    // GET /api/admin/backup-status.
    startScheduledBackups();
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