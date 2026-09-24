// Shared test harness: an in-memory MongoDB replica set (so transactions run
// exactly as on Atlas), the real Express app, and small API helpers.
const os = require("os");
const fs = require("fs");
const path = require("path");

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "rental-api-test-"));
Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  JWT_SECRET: "test-secret-that-is-long-enough-for-hs256",
  BCRYPT_ROUNDS: "4",
  AUTH_RATE_LIMIT_MAX: "100000",
  RATE_LIMIT_MAX: "100000",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: path.join(TMP, "storage"),
  LEGACY_UPLOADS_DIR: path.join(TMP, "legacy"),
  FRONTEND_URL: "http://app.test",
  MONGODB_URI: "mongodb://placeholder",
});
fs.mkdirSync(process.env.LEGACY_UPLOADS_DIR, { recursive: true });

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { resetEnv } = require("../src/config/env");

let replSet;

async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri("rental_test");
  resetEnv();
  await mongoose.connect(process.env.MONGODB_URI);
  require("../src/models/loadAll");
  for (const name of mongoose.modelNames()) await mongoose.model(name).init();
}

async function stopDb() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

// Empties every collection but keeps indexes, so unique constraints still apply.
async function resetDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

function buildApp(envOverrides = {}) {
  Object.assign(process.env, envOverrides);
  resetEnv();
  const { createApp } = require("../src/app");
  return createApp();
}

async function seedPlans({ trial = {}, internal = {} } = {}) {
  const Plan = require("../src/models/Plan");
  const trialPlan = await Plan.create({
    key: "trial",
    name: "Free Trial",
    price: 0,
    trialDays: 14,
    isPublic: false,
    limits: { maxShops: 2, maxEquipment: 50, maxCustomers: 200, maxStaffUsers: 2, maxActiveRentalsPerMonth: 100, ...(trial.limits || {}) },
    features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, customBranding: true, ...(trial.features || {}) },
  });
  const pro = await Plan.create({
    key: "pro",
    name: "Pro",
    price: 49,
    stripePriceId: "price_pro",
    limits: { maxShops: -1, maxEquipment: -1, maxCustomers: -1, maxStaffUsers: -1, maxActiveRentalsPerMonth: -1, ...(internal.limits || {}) },
    features: { advancedReports: true, analytics: true, maintenance: true, paymentQrCode: true, customBranding: true },
  });
  return { trialPlan, pro };
}

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${counter}`;
}

// Registers a business and returns a small client bound to its owner.
async function registerBusiness(app, { username, company, password = "correct-horse-9", email } = {}) {
  const res = await request(app)
    .post("/auth/register")
    .send({ username: username || unique("owner"), password, company_name: company || unique("Company "), email });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client(app, res.body.access_token, { ...res.body, password });
}

function client(app, token, info = {}) {
  const call = (method, url, shopId) => {
    let req = request(app)[method](url).set("Authorization", `Bearer ${token}`);
    if (shopId) req = req.set("X-Shop-Id", String(shopId));
    return req;
  };
  return {
    token,
    info,
    get: (url, shopId) => call("get", url, shopId),
    post: (url, shopId) => call("post", url, shopId),
    put: (url, shopId) => call("put", url, shopId),
    delete: (url, shopId) => call("delete", url, shopId),
  };
}

async function login(app, username, password, businessCode) {
  const res = await request(app).post("/auth/login").send({ username, password, business_code: businessCode });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return client(app, res.body.access_token, res.body);
}

// Creates a category + equipment item in the owner's active shop.
async function createEquipment(owner, { name, rentPerDay = 100, stock = 5, purchase = 0, deposit = 0 } = {}) {
  const cat = await owner.post("/categories").send({ name: unique("Cat ") });
  if (cat.status !== 201) throw new Error(`category failed: ${JSON.stringify(cat.body)}`);
  const eq = await owner.post("/equipment").send({
    name: name || unique("Item "),
    rent_per_day: rentPerDay,
    stock_count: stock,
    purchase_price_per_unit: purchase,
    deposit_amount: deposit,
    category_id: cat.body.id,
  });
  if (eq.status !== 201) throw new Error(`equipment failed: ${JSON.stringify(eq.body)}`);
  return eq.body;
}

async function createCustomer(owner, { name, phone } = {}) {
  const res = await owner.post("/customers").send({ name: name || unique("Customer "), phone: phone || `98${String(Date.now()).slice(-6)}${counter++}` });
  if (res.status !== 201) throw new Error(`customer failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

// Moves a rental's start date into the past, to simulate elapsed days.
async function backdateRental(id, days) {
  const Rental = require("../src/models/Rental");
  await Rental.updateOne({ _id: id }, { $set: { rentedAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000 + 60 * 1000) } }).setOptions({
    skipTenantCheck: true,
  });
}

// A real 4x4 PNG, so uploads go through sharp exactly as in production.
async function pngBuffer(color = "#3366ff", size = 4) {
  const sharp = require("sharp");
  return sharp({ create: { width: size, height: size, channels: 3, background: color } }).png().toBuffer();
}

module.exports = {
  TMP,
  request,
  startDb,
  stopDb,
  resetDb,
  buildApp,
  seedPlans,
  registerBusiness,
  client,
  login,
  createEquipment,
  createCustomer,
  backdateRental,
  pngBuffer,
  unique,
};
