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

module.exports = { requireAuth };
