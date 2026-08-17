const express = require("express");
const router = express.Router();
const db = require("../database/database");
const { hashPassword, verifyPassword, isHashed } = require("../utils/passwordHash");
const { recordFailure, clearAttempts } = require("../utils/rateLimiter");
const { createSession, revokeSession } = require("../utils/sessionStore");

// LOGIN
router.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  db.get("SELECT * FROM users WHERE LOWER(username)=?", [username], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    if (!row || !verifyPassword(password, row.password)) {
      // Count this against the brute-force limiter — this was previously
      // never called, so the login rate limit never actually triggered.
      recordFailure(req);
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // Successful login — clear this user's failed-attempt counter.
    clearAttempts(req);

    // Legacy plain-text passwords get silently upgraded to a salted hash on
    // their next successful login (comment in passwordHash.js promised this,
    // but nothing ever actually called hashPassword() to do it).
    if (!isHashed(row.password)) {
      const upgraded = hashPassword(password);
      db.run("UPDATE users SET password=? WHERE id=?", [upgraded, row.id], (upErr) => {
        if (upErr) console.log("Password upgrade failed:", upErr.message);
      });
    }

    const user = { username: row.username, name: row.name, role: row.role, farm: row.farm };
    const token = createSession(user);

    res.json({ success: true, token, user });
  });
});

// LOGOUT — invalidate the session token so it can't be reused.
router.post("/logout", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  revokeSession(token);
  res.json({ success: true });
});

module.exports = router;
