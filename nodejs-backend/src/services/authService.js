const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Account = require("../models/Account");
const Shop = require("../models/Shop");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Reservation = require("../models/Reservation");
const { getEnv } = require("../config/env");
const { DEFAULT_CURRENCY } = require("../config/currencies");
const { badRequest, unauthorized, forbidden, notFound, conflict } = require("../lib/errors");
const { signAccessToken, createOpaqueToken, hashToken } = require("../lib/tokens");
const { sendMail } = require("../lib/mailer");
const { withTransaction } = require("../lib/transaction");
const { slugify } = require("../lib/text");

const { ObjectId } = mongoose.Types;

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "11111111",
  "iloveyou",
  "admin123",
  "letmein1",
  "welcome1",
]);

function hashPassword(password) {
  return bcrypt.hash(password, getEnv().BCRYPT_ROUNDS);
}

// Compared against when no user matches, so login time doesn't reveal
// whether a username exists.
let dummyHash;
async function burnPasswordCheck(password) {
  dummyHash = dummyHash || (await bcrypt.hash("not-a-real-password", getEnv().BCRYPT_ROUNDS));
  await bcrypt.compare(password, dummyHash);
}

function assertPasswordPolicy(password, username) {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("Password must be at least 8 characters.", "WEAK_PASSWORD");
  }
  if (password.length > 128) throw badRequest("Password must be at most 128 characters.", "WEAK_PASSWORD");
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) {
    throw badRequest("That password is too easy to guess. Choose a less common one.", "WEAK_PASSWORD");
  }
  if (username && password.toLowerCase() === String(username).toLowerCase()) {
    throw badRequest("Password must not be the same as the username.", "WEAK_PASSWORD");
  }
}

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();

function authResponse(user, account, { roleForExpiry } = {}) {
  return {
    access_token: signAccessToken(user, { roleForExpiry }),
    token_type: "bearer",
    username: user.username,
    role: user.role,
    account_id: user.accountId || null,
    shop_id: user.shopId || null,
    business_code: account?.slug || null,
    is_platform_admin: Boolean(user.isPlatformAdmin),
  };
}

