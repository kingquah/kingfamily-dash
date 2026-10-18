import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("./supabase/kingfamily_security.sql", import.meta.url), "utf8");
const app = readFileSync(new URL("./kingfamily-dash.js", import.meta.url), "utf8");
const api = readFileSync(new URL("./api/admin-users.js", import.meta.url), "utf8");
const active = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

function policies(source) {
  return source.split(/create policy /i).slice(1).map((chunk) => {
    const body = chunk.split(";")[0];
    const name = body.split(/\s/)[0];
    const table = /on public\.(\w+)/.exec(body)[1];
    const command = /for (select|insert|update|delete|all)/i.exec(body)[1].toLowerCase();
    return { name, table, command, body };
  });
}

const rows = policies(active);

function policy(table, command) {
  return rows.filter((row) => row.table === table && row.command === command);
}

test("migration keeps existing rows and only locks kf_ plus auth accounts", () => {
  assert.match(sql, /add column if not exists auth_id/);
  assert.match(sql, /drop column if exists password/);
  assert.match(active, /'kingdemo'/);
  assert.match(active, /insert into auth\.users/);
  assert.match(active, /insert into auth\.identities/);
  assert.doesNotMatch(active, /update\s+public\.kf_budget/i);
  assert.doesNotMatch(active, /delete\s+from\s+public\.kf_/i);
  assert.doesNotMatch(active, /grant\s+.+\s+to\s+anon/i);
  assert.doesNotMatch(active, /to anon/i);
  for (const name of [
    "users",
    "budget_lines",
    "sales_entries",
    "leave_requests",
    "kanban_board",
  ]) {
    assert.doesNotMatch(
      active,
      new RegExp(`\\b(table|policy|into|from|update|join)\\s+(public\\.)?${name}\\b`, "i"),
      name,
    );
  }
});

test("scoreboard channel is one of the shop names or blank", () => {
  for (const name of ["Own store", "Amazon", "Shopee", "Lazada", "TikTok Shop", "Other"]) {
    assert.match(sql, new RegExp(`'${name}'`));
  }
  assert.match(sql, /channel is null/);
});

test("helpers are security definer and policies never use a blanket allow", () => {
  assert.match(active, /function public\.kf_current_role\(\)/);
  assert.match(active, /function public\.kf_is_admin\(\)/);
  assert.match(active, /function public\.kf_is_manager\(\)/);
  assert.ok(active.split(/security definer/i).length >= 9);
  assert.equal(rows.length > 0, true);
  for (const row of rows) {
    assert.match(row.body, /to authenticated/);
    assert.doesNotMatch(row.body, /using\s*\(\s*true\s*\)/i);
    assert.doesNotMatch(row.body, /with check\s*\(\s*true\s*\)/i);
  }
});

