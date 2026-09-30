const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { output } = require("./generate");
const Plan = require("../../src/models/Plan");
const User = require("../../src/models/User");
const { hashPassword } = require("../../src/services/authService");
const { FEATURE_KEYS, LIMIT_KEYS } = require("../../src/config/planCatalog");

function environment(values, name = "Marzi Local - Demo") {
  return { id: crypto.randomUUID(), name, values: Object.entries(values).map(([key, value]) => ({ key, value: String(value ?? ""), type: /password|token|secret/.test(key) ? "secret" : "default", enabled: true })), _postman_variable_scope: "environment", _postman_exported_at: new Date().toISOString() };
}
function readEnvironment(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(JSON.parse(fs.readFileSync(file, "utf8")).values.map((v) => [v.key, v.value]));
}
function writeEnvironment(file, values) {
  // Saved credentials allow login; short-lived access tokens are never exported.
  const clean = { ...values };
  for (const key of ["token", "platform_token", "staff_token", "reset_token", "stripe_webhook_secret"]) clean[key] = "";
  fs.writeFileSync(file, JSON.stringify(environment(clean), null, 2) + "\n");
}
async function bootstrap(previous = {}) {
  fs.mkdirSync(output, { recursive: true });
  // Insert missing catalog entries only. Never overwrite a user's plan edits.
  const { PLANS } = require("../seedPlans");
  for (const p of PLANS) if (!(await Plan.exists({ key: p.key }))) await Plan.create(p);
  let demoPlan = await Plan.findOne({ key: "postman-demo" });
  if (!demoPlan) demoPlan = await Plan.create({ key: "postman-demo", name: "Private Postman Demo", description: "Zero-price test plan; no payment provider involved.", price: 0, currency: "INR", isPublic: false, limits: Object.fromEntries(LIMIT_KEYS.map((k) => [k, -1])), features: Object.fromEntries(FEATURE_KEYS.map((k) => [k, true])) });
  let platformName = previous.platform_username;
  let platformPassword = previous.platform_password;
  const existing = platformName && await User.findOne({ username: platformName, accountId: null, isPlatformAdmin: true });
  if (!existing) {
    platformName = `postman.platform.${crypto.randomBytes(5).toString("hex")}`;
    platformPassword = `Demo!${crypto.randomBytes(18).toString("base64url")}`;
    await User.create({ username: platformName, hashedPassword: await hashPassword(platformPassword), role: "admin", accountId: null, isPlatformAdmin: true });
  }
  return { base_url: "http://localhost:5000", demo_password: `Demo!${crypto.randomBytes(12).toString("base64url")}`, alternate_password: `Change!${crypto.randomBytes(12).toString("base64url")}`, ...previous, platform_username: platformName, platform_password: platformPassword, demo_plan_id: String(demoPlan._id), enable_reset: "false", enable_stripe: "false", enable_webhook: "false", stripe_plan_key: "starter", reset_token: "", stripe_webhook_secret: "" };
}
module.exports = { bootstrap, environment, readEnvironment, writeEnvironment, environmentFile: path.join(output, "Marzi-Local.postman_environment.json") };
