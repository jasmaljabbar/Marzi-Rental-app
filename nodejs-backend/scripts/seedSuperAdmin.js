// Creates (or repairs) exactly one platform-admin login — the account that
// signs in at /auth/admin/login and manages the /platform back office. Zero
// dependency on any Account/Shop/Plan record: this is what makes admin
// access recoverable no matter what happened to tenant data (e.g. after
// wipeDatabase.js, or if the only admin's account was somehow lost).
// Safe to re-run: idempotent unless --reset-password is passed.
//
// Password, in priority order:
//   1. SUPER_ADMIN_PASSWORD env var (recommended for real deployments —
//      source it from a secrets manager, not a shell history)
//   2. --password <value> CLI flag
//   3. Interactive prompt (only when run from a real terminal)
//   4. Auto-generated random password, printed once — the non-interactive
//      fallback so this script can still run unattended (e.g. chained from
//      wipeDatabase.js). Rotate it immediately via scripts/resetPassword.js.
//
// Usage:
//   node scripts/seedSuperAdmin.js [username] [--password <value>] [--reset-password]
require("dotenv").config();
const crypto = require("crypto");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../src/models/User");

const DEFAULT_USERNAME = "superadmin";
const MIN_PASSWORD_LENGTH = 8;

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

function generatePassword() {
  // 24 random bytes -> 32-char base64url string: no dependency on any
  // external password-generation library, plenty of entropy for a one-off
  // recovery credential the operator is expected to rotate immediately.
  return crypto.randomBytes(24).toString("base64url");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const resetPassword = args.includes("--reset-password");
  const passwordFlagIndex = args.indexOf("--password");
  const password = passwordFlagIndex !== -1 ? args[passwordFlagIndex + 1] : null;
  const positional = args.filter((a, i) => a !== "--reset-password" && a !== password && i !== passwordFlagIndex);
  const username = positional[0] || process.env.SUPER_ADMIN_USERNAME || DEFAULT_USERNAME;
  return { username, password, resetPassword };
}

async function resolvePassword(cliPassword) {
  if (process.env.SUPER_ADMIN_PASSWORD) return { password: process.env.SUPER_ADMIN_PASSWORD, source: "SUPER_ADMIN_PASSWORD env var" };
  if (cliPassword) return { password: cliPassword, source: "--password flag" };
  if (process.stdin.isTTY) {
    const typed = await ask("Set a password for the super admin (leave blank to auto-generate): ");
    if (typed.trim()) return { password: typed.trim(), source: "typed at prompt" };
  }
  return { password: generatePassword(), source: "auto-generated" };
}

async function main() {
  const { username, password: cliPassword, resetPassword } = parseArgs(process.argv);
  const normalizedUsername = username.toLowerCase().trim();

  await mongoose.connect(process.env.MONGODB_URI);

  // Platform admins have no business, so they are looked up among accountId: null users.
  const existing = await User.findOne({ username: normalizedUsername, accountId: null });
  if (existing && existing.isPlatformAdmin && !resetPassword) {
    console.log(`"${existing.username}" already exists and is a platform admin — nothing to do.`);
    console.log("Pass --reset-password to rotate their password, or run scripts/promotePlatformAdmin.js on a different user.");
    await mongoose.disconnect();
    return;
  }

  const { password, source } = await resolvePassword(cliPassword);
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);

  if (existing) {
    existing.hashedPassword = hashedPassword;
    existing.isPlatformAdmin = true;
    existing.tokenVersion = (existing.tokenVersion || 0) + 1;
    // Deliberately not touching accountId/shopId here — if this user already
    // belongs to a tenant (dual-role), that membership is left intact.
    await existing.save();
    console.log(`Updated existing user "${existing.username}" — now a platform admin with a new password.`);
  } else {
    await User.create({
      username: normalizedUsername,
      hashedPassword,
      role: "admin",
      accountId: null,
      shopId: null,
      isPlatformAdmin: true,
    });
    console.log(`Created platform admin "${normalizedUsername}".`);
  }

  if (source === "auto-generated") {
    console.log("\n==================== SUPER ADMIN CREDENTIALS ====================");
    console.log(`  username: ${normalizedUsername}`);
    console.log(`  password: ${password}`);
    console.log("  This password was auto-generated and is shown only once.");
    console.log("  Rotate it now via: node scripts/resetPassword.js <username> <newPassword>");
    console.log("===================================================================\n");
  } else {
    console.log(`Password source: ${source}.`);
  }

  console.log(`Log in at POST /auth/admin/login with username "${normalizedUsername}".`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
