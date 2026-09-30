const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const h = require("./helpers");
const { resetEnv } = require("../src/config/env");
const { createServerlessHandler } = require("../src/lib/serverless");

describe("Vercel request entry point", () => {
  before(async () => { await h.startDb(); await h.seedPlans(); });
  after(h.stopDb);

  it("exports a request handler while preserving the local app factory", async () => {
    const handler = require("../src/app");
    assert.equal(typeof handler, "function");
    assert.equal(typeof handler.createApp, "function");
    assert.equal((await h.request(handler).get("/health")).status, 200);
    assert.equal((await h.request(handler).get("/plans")).status, 200);
    const login = await h.request(handler).post("/auth/login").send({ username: "missing", password: "Not-a-real-user-42" });
    assert.equal(login.status, 401);
    assert.equal(login.body.code, "INVALID_CREDENTIALS");
  });

  it("shares concurrent cold starts and reuses the connection for warm requests", async (t) => {
    await mongoose.disconnect();
    const connect = mongoose.connect.bind(mongoose);
    const spy = t.mock.method(mongoose, "connect", (...args) => connect(...args));
    const handler = createServerlessHandler(require("../src/app").createApp);
    const responses = await Promise.all(Array.from({ length: 8 }, () => h.request(handler).get("/ready")));
    assert.ok(responses.every((r) => r.status === 200 && r.body.status === "ready"));
    assert.equal(spy.mock.callCount(), 1);
    assert.equal((await h.request(handler).get("/plans")).status, 200);
    assert.equal(spy.mock.callCount(), 1);
    spy.mock.restore();
    await mongoose.disconnect();
    assert.equal((await h.request(handler).get("/ready")).status, 200, "reconnects after a closed pool");
  });

  it("returns a safe 503 on failed initialization and retries the next request", async (t) => {
    const spy = t.mock.method(mongoose, "connect", async () => { throw new Error("private-database-detail"); });
    const handler = createServerlessHandler(require("../src/app").createApp);
    const failed = await h.request(handler).get("/plans");
    assert.equal(failed.status, 503);
    assert.equal(failed.body.code, "STARTUP_FAILED");
    assert.ok(!JSON.stringify(failed.body).includes("private-database-detail"));
    spy.mock.restore();
    assert.equal((await h.request(handler).get("/plans")).status, 200);
  });

  it("keeps the required migration gate without terminating the function process", async () => {
    process.env.REQUIRE_MIGRATIONS = "true";
    resetEnv();
    const handler = createServerlessHandler(require("../src/app").createApp);
    try {
      const response = await h.request(handler).get("/ready");
      assert.equal(response.status, 503);
      assert.equal(response.body.code, "STARTUP_FAILED");
    } finally {
      delete process.env.REQUIRE_MIGRATIONS;
      resetEnv();
    }
  });
});
