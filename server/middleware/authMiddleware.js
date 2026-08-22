const { getSession } = require("../utils/sessionStore");

// Protects every route it's mounted on: requires a valid
// `Authorization: Bearer <token>` header from a successful /api/auth/login.
// Without this, anyone who can reach the server (browser typing a URL
// directly, curl, Postman, another device on the LAN) could call any
// finance/employee/cashbook endpoint without ever logging in.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const session = getSession(token);

  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or not logged in. Please log in again." });
  }

  req.user = session;
  next();
}

// Requires an authenticated ADMIN session. Must run after requireAuth (or
// anywhere req.user has already been set) — it does NOT check the token
// itself, only the role on the session that requireAuth already validated.
//
// Why this exists: the Sidebar hides Finance / Cash Book / Ledger / salary
// actions from non-admin ("farm") accounts, but that is a UI convenience
// only. Before this middleware, a logged-in non-admin user could call
// those same API endpoints directly (browser dev tools, curl, Postman)
// with their own valid session token and read or modify financial data
// even though the app never shows them that screen. This middleware makes
// the server itself enforce the same rule the UI already implies, so
// hiding a button is no longer the only thing standing between a
// low-privilege account and admin-only data.
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Session expired or not logged in. Please log in again." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "This action requires administrator access." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
