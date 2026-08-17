const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("./database/initDatabase");
const { runBackup, startScheduledBackups } = require("./utils/backup");
const { loginLimiter } = require("./utils/rateLimiter");
const { requireAuth } = require("./middleware/authMiddleware");

const employeeRoutes = require("./routes/employees");
const authRoutes = require("./routes/auth");
const payrollRoutes = require("./routes/payroll");
const financeRoutes = require("./routes/finance");
const cashbookRoutes = require("./routes/cashbook");
const ledgerRoutes = require("./routes/ledger");

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.use("/api/auth/login", loginLimiter);

app.use((req, res, next) => {
  if (req.method === "DELETE" || req.path.endsWith("/generate")) {
    runBackup("pre-write: " + req.method + " " + req.path);
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// API routes under /api prefix to avoid collision with SPA routes
app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", service: "Blue Farm Finance System" });
});

app.get("/api", (req, res) => {
    res.json({ success: true, message: "Blue Farm Finance API is Running" });
});

// /api/auth (login, logout) stays public — everything else under /api
// requires a valid session token from a successful login (see
// middleware/authMiddleware.js). Without this, any of the routes below
// could previously be called directly (curl/Postman/typed URL) by anyone
// who could reach the server, without ever going through the Login screen.
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth);

app.use("/api/employees", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/cashbook", cashbookRoutes);
app.use("/api/ledger", ledgerRoutes);

// Serve the built React frontend
const distPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(distPath));

// SPA Fallback — serve index.html for any client-side route
// Must use app.use (not app.get) for wildcard path compatibility
app.use((req, res) => {
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(404).json({ success: false, message: "API not found" });
  }
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send("Frontend not built. Run: cd client && npm run build");
  }
});

app.listen(PORT, () => {
    console.log("✅ Server running on port " + PORT);
    startScheduledBackups();
});
