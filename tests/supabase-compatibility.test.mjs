import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, beforeEach, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Load the actual server modules outside Next.js without disabling its production
// server-only boundary or requiring another test runner.
const require = createRequire(import.meta.url);
const modules = new Map();
function loadServerModule(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const loadedModule = { exports: {} };
  modules.set(filename, loadedModule);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier.startsWith(".")) {
      return loadServerModule(path.resolve(path.dirname(filename), `${specifier}.ts`));
    }
    return require(specifier);
  };
  vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const requests = [];
const employeeId = 17;
const userId = "00000000-0000-4000-8000-000000000017";
const accessModule = loadServerModule(path.resolve("src/lib/auth/access.ts"));
const notificationModule = loadServerModule(path.resolve("src/lib/supabase/notification-data.ts"));

beforeEach(() => {
  process.env.SUPABASE_URL = "https://compatibility-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  requests.length = 0;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url ?? input);
    const table = url.pathname.split("/").at(-1);
    requests.push(url);
    const tables = {
      employees: [{ id: employeeId, employee_email: "admin@example.test", employee_name: "Admin User", company_email: null, personal_email: null, role_id: 1 }],
      roles: [{ role_id: 1, role_name: "Admin" }],
      notifications: [
        { notification_id: 1, recipient_employee_id: employeeId, title: "Your notification", description: "Assigned to this employee", read_at: null, created_at: "2026-11-19T00:00:00Z", action_url: null },
        { notification_id: 2, recipient_employee_id: 99, title: "Other employee", read_at: null },
      ],
    };
    if (!(table in tables)) {
      return Response.json({ code: "PGRST205", message: `Table ${table} does not exist` }, { status: 404 });
    }
    let rows = tables[table];
    for (const [column, filter] of url.searchParams) {
      if (filter.startsWith("eq.")) rows = rows.filter((row) => String(row[column]) === filter.slice(3));
      if (filter === "is.null") rows = rows.filter((row) => row[column] == null);
    }
    const headers = { "Content-Range": `0-${Math.max(0, rows.length - 1)}/${rows.length}` };
    return options.method === "HEAD"
      ? new Response(null, { headers })
      : Response.json(rows, { headers });
  };
});

after(() => {
  globalThis.fetch = originalFetch;
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test("authorized employees can load only their notifications without an auth-link table", async () => {
  const access = await accessModule.resolveUserAccess(
    userId,
    "admin@example.test",
    true,
    "https://example.test/avatar.png",
  );
  assert.equal(access.status, "allowed");
  assert.equal(access.actor.employeeId, employeeId);
  assert.equal(access.actor.employeeName, "Admin User");
  assert.equal(access.actor.email, "admin@example.test");
  assert.equal(access.actor.avatarUrl, "https://example.test/avatar.png");
  const result = await notificationModule.getEmployeeNotifications(access.actor.employeeId);
  assert.equal(result.unreadCount, 1);
  assert.deepEqual(result.notifications.map((notification) => notification.notification_id), [1]);
  assert.ok(requests.filter((url) => url.pathname.endsWith("/notifications"))
    .every((url) => url.searchParams.get("recipient_employee_id") === `eq.${employeeId}`));
  assert.ok(requests.every((url) => !url.pathname.endsWith("/employee_auth_links")));
});

test("avatar metadata accepts only safe http(s) URLs", () => {
  assert.equal(
    accessModule.readAvatarUrl({ avatar_url: "https://example.test/avatar.png" }),
    "https://example.test/avatar.png",
  );
  assert.equal(
    accessModule.readAvatarUrl({ picture: "http://example.test/picture.jpg" }),
    "http://example.test/picture.jpg",
  );
  assert.equal(accessModule.readAvatarUrl({ avatar_url: "javascript:alert(1)" }), null);
  assert.equal(accessModule.readAvatarUrl({ avatar_url: "not a url" }), null);
  assert.equal(accessModule.readAvatarUrl({}), null);
});

test("unconfirmed and unmatched identities remain denied", async () => {
  assert.equal((await accessModule.resolveUserAccess(userId, "admin@example.test", false)).status, "denied");
  assert.equal(requests.length, 0);
  assert.equal((await accessModule.resolveUserAccess(userId, "unknown@example.test", true)).status, "denied");
});
