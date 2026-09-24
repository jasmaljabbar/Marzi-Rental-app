const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const http = require("node:http");
const request = require("supertest");
const { generate, routeFor, output, routes } = require("./generate");
const { steps } = require("./scenarios");

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, /token|password|secret|sig$/i.test(key) ? "<redacted>" : redact(v)]));
  if (typeof value === "string") return value.replace(/([?&]sig=)[^&]+/g, "$1<redacted>");
  return value;
}

async function execute(app, values, { label = "isolated", onState } = {}) {
  generate();
  await require("sharp")({ create: { width: 32, height: 32, channels: 3, background: "#2876aa" } }).png().toFile(path.join(output, "fixtures/sample.png"));
  const collection = JSON.parse(fs.readFileSync(path.join(output, "Marzi-Rental-API.postman_collection.json")));
  const items = collection.item.flatMap((f) => f.item);
  const results = [];
  const examples = {};
  const replace = (text) => String(text).replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
  const env = { get: (key) => values[key], set: (key, value) => { values[key] = String(value); }, unset: (key) => { delete values[key]; } };
  let failure;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const step = steps[i];
    const endpoint = routeFor(step);
    let skip = false;
    const assertions = [];
    const pm = { environment: env, variables: { ...env, replaceIn: replace }, execution: { skipRequest: () => { skip = true; } }, test: (name, fn) => { try { fn(); assertions.push({ name, passed: true }); } catch (err) { assertions.push({ name, passed: false, detail: err.message }); } } };
    const context = vm.createContext({ pm, console, Date, Math });
    for (const event of item.event.filter((e) => e.listen === "prerequest")) vm.runInContext(event.script.exec.join("\n"), context, { timeout: 3000 });
    if (skip) { results.push({ name: item.name, route: `${endpoint.method} ${endpoint.path}`, skipped: true, reason: "External integration disabled" }); continue; }
    const started = Date.now();
    try {
      let url = replace(item.request.url);
      if (/\{\{/.test(url)) throw new Error(`Unresolved URL variable in ${url}`);
      if (url.startsWith("http")) { const parsed = new URL(url); url = parsed.pathname + parsed.search; }
      let call = request(app)[item.request.method.toLowerCase()](url).timeout({ response: 20000, deadline: 40000 });
      const auth = item.request.auth || collection.auth;
      if (auth.type === "bearer") call = call.set("Authorization", `Bearer ${replace(auth.bearer[0].value)}`);
      for (const header of item.request.header) {
        const value = replace(header.value);
        if (!/\{\{/.test(value)) call = call.set(header.key, value);
      }
      if (item.request.body?.mode === "raw") {
        const body = replace(item.request.body.raw);
        if (/\{\{/.test(body)) throw new Error("Unresolved body variable");
        call = call.send(body);
      }
      if (item.request.body?.mode === "formdata") call = call.attach("file", path.join(output, "fixtures/sample.png"));
      const res = await call;
      const bodyText = res.text ?? (Buffer.isBuffer(res.body) ? res.body.toString("latin1") : JSON.stringify(res.body));
      pm.response = { code: res.status, headers: { get: (key) => res.headers[key.toLowerCase()] ?? null }, json: () => JSON.parse(bodyText), text: () => bodyText };
      for (const event of item.event.filter((e) => e.listen === "test")) vm.runInContext(event.script.exec.join("\n"), context, { timeout: 3000 });
      const failed = assertions.filter((a) => !a.passed);
      results.push({ name: item.name, route: `${endpoint.method} ${endpoint.path}`, expected: step.status, actual: res.status, passed: failed.length === 0, assertions, durationMs: Date.now() - started });
      examples[item.name] = { code: res.status, status: http.STATUS_CODES[res.status], contentType: res.headers["content-type"] || "", body: ["pdf", "image"].includes(step.check) ? `[Binary ${step.check} response, ${res.body.length} bytes]` : JSON.stringify(redact(res.body), null, 2) };
      if (failed.length) throw new Error(`${item.name}: ${failed.map((f) => f.detail).join("; ")}`);
      if (onState) onState(values);
    } catch (err) {
      failure = err;
      if (!results.some((r) => r.name === item.name)) results.push({ name: item.name, route: `${endpoint.method} ${endpoint.path}`, passed: false, detail: err.message });
      break;
    }
  }
  const verified = new Set(results.filter((r) => r.passed).map((r) => r.route));
  const report = { generatedAt: new Date().toISOString(), mode: label, totalRoutes: routes.length, coveredRoutes: verified.size, requestsPassed: results.filter((r) => r.passed).length, requestsFailed: results.filter((r) => r.passed === false).length, requestsSkipped: results.filter((r) => r.skipped).length, assertionsPassed: results.flatMap((r) => r.assertions || []).filter((a) => a.passed).length, missingRoutes: routes.map((r) => `${r.method} ${r.path}`).filter((r) => !verified.has(r)), results };
  fs.writeFileSync(path.join(output, `${label}-verification.json`), JSON.stringify(report, null, 2) + "\n");
  if (failure) throw failure;
  assert.equal(verified.size, routes.length, "Every route must be exercised");
  // Keep examples from the persistent demo DB when isolated checks run later.
  if (label === "database" || !fs.existsSync(path.join(output, "database-verification.json"))) {
    fs.writeFileSync(path.join(output, "response-examples.json"), JSON.stringify(examples, null, 2) + "\n");
  }
  generate();
  console.log(`${label}: ${report.requestsPassed} requests and ${report.assertionsPassed} assertions passed; ${report.coveredRoutes}/${report.totalRoutes} routes covered; ${report.requestsSkipped} optional integrations skipped.`);
  return { values, report };
}

async function main() {
  // Default verification always uses an isolated database, never the .env DB.
  const h = require("../../tests/helpers");
  process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, "../../node_modules/.cache/mongodb-binaries");
  try {
    await h.startDb();
    const app = h.buildApp();
    const { bootstrap } = require("./bootstrap");
    await execute(app, await bootstrap());
  } finally { await h.stopDb(); }
}
if (require.main === module) main().catch((err) => { console.error(err.message); process.exitCode = 1; });
module.exports = { execute, redact };
