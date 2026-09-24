// Finds one user by username for CLI scripts. Usernames are unique per
// business, so a business code is needed when the name exists in several.
async function resolveUser({ User, Account, username, business }) {
  const normalized = String(username).toLowerCase().trim();
  let filter = { username: normalized };
  if (business) {
    const account = await Account.findOne({ slug: String(business).toLowerCase() });
    if (!account) {
      console.error(`No business with code "${business}".`);
      return null;
    }
    filter = { ...filter, accountId: account._id };
  }
  const users = await User.find(filter).limit(3);
  if (users.length === 0) {
    console.error(`No user found with username "${username}".`);
    return null;
  }
  if (users.length > 1) {
    console.error(`"${username}" exists in more than one business. Re-run with --business <code>.`);
    return null;
  }
  return users[0];
}

module.exports = { resolveUser };
