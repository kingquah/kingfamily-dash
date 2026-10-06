import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./kingfamily-dash.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const pkg = readFileSync(new URL("./package.json", import.meta.url), "utf8");
const setup = readFileSync(new URL("./SETUP.md", import.meta.url), "utf8");
const css = readFileSync(new URL("./src/mobile.css", import.meta.url), "utf8");

const tables = [
  "budget_line_visibility",
  "budget_month_status",
  "checklist_submissions",
  "leave_requests",
  "sales_targets",
  "sales_entries",
  "budget_lines",
  "budget_audit",
  "kanban_board",
  "kanban_audit",
  "users",
];

const schemaSql = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

test("app queries only kf_ tables", () => {
  for (const name of tables) {
    assert.doesNotMatch(app, new RegExp(`\\.from\\("${name}"\\)`), name);
  }
  assert.match(app, /\.from\("kf_users"\)/);
  assert.match(app, /\.from\("kf_budget_lines"\)/);
  assert.match(app, /\.from\("kf_kanban_board"\)/);
  assert.match(app, /\.from\("kf_kanban_audit"\)/);
});

test("embedded SQL uses kf_ names", () => {
  assert.doesNotMatch(app, /alter table budget_lines\b/);
  assert.doesNotMatch(app, /create table if not exists kanban_board\b/);
  assert.match(app, /alter table kf_budget_lines\b/);
  assert.match(app, /create table if not exists kf_kanban_board\b/);
});

test("schema does not touch the original tables", () => {
  assert.doesNotMatch(schemaSql, /\bdrop\s+table\b/i);
  for (const name of tables) {
    assert.doesNotMatch(
      schemaSql,
      new RegExp(`\\b(table|policy|into|from|update|join|on)\\s+(public\\.)?${name}\\b`, "i"),
      name
    );
  }
  assert.match(schemaSql, /public\.kf_users/);
  assert.match(schemaSql, /anon_full_access/);
});

test("King Family branding and purple theme", () => {
  assert.match(html, /<title>King Family Dash<\/title>/);
  assert.match(pkg, /"name": "kingfamily-dash"/);
  assert.match(setup, /King Family Dash/);
  assert.match(app, /KING FAMILY/);
  assert.match(app, /#6B3FA0/);
  assert.doesNotMatch(app, /#4a70c4/i);
  assert.doesNotMatch(css, /#4a70c4/i);
  assert.doesNotMatch(app, /saltycustoms\.com/i);
});
