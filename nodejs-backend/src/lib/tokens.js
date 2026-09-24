const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { getEnv } = require("../config/env");

function expiryFor(role) {
  const env = getEnv();
  return role === "staff" ? env.JWT_EXPIRES_IN_STAFF : env.JWT_EXPIRES_IN;
}

// `tv` (token version) lets a password change or forced logout revoke every
// token issued before it.
function signAccessToken(user, { roleForExpiry } = {}) {
  const env = getEnv();
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: expiryFor(roleForExpiry || user.role),
  });
}

function verifyAccessToken(token) {
  const decoded = jwt.verify(token, getEnv().JWT_SECRET, { algorithms: ["HS256"] });
  // Tokens issued before this change carried `{ id }` instead of `{ sub }`.
  return { userId: decoded.sub || decoded.id, tokenVersion: decoded.tv || 0 };
}

function createOpaqueToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

module.exports = { signAccessToken, verifyAccessToken, createOpaqueToken, hashToken };