test("role matrix: anon has no policy and staff cannot read budget or admin writes", () => {
  const tables = [
    "kf_users",
    "kf_leave_requests",
    "kf_checklist_submissions",
    "kf_sales_targets",
    "kf_sales_entries",
    "kf_budget_lines",
    "kf_budget_month_status",
    "kf_budget_line_visibility",
    "kf_budget_audit",
    "kf_kanban_board",
    "kf_kanban_audit",
  ];
  for (const table of tables) assert.ok(rows.some((row) => row.table === table), table);

  for (const table of [
    "kf_budget_lines",
    "kf_budget_month_status",
    "kf_budget_line_visibility",
  ]) {
    const found = policy(table, "all");
    assert.equal(found.length, 1, table);
    assert.match(found[0].body, /kf_is_manager\(\)/);
  }

  assert.match(policy("kf_users", "select")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_users", "insert")[0].body, /kf_is_admin\(\)/);
  assert.match(policy("kf_users", "update")[0].body, /kf_is_admin\(\)/);
  assert.match(policy("kf_users", "delete")[0].body, /kf_is_admin\(\)/);

  assert.match(policy("kf_sales_entries", "select")[0].body, /kf_current_role\(\) is not null/);
  assert.match(
    policy("kf_sales_entries", "update")[0].body,
    /user_id = public\.kf_current_user_id\(\) or public\.kf_is_manager\(\)/,
  );
  assert.match(policy("kf_sales_entries", "delete")[0].body, /kf_current_user_id\(\)/);

  assert.match(policy("kf_leave_requests", "insert")[0].body, /status = 'Pending'/);
  assert.match(policy("kf_checklist_submissions", "delete")[0].body, /kf_is_manager\(\)/);
  assert.equal(policy("kf_sales_targets", "insert")[0].body.includes("kf_is_manager()"), true);

  assert.match(policy("kf_budget_audit", "select")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_budget_audit", "delete")[0].body, /kf_is_admin\(\)/);
  assert.equal(policy("kf_budget_audit", "update").length, 0);
  assert.match(policy("kf_kanban_audit", "delete")[0].body, /kf_is_admin\(\)/);
  assert.equal(policy("kf_kanban_audit", "update").length, 0);
  assert.match(policy("kf_kanban_board", "update")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_kanban_board", "delete")[0].body, /kf_is_admin\(\)/);
});

test("audit names and sale owners are forced in the database", () => {
  assert.match(active, /new\.user_name := coalesce\(uname, 'Unknown'\)/);
  assert.match(active, /new\.user_id := old\.user_id/);
  const tgOps = [...active.matchAll(/tg_op\s*=\s*'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(tgOps, ["UPDATE", "INSERT", "UPDATE"]);
  assert.match(active, /Only an admin can create or promote an admin/);
  assert.match(active, /if auth\.uid\(\) is null then/);
  assert.match(active, /before insert on public\.kf_budget_audit/);
  assert.match(active, /before insert on public\.kf_kanban_audit/);
});

test("the app signs in with Supabase Auth and does not ship the old shortcuts", () => {
  const login = app.slice(app.indexOf("function Q3"), app.indexOf("const di"));
  const shell = app.slice(app.indexOf("function J3"), app.indexOf("function Q3"));
  assert.match(login, /signInWithPassword/);
  assert.doesNotMatch(login, /kf_users/);
  assert.match(shell, /getSession/);
  assert.match(shell, /if \(!session\) return/);
  assert.match(shell, /id: "leave"/);
  assert.match(shell, /id: "products"/);
  assert.match(shell, /id: "rocks"/);
  assert.doesNotMatch(shell, /id: "checklist"/);
  assert.match(shell, /e\.role === "admin"/);
  assert.doesNotMatch(app, /disable row level security/i);
  assert.doesNotMatch(app, /kingdemo/);
  assert.doesNotMatch(app, /password\s*===?\s*["']admin["']/);
  assert.doesNotMatch(app, /\bi === ["']admin["']/);
  assert.doesNotMatch(app, /SERVICE_ROLE/);
  assert.doesNotMatch(app, /service_role/);
  assert.match(app, /Revenue, minus cost of goods, labour, shipping, platform fees, marketing, taxes, and miscellaneous\./);
  assert.match(app, /PulseDashboardScoreboard\.xlsx/);
  assert.match(app, /Own store/);
  assert.match(app, /TikTok Shop/);
  assert.match(app, /Unspecified/);
  assert.match(app, /update\(payload\)\.eq\("id", O\.id\)/);
  assert.match(app, /insert\(\{ \.\.\.payload, user_id: e\.id \}\)/);
  assert.match(app, /Leave blank to keep the current password/);
  assert.match(app, /\/api\/admin-users/);
});

test("password changes go through the server and require an admin session", () => {
  assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(api, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(api, /caller\.role !== "admin"/);
  assert.match(api, /email_confirm:\s*true/);
  assert.match(api, /auth\.admin\.createUser/);
  assert.match(api, /auth\.admin\.updateUserById/);
  assert.match(api, /You can't delete your own login/);
});
