// Salted password hashing using Node's built-in crypto (scrypt) — no extra
// dependency to install. Stored format: "scrypt:<salt-hex>:<hash-hex>"
// Old plain-text passwords (from before this fix) are detected automatically
// and upgraded to a hash the next time that user logs in successfully.

const crypto = require("crypto");

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith("scrypt:");
}

function verifyPassword(plain, stored) {
  if (!isHashed(stored)) {
    // Legacy plain-text row — compare directly (case-sensitive, exact).
    return String(plain) === String(stored);
  }
  const [, salt, hash] = stored.split(":");
  const check = crypto.scryptSync(String(plain), salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
  } catch (e) {
    return false;
  }
}

module.exports = { hashPassword, isHashed, verifyPassword };
