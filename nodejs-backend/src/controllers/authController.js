const auth = require("../services/authService");
const { userDto } = require("../dto");
const { badRequest } = require("../lib/errors");
const { wrapController } = require("../lib/http");

module.exports = wrapController({
  async register(req, res) {
    res.status(201).json(await auth.registerAccount(req.body));
  },
  async login(req, res) {
    res.json(await auth.login(req.body));
  },
  async adminLogin(req, res) {
    res.json(await auth.adminLogin(req.body));
  },
  async me(req, res) {
    res.json(await auth.me(req.user));
  },
  async changePassword(req, res) {
    res.json(await auth.changeOwnPassword(req.user, req.body));
  },
  async forgotPassword(req, res) {
    res.json(await auth.requestPasswordReset(req.body));
  },
  // Kept for older app builds: same generic behaviour, the code is never returned.
  async legacyRequestReset(req, res) {
    res.json(await auth.requestPasswordReset({ username: req.params.username }));
  },
  async resetPassword(req, res) {
    if (req.body.reset_code !== undefined) {
      throw badRequest("Reset codes are no longer supported. Use the link sent by email, or ask your admin to reset your password.", "RESET_METHOD_REMOVED");
    }
    if (!req.body.token) throw badRequest("token: is required", "VALIDATION_ERROR");
    if (!req.body.new_password) throw badRequest("new_password: is required", "VALIDATION_ERROR");
    res.json(await auth.resetPasswordWithToken(req.body));
  },
  async listUsers(req, res) {
    res.json((await auth.listUsers(req)).map(userDto));
  },
  async createUser(req, res) {
    res.status(201).json(userDto(await auth.createUser(req, req.body)));
  },
  async updateUser(req, res) {
    const target = await auth.findTeamMember(req, { id: req.params.id });
    res.json(userDto(await auth.updateUser(req, target, req.body)));
  },
  async updateUserRole(req, res) {
    const target = await auth.findTeamMember(req, { id: req.params.id });
    res.json(userDto(await auth.updateUser(req, target, { role: req.body.role })));
  },
  async setUserPassword(req, res) {
    const target = await auth.findTeamMember(req, { id: req.params.id });
    await auth.setUserPassword(req, target, req.body.new_password);
    res.json({ message: "Password updated. The user has been signed out everywhere." });
  },
  async deleteUser(req, res) {
    const target = await auth.findTeamMember(req, { id: req.params.id });
    await auth.deleteUser(req, target);
    res.json({ message: "User deleted successfully." });
  },
  async deleteUserByUsername(req, res) {
    const target = await auth.findTeamMember(req, { username: req.params.username });
    await auth.deleteUser(req, target);
    res.json({ message: "User deleted successfully." });
  },
  async updateUserByUsername(req, res) {
    const target = await auth.findTeamMember(req, { username: req.params.username });
    if (req.body.new_password) await auth.setUserPassword(req, target, req.body.new_password);
    const updated = req.body.new_username ? await auth.updateUser(req, target, { username: req.body.new_username }) : target;
    res.json({ message: "User updated successfully.", username: updated.username });
  },
});
