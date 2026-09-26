const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const h = require("./helpers");

describe("resource contracts", () => {
  let app;
  let owner;
  before(async () => {
    await h.startDb();
    app = h.buildApp();
  });
  after(h.stopDb);
  beforeEach(async () => {
    await h.resetDb();
    await h.seedPlans();
    owner = await h.registerBusiness(app);
  });

  it("categories: create, rename, reorder, archive, restore, delete", async () => {
    const a = (await owner.post("/categories").send({ name: "Alpha", icon: "Drill" })).body;
    const b = (await owner.post("/categories").send({ name: "Beta" })).body;
    assert.equal((await owner.post("/categories").send({ name: "  alpha " })).status, 409, "case-insensitive duplicate");
    assert.equal((await owner.post("/categories").send({ name: "X", icon: "NotAnIcon" })).status, 400);
    assert.equal((await owner.put(`/categories/${a.id}`).send({ name: "Alpha 2" })).body.name, "Alpha 2");
    await owner.post("/categories/reorder").send({ ordered_ids: [b.id, a.id] });
    assert.deepEqual((await owner.get("/categories")).body.map((c) => c.name), ["Beta", "Alpha 2"]);
    assert.equal((await owner.post(`/categories/${b.id}/archive`)).body.is_archived, true);
    assert.equal((await owner.get("/categories?include_archived=true")).body.length, 1);
    assert.equal((await owner.post(`/categories/${b.id}/restore`)).body.is_archived, false);
    await owner.post("/equipment").send({ name: "Uses A", rent_per_day: 1, category_id: a.id });
    assert.equal((await owner.delete(`/categories/${a.id}`)).status, 409);
    assert.equal((await owner.delete(`/categories/${b.id}`)).status, 200);
  });

  it("equipment: list, search, paginate, duplicate, archive and delete rules", async () => {
    const first = await h.createEquipment(owner, { name: "Concrete Mixer", purchase: 10 });
    await h.createEquipment(owner, { name: "Drill" });
    const page = await owner.get("/equipment?page=1&page_size=1");
    assert.equal(page.body.length, 1);
    assert.equal(page.headers["x-total-count"], "2");
    assert.equal(page.headers["x-total-pages"], "2");
    assert.equal((await owner.get("/equipment?search=mix")).body[0].name, "Concrete Mixer");
    assert.equal((await owner.get("/equipment?search=.*")).body.length, 0, "search input is not a regex");
    const copy = await owner.post(`/equipment/${first.id}/duplicate`);
    assert.equal(copy.body.name, "Concrete Mixer (Copy)");
    assert.equal(copy.body.stock_count, 0);

    const customer = await h.createCustomer(owner);
    const r = (await owner.post("/rentals").send({ customer_id: customer.id, equipment_id: first.id })).body;
    assert.equal((await owner.post(`/equipment/${first.id}/archive`)).status, 409, "in active rental");
    await owner.post(`/rentals/${r.id}/complete`).send({});
    assert.equal((await owner.delete(`/equipment/${first.id}`)).body.code, "EQUIPMENT_HAS_HISTORY");
    assert.equal((await owner.post(`/equipment/${first.id}/archive`)).body.is_archived, true);
    assert.equal((await owner.delete(`/equipment/${copy.body.id}`)).status, 200);
  });

  it("customers: update, phone lookup, archive, statement PDF, delete rules", async () => {
    const c = await h.createCustomer(owner, { name: "Pat", phone: "9875550100" });
    assert.equal((await owner.get("/customers/9875550100")).body.id, c.id, "lookup by normalised phone");
    assert.equal((await owner.get(`/customers/${c.id}`)).body.name, "Pat", "lookup by id");
    assert.equal((await owner.put(`/customers/${c.id}`).send({ address: "12 Main St" })).body.address, "12 Main St");
    assert.equal((await owner.get("/customers?search=555")).body.length, 1);
    const eq = await h.createEquipment(owner);
    await owner.post("/rentals").send({ customer_id: c.id, equipment_id: eq.id });
    assert.equal((await owner.delete(`/customers/${c.id}`)).body.code, "CUSTOMER_HAS_ACTIVE_RENTALS");
    const withStats = (await owner.get("/customers?include_stats=true")).body.find((x) => x.id === c.id);
    assert.equal(withStats.stats.active_rentals, 1);
    assert.equal(withStats.stats.risk, "low-risk");
    const pdf = await owner.get(`/customers/${c.id}/statement/pdf`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers["content-type"], "application/pdf");
    assert.equal((await owner.post(`/customers/${c.id}/archive`)).body.is_archived, true);
    const fresh = await h.createCustomer(owner);
    assert.equal((await owner.delete(`/customers/${fresh.id}`)).status, 200);
  });

  it("expenses: CRUD, archive, validation and recurring generation without duplicates", async () => {
    const e = await owner.post("/expenses").send({ category: "Fuel", amount: "12.35", payment_mode: "UPI" });
    assert.equal(e.status, 201);
    assert.equal(e.body.amount, 12.35);
    assert.equal((await owner.post("/expenses").send({ category: "Fuel", amount: -5 })).status, 400);
    assert.equal((await owner.put(`/expenses/${e.body.id}`).send({ amount: 20 })).body.amount, 20);
    assert.equal((await owner.post(`/expenses/${e.body.id}/archive`)).body.is_archived, true);
    await owner.post(`/expenses/${e.body.id}/restore`);

    const t = await owner.post("/expenses/recurring").send({ category: "Rent", amount: 1000, day_of_month: 1 });
    assert.equal(t.status, 201);
    assert.equal((await owner.post("/expenses/recurring").send({ category: "Rent", amount: 1, day_of_month: 31 })).status, 400);
    await Promise.all([owner.get("/expenses"), owner.get("/expenses"), owner.get("/expenses")]);
    const list = (await owner.get("/expenses")).body;
    assert.equal(list.filter((x) => x.recurring_template_id === t.body.id).length, 1, "exactly one per month");
    assert.equal((await owner.put(`/expenses/recurring/${t.body.id}`).send({ is_active: false })).body.is_active, false);
    assert.equal((await owner.get("/expenses/recurring")).body.length, 1);
    assert.equal((await owner.delete(`/expenses/recurring/${t.body.id}`)).status, 200);
    assert.equal((await owner.delete(`/expenses/${e.body.id}`)).status, 200);
  });

  it("reservations: hold, conflict with details, transfer with notice, release", async () => {
    await owner.post("/auth/users").send({ username: "desk2", password: "desk2-pass-1" });
    const colleague = await h.login(app, "desk2", "desk2-pass-1");
    const eq = await h.createEquipment(owner, { stock: 2 });
    const c1 = await h.createCustomer(owner, { name: "First" });
    const c2 = await h.createCustomer(owner, { name: "Second" });

    const hold = await owner.post("/reservations").send({ customer_id: c1.id, equipment_id: eq.id, quantity: 2 });
    assert.equal(hold.status, 201);
    const clash = await colleague.post("/reservations").send({ customer_id: c2.id, equipment_id: eq.id, quantity: 1 });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.conflict.customer_name, "First");
    assert.equal(clash.body.available_for_you, 0);

    const moved = await colleague.post(`/reservations/${hold.body.id}/transfer`).send({ to_customer_id: c2.id });
    assert.equal(moved.body.customer_id, c2.id);
    const notices = (await owner.get("/reservations/notices")).body;
    assert.equal(notices.length, 1);
    assert.match(notices[0].message, /moved to Second's order/);
    assert.equal((await owner.post(`/reservations/notices/${notices[0].id}/ack`)).status, 200);
    assert.equal((await owner.get("/reservations")).body.length, 1);
    await colleague.delete(`/reservations/customer/${c2.id}`);
    assert.equal((await owner.get("/reservations")).body.length, 0);
  });

  it("shops: create within limit, protect staffed shops, delete only empty ones", async () => {
    const branch = (await owner.post("/shops").send({ name: "Branch" })).body;
    assert.equal((await owner.post("/shops").send({ name: "Third" })).status, 403, "trial allows 2 shops");
    await owner.post("/auth/users").send({ username: "pinned", password: "pinned-pass-1", shop_id: branch.id });
    assert.equal((await owner.put(`/shops/${branch.id}`).send({ is_active: false })).body.code, "SHOP_HAS_STAFF");
    const summary = await owner.get(`/shops/${branch.id}/summary`);
    assert.equal(summary.body.name, "Branch");
    await h.createCustomer(owner);
    assert.equal((await owner.delete(`/shops/${owner.info.shop_id}`)).body.code, "SHOP_NOT_EMPTY");
  });

  it("account: company details, logo gating, currency validation, usage", async () => {
    const res = await owner.put("/account/company").send({ company_name: "Renamed", default_tax_rate_percent: 18, currency: "USD" });
    assert.equal(res.body.company_name, "Renamed");
    assert.equal(res.body.default_tax_rate_percent, 18);
    assert.equal((await owner.put("/account/company").send({ currency: "XXX" })).status, 400);
    const logo = await owner.post("/upload?kind=logo").attach("file", await h.pngBuffer(), { filename: "l.png", contentType: "image/png" });
    const withLogo = await owner.put("/account/company").send({ logo_url: logo.body.url });
    assert.ok(withLogo.body.logo_url.includes("/files/"));
    const usage = await owner.get("/account/usage");
    assert.equal(usage.body.shops.used, 1);
    const me = await owner.get("/account/me");
    assert.equal(me.body.plan.key, "trial");
  });

  it("settings: per-shop keys, rejected invalid values, QR code files", async () => {
    assert.equal((await owner.put("/settings/max_discount_percent").send({ value: "250" })).status, 400);
    assert.equal((await owner.put("/settings/max_discount_percent").send({ value: "100" })).body.value, "100");
    assert.equal((await owner.get("/settings/max_discount_percent")).body.value, "100");
    assert.equal((await owner.put("/settings/bad key").send({ value: "1" })).status, 400);
    const qr = await owner.post("/upload?kind=qr_code").attach("file", await h.pngBuffer(), { filename: "q.png", contentType: "image/png" });
    const saved = await owner.put("/settings/qr_code").send({ value: qr.body.url });
    assert.ok(saved.body.value.includes("/files/"));
    assert.equal((await owner.get("/settings")).body.length, 2);
  });

  it("rentals: search by customer, equipment or invoice number", async () => {
    const c = await h.createCustomer(owner, { name: "Searchable Sam" });
    const eq = await h.createEquipment(owner, { name: "Tile Cutter" });
    const other = await h.createEquipment(owner, { name: "Ladder" });
    await owner.post("/rentals").send({ customer_id: c.id, equipment_id: eq.id });
    await owner.post("/rentals").send({ customer_id: (await h.createCustomer(owner)).id, equipment_id: other.id });
    assert.equal((await owner.get("/rentals?status=Active&search=sam")).body.length, 1);
    assert.equal((await owner.get("/rentals?status=Active&search=tile")).body[0].equipment.name, "Tile Cutter");
    assert.equal((await owner.get("/rentals?status=Active")).body.length, 2);
  });

  it("invoices: list and search", async () => {
    const c = await h.createCustomer(owner, { name: "Invoice Person" });
    const eq = await h.createEquipment(owner);
    const r = (await owner.post("/rentals").send({ customer_id: c.id, equipment_id: eq.id })).body;
    await owner.post(`/rentals/${r.id}/complete`).send({});
    assert.equal((await owner.get("/invoices?search=invoice person")).body.length, 1);
    assert.equal((await owner.get("/invoices?search=INV-")).body.length, 1);
    assert.equal((await owner.get("/invoices?payment_status=Pending")).body[0].customer.name, "Invoice Person");
    assert.equal((await owner.get(`/invoices/${eq.id}`)).status, 404);
  });

  it("equipment sales: list, summary, follow-up payment", async () => {
    const c = await h.createCustomer(owner);
    const eq = await h.createEquipment(owner, { stock: 3, purchase: 50 });
    const sale = (await owner.post(`/equipment/${eq.id}/sell`).send({ customer_id: c.id, quantity: 2, selling_price: 40 })).body;
    assert.equal(sale.gain_loss, -20);
    assert.equal((await owner.post(`/equipment/sales/${sale.id}/payment`).send({ amount_paid: 100 })).body.payment_status, "Paid");
    assert.equal((await owner.get("/equipment/sales")).body[0].customer.name, c.name);
    const summary = (await owner.get("/equipment/sales/summary")).body;
    assert.equal(summary.total_revenue, 80);
    assert.equal(summary.by_equipment[0].units_sold, 2);
  });

  it("platform plans: create, update, block deleting plans in use", async () => {
    const User = require("../src/models/User");
    await User.create({ username: "root", hashedPassword: await bcrypt.hash("root-password-1", 4), role: "admin", isPlatformAdmin: true });
    const login = await h.request(app).post("/auth/admin/login").send({ username: "root", password: "root-password-1" });
    const admin = h.client(app, login.body.access_token);
    const created = await admin.post("/platform/plans").send({ key: "gold", name: "Gold", price: 99, limits: { maxShops: 5 } });
    assert.equal(created.status, 201);
    assert.equal(created.body.limits.maxShops, 5);
    assert.equal(created.body.limits.maxEquipment, 50, "unspecified limits keep catalog defaults");
    assert.equal((await admin.post("/platform/plans").send({ key: "bad", name: "Bad", price: 1, limits: { nonsense: 1 } })).status, 400);
    assert.equal((await admin.put(`/platform/plans/${created.body.id}`).send({ features: { apiAccess: true } })).body.features.apiAccess, true);
    const trial = (await admin.get("/platform/plans")).body.find((p) => p.key === "trial");
    assert.equal((await admin.delete(`/platform/plans/${trial.id}`)).status, 409);
    assert.equal((await admin.delete(`/platform/plans/${created.body.id}`)).status, 200);
    assert.equal((await admin.get("/platform/dashboard")).body.total_accounts, 1);
    assert.equal((await admin.post(`/platform/accounts/${owner.info.account_id}/suspend`)).status, 200);
    assert.equal((await owner.post("/categories").send({ name: "X" })).status, 402);
    assert.equal((await admin.post(`/platform/accounts/${owner.info.account_id}/reactivate`)).status, 200);
    assert.equal((await admin.get(`/platform/accounts/${owner.info.account_id}`)).body.users.length, 1);
  });

  it("serves the public catalog with every list clients need", async () => {
    const res = await h.request(app).get("/catalog");
    assert.ok(res.body.currencies.length > 0);
    assert.ok(res.body.category_icons.includes("Drill"));
    assert.ok(res.body.payment_methods.includes("UPI"));
    assert.equal((await h.request(app).get("/plans")).body[0].key, "pro");
  });

  it("allows any localhost origin outside production, and only listed origins in production", async () => {
    const devPreflight = await h.request(app).options("/health").set("Origin", "http://localhost:46765").set("Access-Control-Request-Method", "GET");
    assert.equal(devPreflight.status, 204);
    assert.equal(devPreflight.headers["access-control-allow-origin"], "http://localhost:46765");
    assert.equal((await h.request(app).get("/health").set("Origin", "https://evil.example")).status, 403);

    const prod = h.buildApp({ NODE_ENV: "production", CORS_ORIGINS: "https://app.example.com" });
    assert.equal((await h.request(prod).get("/health").set("Origin", "http://localhost:46765")).status, 403);
    assert.equal((await h.request(prod).get("/health").set("Origin", "https://app.example.com")).status, 200);
    h.buildApp({ NODE_ENV: "test", CORS_ORIGINS: "" });
  });

  it("hides internal error details in production", async () => {
    const prod = h.buildApp({ NODE_ENV: "production", JWT_SECRET: process.env.JWT_SECRET });
    const res = await h.request(prod).get("/nope");
    assert.equal(res.status, 404);
    assert.equal(res.body.code, "NOT_FOUND");
    h.buildApp({ NODE_ENV: "test" });
  });
});
