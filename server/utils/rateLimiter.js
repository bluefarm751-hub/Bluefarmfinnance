// Lightweight brute-force protection for the login endpoint.
// No external dependency — just an in-memory counter per (IP + username).
// Resets automatically after the window passes.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 8;

const attempts = new Map(); // key -> { count, firstAt }

function keyFor(req) {
  const username = (req.body && req.body.username) || "unknown";
  return `${req.ip}:${String(username).toLowerCase().trim()}`;
}

function loginLimiter(req, res, next) {
  const key = keyFor(req);
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && now - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
  }

  const current = attempts.get(key);
  if (current && current.count >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((WINDOW_MS - (now - current.firstAt)) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many login attempts. Please try again in ${waitMin} minute(s).`,
    });
  }

  next();
}

// Call after a FAILED login attempt to count it against the limit.
function recordFailure(req) {
  const key = keyFor(req);
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

// Call after a SUCCESSFUL login to clear the counter for that user.
function clearAttempts(req) {
  attempts.delete(keyFor(req));
}

module.exports = { loginLimiter, recordFailure, clearAttempts };
