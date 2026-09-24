// Grants (or revokes) access to the web-dashboard's admin console,
// independent of tenant role. Use it on your own operator logins only.
//
// Usage:
//   node scripts/promotePlatformAdmin.js <username> [--business <code>] [--revoke]
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Account = require("../src/models/Account");
const { resolveUser } = require("./_userLookup");

async function main() {
  const username = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const revoke = process.argv.includes("--revoke");
  const businessIndex = process.argv.indexOf("--business");
  const business = businessIndex !== -1 ? process.argv[businessIndex + 1] : null;
  if (!username) {
    console.error("Usage: node scripts/promotePlatformAdmin.js <username> [--business <code>] [--revoke]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const user = await resolveUser({ User, Account, username, business });
  if (user) {
    if (revoke && user.isPlatformAdmin && (await User.countDocuments({ isPlatformAdmin: true })) <= 1) {
      console.error(`"${user.username}" is the last platform admin — refusing to revoke. Promote another user first.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    await User.updateOne({ _id: user._id }, { $set: { isPlatformAdmin: !revoke }, $inc: { tokenVersion: 1 } });
    console.log(`"${user.username}" is ${revoke ? "no longer" : "now"} a platform admin.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
