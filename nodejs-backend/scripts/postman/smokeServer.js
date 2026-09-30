// Read-only smoke check of the actual server entry point using seeded data.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const assert = require("node:assert/strict");
const { readEnvironment, environmentFile } = require("./bootstrap");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, ".postman");
async function main() {
  const values = readEnvironment(environmentFile);
  assert.ok(values.owner_username, "Run seed:demo first");
  const port = 15000 + Math.floor(Math.random() * 10000);
  const base = `http://127.0.0.1:${port}`;
  const log = fs.openSync(path.join(output, "server-smoke.log"), "w");
  const child = spawn(process.execPath, ["server.js"], { cwd: root, windowsHide: true, stdio: ["ignore", log, log], env: { ...process.env, PORT: String(port), LOG_LEVEL: "error", PUBLIC_API_URL: base } });
  const exited = once(child, "exit");
  const results = [];
  async function call(url, { body, token, binary } = {}) {
    const res = await fetch(`${base}${url}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}`, "X-Shop-Id": values.shop_id } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    assert.equal(res.status, 200, `${url}: unexpected HTTP ${res.status}`);
    const data = binary ? Buffer.from(await res.arrayBuffer()) : await res.json();
    results.push({ method: body ? "POST" : "GET", url, status: res.status, ...(Array.isArray(data) ? { count: data.length } : {}) });
    return data;
  }
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error("Server exited before becoming ready");
      try { const res = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) }); if (res.status === 200) { ready = true; break; } } catch { /* startup */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, "Server did not become ready");
    await call("/health");
    await call("/ready");
    const owner = await call("/auth/login", { body: { username: values.owner_username, password: values.demo_password, business_code: values.business_code } });
    const token = owner.access_token;
    for (const url of ["/auth/me", "/auth/users", "/account/me", "/categories", "/equipment", "/customers", "/rentals", "/expenses", "/expenses/recurring", "/inventory/transactions", "/settings", "/reports/dashboard", "/subscription"]) await call(url, { token });
    const invoice = await call(`/invoices/${values.rental_id}/pdf`, { token, binary: true });
    assert.equal(invoice.subarray(0, 5).toString(), "%PDF-");
    const equipment = await call(`/equipment/${values.equipment_id}`, { token });
    const file = equipment.images[0];
    assert.ok(file, "Missing seeded equipment image");
    const fileUrl = typeof file === "string" ? file : file.url;
    const image = await fetch(fileUrl, { signal: AbortSignal.timeout(10000) });
    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type"), /^image\//);
    results.push({ method: "GET", url: "/files/<seeded equipment key>", status: image.status });
    for (const username of ["demo.admin", "demo.staff"]) {
      const member = await call("/auth/login", { body: { username, password: values.demo_password, business_code: values.business_code } });
      await call("/auth/me", { token: member.access_token });
    }
    const platform = await call("/auth/admin/login", { body: { username: values.platform_username, password: values.platform_password } });
    await call("/platform/dashboard", { token: platform.access_token });
    fs.writeFileSync(path.join(output, "server-verification.json"), JSON.stringify({ generatedAt: new Date().toISOString(), passed: true, checkCount: results.length, results }, null, 2) + "\n");
    console.log(`Actual server.js startup, seeded logins, API reads, stored image and invoice PDF: ${results.length} checks passed.`);
  } finally {
    child.kill();
    await exited;
    fs.closeSync(log);
  }
}
if (require.main === module) main().catch((err) => { console.error(err.message); process.exitCode = 1; });
