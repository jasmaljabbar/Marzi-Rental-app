const { Router } = require("express");
const c = require("../controllers/authController");
const v = require("../validators/auth");
const { authenticate } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { requireWritableSubscription, enforceLimit } = require("../middleware/subscription");
const { adminOnly } = require("../middleware/rbac");
const { validate, idParams } = require("../lib/validate");

function authRoutes(limiters) {
  const router = Router();

  router.post("/register", limiters.auth, validate({ body: v.register }), c.register);
  router.post("/login", limiters.auth, validate({ body: v.login }), c.login);
  router.post("/admin/login", limiters.auth, validate({ body: v.adminLogin }), c.adminLogin);
  router.post("/forgot-password", limiters.passwordReset, validate({ body: v.forgotPassword }), c.forgotPassword);
  router.post("/request-reset/:username", limiters.passwordReset, c.legacyRequestReset);
  router.post("/reset-password", limiters.passwordReset, validate({ body: v.resetPassword }), c.resetPassword);

  router.get("/me", authenticate, c.me);
  router.put("/me/password", limiters.auth, authenticate, validate({ body: v.changePassword }), c.changePassword);

  // Team management: owner/admin of the caller's own business only.
  const team = [authenticate, requireTenant, adminOnly];
  const teamWrite = [...team, requireWritableSubscription];
  router.get("/users", ...team, c.listUsers);
  router.post("/users", ...teamWrite, enforceLimit("staffUsers"), validate({ body: v.createUser }), c.createUser);
  // Older clients add team members through /signup.
  router.post("/signup", ...teamWrite, enforceLimit("staffUsers"), validate({ body: v.createUser }), c.createUser);
  router.put("/users/:id", ...teamWrite, validate({ params: idParams, body: v.updateUser }), c.updateUser);
  router.put("/users/:id/role", ...teamWrite, validate({ params: idParams, body: v.updateRole }), c.updateUserRole);
  router.put("/users/:id/password", ...teamWrite, validate({ params: idParams, body: v.setPassword }), c.setUserPassword);
  router.delete("/users/:id", ...teamWrite, validate({ params: idParams }), c.deleteUser);
  router.delete("/users/username/:username", ...teamWrite, validate({ params: v.usernameParams }), c.deleteUserByUsername);
  router.put("/users/username/:username", ...teamWrite, validate({ params: v.usernameParams, body: v.updateByUsername }), c.updateUserByUsername);

  return router;
}

module.exports = authRoutes;
