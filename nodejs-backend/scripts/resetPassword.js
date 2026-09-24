// Directly sets a user's password (e.g. a locked-out platform admin). Runs
// with database access, so it bypasses the email reset flow. Every existing
// session for the user is signed out.
//
// Usage:
//   node scripts/resetPassword.js <username> <newPassword> [--business <code>]
//   (use --business when the username exists in more than one business;
//    omit it for platform admins)
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Account = require("../src/models/Account");
const { resolveUser } = require("./_userLookup");

async function main() {
  const [username, newPassword] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const businessIndex = process.argv.indexOf("--business");
  const business = businessIndex !== -1 ? process.argv[businessIndex + 1] : null;
  if (!username || !newPassword) {
    console.error("Usage: node scripts/resetPassword.js <username> <newPassword> [--business <code>]");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const { hashPassword } = require("../src/services/authService");
  const user = await resolveUser({ User, Account, username, business });
  if (user) {
    await User.updateOne(
      { _id: user._id },
      { $set: { hashedPassword: await hashPassword(newPassword), passwordChangedAt: new Date() }, $inc: { tokenVersion: 1 }, $unset: { resetCode: "" } }
    );
    console.log(`Password updated for "${user.username}". Existing sessions were signed out.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