async function uniqueSlug(companyName, session) {
  const base = slugify(companyName) || "business";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 26)}-${Math.random().toString(36).slice(2, 6)}`;
    const taken = await Account.exists({ slug: candidate }).session(session || null);
    if (!taken) return candidate;
  }
  return `${base.slice(0, 20)}-${new ObjectId().toString().slice(-8)}`;
}

// Self-serve signup: owner, business, default shop and trial subscription are
// created in one transaction, so a failure can't leave an orphaned owner.
async function registerAccount({ username, password, email, company_name, shop_name, currency }) {
  const normalized = normalizeUsername(username);
  assertPasswordPolicy(password, normalized);

  const trialPlan = await Plan.findOne({ key: "trial" }).lean();
  if (!trialPlan) throw badRequest("Signups are not open yet: no trial plan is configured.", "NO_TRIAL_PLAN");

  const hashedPassword = await hashPassword(password);
  const env = getEnv();

  return withTransaction(async (session) => {
    const accountId = new ObjectId();
    const userId = new ObjectId();
    const subscriptionId = new ObjectId();
    const slug = await uniqueSlug(company_name, session);
    const trialDays = trialPlan.trialDays ?? env.TRIAL_DAYS;

    const [account] = await Account.create(
      [
        {
          _id: accountId,
          companyName: company_name,
          slug,
          ownerUserId: userId,
          subscriptionId,
          currency: currency || DEFAULT_CURRENCY,
          companyEmail: email || null,
        },
      ],
      { session }
    );
    const [user] = await User.create(
      [{ _id: userId, username: normalized, email: email || null, hashedPassword, role: "owner", accountId, lastLoginAt: new Date() }],
      { session }
    );
    const [shop] = await Shop.create([{ accountId, name: shop_name || `${company_name} - Main Shop` }], { session });
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
    await Subscription.create(
      [{ _id: subscriptionId, accountId, planId: trialPlan._id, status: "trialing", currentPeriodStart: new Date(), trialEndsAt }],
      { session }
    );

    return { ...authResponse(user, account), shop_id: shop._id, trial_ends_at: trialEndsAt };
  });
}

// Resolves a tenant login. Usernames are unique per business; the business
// code is only needed when the same username exists in more than one.
async function findTenantUser(username, businessCode) {
  const normalized = normalizeUsername(username);
  if (businessCode) {
    const account = await Account.findOne({ slug: String(businessCode).trim().toLowerCase() }).lean();
    if (!account) return { user: null, account: null };
    const user = await User.findOne({ accountId: account._id, username: normalized });
    return { user, account };
  }
  const candidates = await User.find({ username: normalized, accountId: { $ne: null } }).limit(2);
  if (candidates.length > 1) return { ambiguous: true };
  const user = candidates[0] || null;
  const account = user ? await Account.findById(user.accountId).lean() : null;
  return { user, account };
}

async function login({ username, password, business_code }) {
  const found = await findTenantUser(username, business_code);
  if (found.ambiguous) {
    throw conflict("This username is used by more than one business. Enter your business code.", "BUSINESS_CODE_REQUIRED");
  }
  const { user, account } = found;
  if (!user) {
    const platformUser = !business_code
      ? await User.findOne({ username: normalizeUsername(username), accountId: null, isPlatformAdmin: true })
      : null;
    if (platformUser && (await bcrypt.compare(password, platformUser.hashedPassword))) {
      throw forbidden("This is a platform admin account. Please use the admin login instead.", "PLATFORM_ADMIN_USE_ADMIN_LOGIN");
    }
    await burnPasswordCheck(password);
    throw unauthorized("Incorrect username or password.", "INVALID_CREDENTIALS");
  }
  if (!(await bcrypt.compare(password, user.hashedPassword))) {
    throw unauthorized("Incorrect username or password.", "INVALID_CREDENTIALS");
  }
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return authResponse(user, account);
}

async function adminLogin({ username, password }) {
  const users = await User.find({ username: normalizeUsername(username), isPlatformAdmin: true }).limit(2);
  const user = users.length === 1 ? users[0] : null;
  if (!user) {
    await burnPasswordCheck(password);
    throw unauthorized("Incorrect username or password.", "INVALID_CREDENTIALS");
  }
  if (!(await bcrypt.compare(password, user.hashedPassword))) {
    throw unauthorized("Incorrect username or password.", "INVALID_CREDENTIALS");
  }
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const account = user.accountId ? await Account.findById(user.accountId).lean() : null;
  // Platform sessions always get the admin-length expiry.
  return authResponse(user, account, { roleForExpiry: "admin" });
}

async function me(user) {
  const account = user.accountId ? await Account.findById(user.accountId).lean() : null;
  return {
    id: user._id,
    username: user.username,
    email: user.email || null,
    role: user.role,
    account_id: user.accountId || null,
    shop_id: user.shopId || null,
    business_code: account?.slug || null,
    company_name: account?.companyName || null,
    is_platform_admin: Boolean(user.isPlatformAdmin),
  };
}

async function setPassword(userId, password, username) {
  assertPasswordPolicy(password, username);
  const hashedPassword = await hashPassword(password);
  return User.findByIdAndUpdate(
    userId,
    {
      $set: { hashedPassword, passwordChangedAt: new Date(), resetTokenHash: null, resetTokenExpiresAt: null },
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );
}

// Changing your own password signs out every other session and returns a
// fresh token for this one.
async function changeOwnPassword(user, { current_password, new_password }) {
  const full = await User.findById(user._id);
  if (!full || !(await bcrypt.compare(current_password, full.hashedPassword))) {
    throw badRequest("Current password is incorrect.", "INVALID_CREDENTIALS");
  }
  const updated = await setPassword(full._id, new_password, full.username);
  const account = updated.accountId ? await Account.findById(updated.accountId).lean() : null;
  return authResponse(updated, account, { roleForExpiry: updated.isPlatformAdmin && !updated.accountId ? "admin" : undefined });
}

const GENERIC_RESET_MESSAGE =
  "If this account has an email address on file, a password reset link has been sent to it. Otherwise, ask your business owner or admin to reset your password.";

// Never reveals whether the account exists, and never returns the token.
async function requestPasswordReset({ username, business_code }) {
  const found = await findTenantUser(username, business_code);
  const user = found.ambiguous ? null : found.user;
  if (user && user.email) {
    const { raw, hash } = createOpaqueToken();
    await User.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: hash, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) } }
    );
    const env = getEnv();
    const base = env.PASSWORD_RESET_URL || `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password`;
    await sendMail({
      to: user.email,
      subject: "Reset your Rental Manager password",
      text: `Someone asked to reset the password for "${user.username}".\n\nOpen this link within 15 minutes to choose a new password:\n${base}?token=${raw}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }
  return { message: GENERIC_RESET_MESSAGE };
}

