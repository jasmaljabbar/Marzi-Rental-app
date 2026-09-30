const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");
const { steps } = require("./scenarios");
const root = path.resolve(__dirname, "../..");
const output = path.join(root, ".postman");
const json = (v) => JSON.stringify(v, null, 2);
const schemas = Object.fromEntries(["auth", "catalog", "rentals", "platform"].map((name) => [name, require(`../../src/validators/${name}`)]));

function inventory() {
  const routes = [];
  for (const file of fs.readdirSync(path.join(root, "src/routes")).filter((f) => f.endsWith(".js") && !["_helpers.js", "files.js"].includes(f))) {
    const source = fs.readFileSync(path.join(root, "src/routes", file), "utf8");
    const prefix = file.slice(0, -3);
    const validator = source.match(/validators\/(\w+)/)?.[1];
    const matches = [...source.matchAll(/router\.(get|post|put|delete)\(\s*"([^"]+)"/g)];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const code = source.slice(m.index, matches[i + 1]?.index ?? source.indexOf("module.exports"));
      const url = `/${prefix}${m[2] === "/" ? "" : m[2]}`.replace(/:(\w+)/g, "{$1}");
      const publicAuth = prefix === "auth" && ["/register", "/login", "/admin/login", "/forgot-password", "/request-reset/:username", "/reset-password"].includes(m[2]);
      const r = { method: m[1].toUpperCase(), path: url, source: `src/routes/${file}`, auth: publicAuth ? "Public" : prefix === "platform" ? "Platform administrator" : /adminOnly|\.\.\.team/.test(code) ? "Business owner/admin" : "Any authenticated business member", feature: code.match(/requireFeature\("(\w+)"\)/)?.[1], limit: code.match(/enforceLimit\("(\w+)"/)?.[1] };
      for (const part of ["body", "query"]) {
        const key = code.match(new RegExp(`${part}: v\\.(\\w+)`))?.[1];
        if (key && validator) {
          r[`${part}Validator`] = `${validator}.${key}`;
          r[`${part}Schema`] = z.toJSONSchema(schemas[validator][key], { io: "input", unrepresentable: "any" });
        }
      }
      if (prefix === "auth" && /\/users|\/signup/.test(url)) r.auth = "Business owner/admin";
      if (url === "/subscription/checkout") r.bodySchema = { type: "object", required: ["plan_key"], properties: { plan_key: { type: "string", minLength: 1, maxLength: 40 } } };
      if (url === "/inventory/transactions") r.querySchema = { type: "object", properties: { page: { type: "integer", minimum: 1 }, page_size: { type: "integer", minimum: 1 }, equipment_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } } };
      if (url === "/reservations" && r.method === "GET") r.querySchema = { type: "object", properties: { customer_id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } } };
      if (url === "/reports/dashboard") r.querySchema = { type: "object", properties: { tz: { type: "integer", minimum: -840, maximum: 840 } } };
      routes.push(r);
    }
  }
  const appSource = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
  for (const m of appSource.matchAll(/app\.(get|post)\("([^"]+)"/g)) routes.push({ method: m[1].toUpperCase(), path: m[2], source: "src/app.js", auth: "Public" });
  routes.push({ method: "POST", path: "/upload", source: "src/routes/files.js", auth: "Any authenticated business member", bodySchema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary", description: "One JPEG, PNG, WebP or GIF image; default limit 10 MiB." } } }, querySchema: { type: "object", properties: { kind: { type: "string", enum: Object.keys(require("../../src/storage/keys").FILE_KINDS), default: "attachment" } } } });
  routes.push({ method: "GET", path: "/files/{key}", source: "src/routes/files.js", auth: "Public files: no auth; private files: signed exp and sig query parameters", querySchema: { type: "object", properties: { exp: { type: "integer", description: "Signed URL expiry, Unix seconds" }, sig: { type: "string", description: "Server-generated signature" } } } });
  return routes;
}

const routes = inventory();
function routeFor(step) {
  if (step.route) return routes.find((r) => `${r.method} ${r.path}` === step.route);
  const pathname = step.url.split("?")[0];
  return routes.find((r) => r.method === step.method && new RegExp(`^${r.path.replace(/\{\w+\}/g, "[^/]+")}$`).test(pathname));
}

function testsFor(s) {
  const lines = [`pm.test("HTTP ${s.status}", function () { if (pm.response.code !== ${s.status}) throw new Error("Expected ${s.status}, received " + pm.response.code + ": " + pm.response.text().slice(0, 300)); });`];
  if (s.check === "pdf") lines.push('pm.test("Valid PDF response", function () { if (!pm.response.headers.get("Content-Type").includes("application/pdf") || !pm.response.text().startsWith("%PDF-")) throw new Error("Expected PDF bytes"); });');
  else if (s.check === "image") lines.push('pm.test("Image response", function () { if (!pm.response.headers.get("Content-Type").startsWith("image/")) throw new Error("Expected image"); });');
  else {
    lines.push('const data = pm.response.json();');
    if (s.errorCode) lines.push(`pm.test("Expected application error", function () { if (data.code !== ${JSON.stringify(s.errorCode)}) throw new Error("Unexpected error code " + data.code); });`);
    if (["array", "paginated"].includes(s.check)) lines.push('pm.test("Array response", function () { if (!Array.isArray(data)) throw new Error("Expected array"); });');
    if (s.check === "paginated") lines.push('pm.test("Pagination headers", function () { if (pm.response.headers.get("X-Page") !== "1" || pm.response.headers.get("X-Total-Count") === null) throw new Error("Missing pagination metadata"); });');
    if (["active", "completed"].includes(s.check)) lines.push(`pm.test("Rental state", function () { if (data.status !== "${s.check === "active" ? "Active" : "Completed"}") throw new Error("Unexpected rental state"); });`);
    if (s.check === "paid") lines.push('pm.test("Fully paid", function () { if (data.amount_due !== 0 || data.payment_status !== "Paid") throw new Error("Balance was not settled"); });');
    for (const [key, valuePath] of Object.entries(s.capture || {})) lines.push(`pm.test("Capture ${key}", function () { const value = ${JSON.stringify(valuePath)}.split(".").reduce((v,k) => v == null ? undefined : v[k], data); if (value === undefined || value === null) throw new Error("Missing ${valuePath}"); pm.environment.set(${JSON.stringify(key)}, String(value)); });`);
  }
  return lines;
}

function preRequestFor(s) {
  const lines = [];
  if (s.initialize) lines.push('const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);', 'pm.environment.set("run_id", id);', 'pm.environment.set("owner_username", "marzi.owner." + id);', 'pm.environment.set("company_name", "Marzi Demo " + id);', 'const now = new Date();', 'pm.environment.set("today", now.toISOString());', 'pm.environment.set("future_date", new Date(now.getTime() + 7*86400000).toISOString());', 'pm.environment.set("start_date", new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());', 'pm.environment.set("end_date", new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 1)-1).toISOString());');
  if (s.optional) lines.push(`if (pm.environment.get("enable_${s.optional}") !== "true") { pm.execution.skipRequest(); }`);
  if (s.signWebhook) lines.push('if (pm.environment.get("enable_webhook") === "true") {', '  const CryptoJS = require("crypto-js");', '  const timestamp = Math.floor(Date.now()/1000).toString();', '  const payload = pm.variables.replaceIn(pm.request.body.raw);', '  const signature = CryptoJS.HmacSHA256(timestamp + "." + payload, pm.environment.get("stripe_webhook_secret")).toString(CryptoJS.enc.Hex);', '  pm.request.headers.upsert({ key: "Stripe-Signature", value: "t=" + timestamp + ",v1=" + signature });', '}');
  return lines;
}

function description(s, r) {
  let text = `${s.name}.\n\n**Endpoint:** ${r.method} ${r.path}\n\n**Access:** ${r.auth}. Expected response: **${s.status}**.`;
  if (r.feature) text += ` Requires plan feature \`${r.feature}\`.`;
  if (r.limit) text += ` Subject to the \`${r.limit}\` plan limit.`;
  if (s.note) text += `\n\n${s.note}`;
  if (s.auth !== false && !s.url.startsWith("/platform")) text += "\n\nUse Bearer authentication. X-Shop-Id selects the active shop. Owner/admin can access their business shops; staff may be restricted to one shop. Business writes require a writable subscription.";
  const params = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (params.length) text += `\n\n**Path parameters:** ${params.map((p) => `\`${p}\``).join(", ")}. IDs must be 24 hexadecimal MongoDB ObjectId strings; username, key and idOrPhone accept their named text values.`;
  for (const part of ["query", "body"]) if (r[`${part}Schema`]) text += `\n\n**${part === "body" ? "Body" : "Query"} schema** (fields in required are mandatory; other fields are optional):\n\n\`\`\`json\n${json(r[`${part}Schema`])}\n\`\`\``;
  if (s.capture) text += `\n\n**Saves environment variables:** ${Object.keys(s.capture).map((k) => `\`${k}\``).join(", ")}. Run prerequisite create/login requests first.`;
  return text;
}

function generate() {
  fs.mkdirSync(path.join(output, "fixtures"), { recursive: true });
  const folders = new Map();
  const covered = new Set();
  const examplesPath = path.join(output, "response-examples.json");
  const examples = fs.existsSync(examplesPath) ? JSON.parse(fs.readFileSync(examplesPath)) : {};
  for (const s of steps) {
    const r = routeFor(s);
    if (!r) throw new Error(`No source route matches ${s.method} ${s.url}`);
    covered.add(`${r.method} ${r.path}`);
    const headers = [{ key: "Accept", value: s.check === "pdf" ? "application/pdf" : s.check === "image" ? "image/*" : "application/json" }];
    if (s.auth !== false && !s.url.startsWith("/platform") && !s.url.startsWith("/auth/admin")) headers.push({ key: "X-Shop-Id", value: "{{shop_id}}", description: "Active shop. Captured during registration; can be selected from GET /shops." });
    const request = { method: s.method, header: headers, url: s.url.startsWith("/") ? `{{base_url}}${s.url}` : s.url, description: description(s, r) };
    if (s.auth === false) request.auth = { type: "noauth" };
    else if (s.auth) request.auth = { type: "bearer", bearer: [{ key: "token", value: `{{${s.auth}}}`, type: "string" }] };
    if (s.body !== undefined) { headers.push({ key: "Content-Type", value: "application/json" }); request.body = { mode: "raw", raw: json(s.body), options: { raw: { language: "json" } } }; }
    if (s.upload) request.body = { mode: "formdata", formdata: [{ key: "file", type: "file", src: "fixtures/sample.png", description: "Choose .postman/fixtures/sample.png; set Postman working directory to .postman." }] };
    const pre = preRequestFor(s);
    const item = { name: s.name, request, event: [...(pre.length ? [{ listen: "prerequest", script: { type: "text/javascript", exec: pre } }] : []), { listen: "test", script: { type: "text/javascript", exec: testsFor(s) } }], response: examples[s.name] ? [{ name: `Verified HTTP ${examples[s.name].code}`, originalRequest: request, status: examples[s.name].status, code: examples[s.name].code, header: [{ key: "Content-Type", value: examples[s.name].contentType }], body: examples[s.name].body, _postman_previewlanguage: "json" }] : [] };
    if (!folders.has(s.folder)) folders.set(s.folder, []);
    folders.get(s.folder).push(item);
  }
  const missing = routes.filter((r) => !covered.has(`${r.method} ${r.path}`));
  if (missing.length) throw new Error(`Undocumented API routes: ${json(missing)}`);
  const info = { name: "Marzi Rental API - Complete workflow", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json", description: `All ${routes.length} explicit API routes, plus workflow variants and negative tests. Read README.md before running. Import the collection and local environment, set the working directory to .postman, then run in order. Creates a new demo tenant each run; only disposable test records are deleted. Folders 11 and 13 contain deliberate errors with exact assertions. Folder 14 is skipped unless explicitly enabled. No /api prefix. Billing and actual email delivery require external configuration.` };
  fs.writeFileSync(path.join(output, "Marzi-Rental-API.postman_collection.json"), json({ info, auth: { type: "bearer", bearer: [{ key: "token", value: "{{token}}", type: "string" }] }, item: [...folders].map(([name, item]) => ({ name, item })) }) + "\n");
  fs.writeFileSync(path.join(output, "route-inventory.json"), json({ routeCount: routes.length, requestCount: steps.length, missing: [], routes }) + "\n");
  const schemaDoc = Object.fromEntries(Object.entries(schemas).map(([name, group]) => [name, Object.fromEntries(Object.entries(group).map(([key, schema]) => [key, z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })]))]));
  fs.writeFileSync(path.join(output, "request-schemas.json"), json(schemaDoc) + "\n");
  const docs = ["# Marzi Rental API reference", "", info.description, "", "## Conventions", "", "Base URL: `http://localhost:5000` (no `/api` prefix). Send JSON with Content-Type application/json except image uploads. Responses use snake_case and `id` strings; lists are arrays. Money is decimal major currency units, not paise/cents. Quantities are whole numbers. Dates accept parseable date strings; use ISO 8601 with an explicit timezone. ObjectIds are 24 hexadecimal characters. Passwords must be 8-128 characters and cannot be common passwords or equal the username. Unknown JSON fields are stripped by the validators. Custom validation/refinements beyond JSON Schema are enforced by the services.", "", "Paginated lists accept page and page_size; default page size is 20, capped at 500. Unpaginated lists are capped at 1000. Read X-Total-Count, X-Page, X-Page-Size, X-Total-Pages and X-Truncated. In archive-aware catalog lists, include_archived=true selects archived records only (it does not combine them with active records). Report tz is minutes east of UTC (India: 330). Report ranges require start_date and end_date.", "", "Errors have `{detail, code, ...extra}`. Validation errors may include `errors: [{path,message}]`. Common statuses: 400 invalid input/business state, 401 absent/expired/revoked token, 402 subscription blocked, 403 role/feature/plan limit, 404 missing record, 409 conflict/history protection, 413 upload/body too large, 429 rate limit, 501 billing not configured. X-Request-Id identifies requests. Default API limit: 1000/15 minutes; auth: 20/15 minutes. Additional upload/reset limits apply.", "", "Equipment stock_count means units on hand; active rentals reduce it. available stock excludes damaged units. Rental rates are snapshotted at creation, billing has a minimum one-day charge, and returns generate invoices. Payment amounts are incremental except advance_amount updates, which replace the total advance. Equipment/customer records with rental/sale history must be archived rather than deleted. Reservations expire after four hours. File kinds are equipment, logo, qr_code, customer_photo, customer_doc, receipt, damage, attachment. Upload each photo separately, save the returned key, and use URLs only for display. Equipment allows four photos; damage allows six. Private signed URLs must be refreshed after expiry.", "", "## Endpoint index", "", "| Method | Path | Access |", "|---|---|---|", ...routes.map((r) => `| ${r.method} | ${r.path} | ${r.auth} |`), "", "## Examples and parameter schemas"];
  for (const r of routes) {
    const s = steps.find((s) => routeFor(s) === r && !s.optional);
    docs.push("", `### ${r.method} ${r.path}`, "", description(s, r), "", `Example URL: \`${s.url}\``);
    if (s.body !== undefined) docs.push("", "```json", json(s.body), "```");
    if (examples[s.name]) docs.push("", `Verified response (${examples[s.name].code}):`, "", "```json", examples[s.name].body, "```");
  }
  fs.writeFileSync(path.join(output, "API.md"), docs.join("\n") + "\n");
  console.log(`Generated ${steps.length} requests covering all ${routes.length} routes in .postman.`);
  return { routes, steps };
}
if (require.main === module) generate();
module.exports = { generate, routeFor, routes, output };
