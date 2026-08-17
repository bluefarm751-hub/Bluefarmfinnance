// Minimal in-memory session store. Each successful login gets a random,
// unguessable token; every /api/* request (other than /api/auth/login) must
// send it back as `Authorization: Bearer <token>` or it is rejected with
// 401. This is what stops the API being opened/called directly (curl,
// Postman, a second browser tab typing the URL, etc.) without logging in
// first — previously every route under /api was wide open to anyone who
// could reach the server, regardless of the Login screen.
//
// Tokens live only in server memory, so they are cleared whenever the
// server restarts (everyone simply has to log in again — expected for a
// desktop/LAN app like this).

const crypto = require("crypto");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours of inactivity
const sessions = new Map(); // token -> { username, name, role, farm, expiresAt }

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    username: user.username,
    name: user.name,
    role: user.role,
    farm: user.farm,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  // Sliding expiry — an active user never gets logged out mid-work.
  s.expiresAt = Date.now() + SESSION_TTL_MS;
  return s;
}

function revokeSession(token) {
  if (token) sessions.delete(token);
}

// Periodic sweep so long-dead sessions don't sit in memory forever.
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions.entries()) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 30 * 60 * 1000).unref();

module.exports = { createSession, getSession, revokeSession };
