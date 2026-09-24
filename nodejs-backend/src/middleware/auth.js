const User = require("../models/User");
const { verifyAccessToken } = require("../lib/tokens");
const { unauthorized, forbidden } = require("../lib/errors");
const { asyncHandler } = require("../lib/http");

// Verifies the bearer token and loads the user fresh from the database on every
// request, so role changes, deletions and password resets take effect at once.
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw unauthorized();

  let claims;
  try {
    claims = verifyAccessToken(header.slice(7));
  } catch {
    throw unauthorized("Your session has expired. Please log in again.", "TOKEN_INVALID");
  }

  const user = await User.findById(claims.userId).select("-hashedPassword").lean();
  if (!user) throw unauthorized("Your session has expired. Please log in again.", "TOKEN_INVALID");
  if ((user.tokenVersion || 0) !== claims.tokenVersion) {
    throw unauthorized("Your session has expired. Please log in again.", "TOKEN_REVOKED");
  }
  req.user = user;
  next();
});

function requirePlatformAdmin(req, _res, next) {
  if (!req.user?.isPlatformAdmin) {
    return next(forbidden("This account isn't authorized for the admin console.", "PLATFORM_ADMIN_REQUIRED"));
  }
  next();
}

module.exports = { authenticate, requirePlatformAdmin };
