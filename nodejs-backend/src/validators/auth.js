const { email, z, objectId, optionalText, requiredText } = require("../lib/validate");
const { CURRENCY_CODES } = require("../config/currencies");

const username = z
  .string({ error: "is required" })
  .trim()
  .min(1, "is required")
  .max(64, "must be at most 64 characters")
  .regex(/^[a-zA-Z0-9._@+-]+$/, "may only contain letters, numbers and . _ @ + -");
const password = z.string({ error: "is required" }).min(1, "is required").max(128, "must be at most 128 characters");
const businessCode = z.string().trim().toLowerCase().max(40).optional().or(z.literal("").transform(() => undefined));

const register = z.object({
  username,
  password,
  email,
  company_name: requiredText(120),
  shop_name: optionalText(120),
  currency: z.enum(CURRENCY_CODES, { error: "is not a supported currency" }).optional(),
});

const login = z.object({ username: z.string({ error: "is required" }).trim().min(1, "is required").max(200), password, business_code: businessCode });
const adminLogin = z.object({ username: z.string().trim().min(1, "is required").max(200), password });

const forgotPassword = z.object({ username: z.string().trim().min(1, "is required").max(200), business_code: businessCode });
// reset_code/username belong to the removed code-based flow; they are
// accepted here only so the controller can answer with a clear message.
const resetPassword = z.object({
  token: z.string().min(16, "is invalid").max(200).optional(),
  new_password: password.optional(),
  reset_code: z.unknown().optional(),
  username: z.unknown().optional(),
});
const changePassword = z.object({ current_password: password, new_password: password });

const role = z.enum(["admin", "staff"], { error: 'must be "admin" or "staff"' });
const createUser = z.object({ username, password, role: role.default("staff"), shop_id: objectId.nullish(), email });
const updateUser = z.object({ username: username.optional(), role: role.optional(), shop_id: objectId.nullish(), email });
const setPassword = z.object({ new_password: password });
const updateRole = z.object({ role });
const updateByUsername = z.object({ new_username: username.optional(), new_password: password.optional() });
const usernameParams = z.object({ username: z.string().trim().min(1).max(64) });

module.exports = {
  register,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  changePassword,
  createUser,
  updateUser,
  setPassword,
  updateRole,
  updateByUsername,
  usernameParams,
};