async function resetPasswordWithToken({ token, new_password }) {
  const user = await User.findOne({ resetTokenHash: hashToken(token), resetTokenExpiresAt: { $gt: new Date() } }).select(
    "+resetTokenHash +resetTokenExpiresAt"
  );
  if (!user) throw badRequest("This reset link is invalid or has expired. Request a new one.", "INVALID_RESET_TOKEN");
  await setPassword(user._id, new_password, user.username);
  return { message: "Password updated. You can now sign in." };
}

// ---- Team management (owner/admin, scoped to the caller's business) ----

async function assertShopInAccount(shopId, accountId) {
  if (!shopId) return null;
  const shop = await Shop.findOne({ _id: shopId, accountId, isActive: true }).select("_id").lean();
  if (!shop) throw badRequest("That shop doesn't exist or isn't active in this business.", "INVALID_SHOP");
  return shop._id;
}

async function listUsers(req) {
  return User.find({ accountId: req.tenant.accountId }).sort({ createdAt: 1 }).lean();
}

async function findTeamMember(req, { id, username }) {
  const filter = { accountId: req.tenant.accountId };
  if (id) {
    if (!mongoose.isValidObjectId(id)) throw notFound("User not found.");
    filter._id = id;
  } else {
    filter.username = normalizeUsername(username);
  }
  const user = await User.findOne(filter);
  if (!user) throw notFound("User not found.");
  return user;
}

function assertCanManage(req, target) {
  if (target.role === "owner") throw forbidden("The account owner can't be changed here.", "OWNER_PROTECTED");
  if (String(target._id) === String(req.user._id)) {
    throw badRequest("Use your own profile to change your account.", "SELF_MANAGEMENT");
  }
}

async function createUser(req, { username, password, role = "staff", shop_id, email }) {
  const normalized = normalizeUsername(username);
  assertPasswordPolicy(password, normalized);
  const shopId = await assertShopInAccount(shop_id, req.tenant.accountId);
  const exists = await User.exists({ accountId: req.tenant.accountId, username: normalized });
  if (exists) throw conflict("That username is already taken in this business.", "USERNAME_TAKEN");
  const user = await User.create({
    username: normalized,
    email: email || null,
    hashedPassword: await hashPassword(password),
    role,
    accountId: req.tenant.accountId,
    shopId: role === "staff" ? shopId : null,
  });
  return user.toObject();
}

async function updateUser(req, target, { role, shop_id, email, username }) {
  assertCanManage(req, target);
  if (username !== undefined) {
    const normalized = normalizeUsername(username);
    if (normalized !== target.username) {
      const exists = await User.exists({ accountId: req.tenant.accountId, username: normalized });
      if (exists) throw conflict("That username is already taken in this business.", "USERNAME_TAKEN");
      target.username = normalized;
    }
  }
  if (role !== undefined) target.role = role;
  if (email !== undefined) target.email = email || null;
  if (shop_id !== undefined) target.shopId = await assertShopInAccount(shop_id, req.tenant.accountId);
  if (target.role !== "staff") target.shopId = null;
  // Role or shop changes take effect on the next request (the user is loaded
  // fresh each time); bumping the version also ends existing sessions.
  target.tokenVersion = (target.tokenVersion || 0) + 1;
  await target.save();
  return target.toObject();
}

async function setUserPassword(req, target, newPassword) {
  assertCanManage(req, target);
  return setPassword(target._id, newPassword, target.username);
}

async function deleteUser(req, target) {
  assertCanManage(req, target);
  await Reservation.deleteMany({ accountId: req.tenant.accountId, createdByUserId: target._id });
  await User.deleteOne({ _id: target._id, accountId: req.tenant.accountId });
}

module.exports = {
  registerAccount,
  login,
  adminLogin,
  me,
  changeOwnPassword,
  requestPasswordReset,
  resetPasswordWithToken,
  listUsers,
  findTeamMember,
  createUser,
  updateUser,
  setUserPassword,
  deleteUser,
  assertPasswordPolicy,
  hashPassword,
  GENERIC_RESET_MESSAGE,
};
