import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUDGET_STRUCTURE } from "./budget-data.js";

const sql = readFileSync(new URL("./supabase/kingfamily_seed.sql", import.meta.url), "utf8");
const active = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const ORIGINAL_TABLES = [
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

function expand(key, byKey, seen = new Set()) {
  if (seen.has(key)) return [];
  seen.add(key);
  const line = byKey[key];
  if (!line) throw new Error(`missing budget key ${key}`);
  if (line.kind === "input") return [key];
  if (line.members) return line.members.flatMap((member) => expand(member, byKey, seen));
  return [];
}

test("seed only writes kf_ tables and is re-runnable", () => {
  assert.match(sql, /EXPECTED_NET_PROFIT_ACTUAL_YTD:\s*1186400/);
  assert.match(sql, /on conflict \(email\) do update/i);
  assert.match(sql, /on conflict \(year, line_key\) do update/i);
  assert.match(sql, /on conflict \(id\) do update/i);
  assert.doesNotMatch(active, /\bdrop\s+table\b/i);
  for (const name of ORIGINAL_TABLES) {
    assert.doesNotMatch(
      active,
      new RegExp(`\\b(into|update|from|join|table)\\s+(public\\.)?${name}\\b`, "i"),
      name
    );
  }
  assert.match(active, /public\.kf_users/);
  assert.match(active, /public\.kf_kanban_board/);
  assert.doesNotMatch(sql, /saltycustoms|puteri|quah/i);
});

test("demo logins use the plain-text password the app expects", () => {
  for (const email of [
    "adrian.king@kingfamily.demo",
    "mira.king@kingfamily.demo",
    "leo.king@kingfamily.demo",
    "sable.king@kingfamily.demo",
    "nora.king@kingfamily.demo",
  ]) {
    assert.match(sql, new RegExp(email));
  }
  assert.match(sql, /'kingdemo'/);
});

test("Net Profit (Actual YTD) is RM 1,186,400", () => {
  const byKey = Object.fromEntries(
    BUDGET_STRUCTURE.filter((line) => line.key).map((line) => [line.key, line])
  );
  const costKeys = byKey.net_profit.deduct.flatMap((key) => expand(key, byKey));
  assert.equal(new Set(costKeys).size, costKeys.length);

  const closed = [...sql.matchAll(/'sales_closed',\s*'[^']*',\s*(\d+)::numeric/g)]
    .map((match) => Number(match[1]));
  assert.ok(closed.length >= 10, "expected closed-sales rows");
  const income = closed.reduce((sum, amount) => sum + amount, 0);

  const actuals = new Map();
  for (const match of sql.matchAll(/\(2026,\s*'([a-z0-9_]+)',\s*\d+,\s*'(\{[^']*\})'::jsonb/g)) {
    actuals.set(match[1], JSON.parse(match[2]));
  }
  assert.equal(actuals.size, 55);

  let costs = 0;
  for (const key of costKeys) {
    const months = actuals.get(key);
    assert.ok(months, key);
    assert.equal(months.Nov, 0, key);
    assert.equal(months.Dec, 0, key);
    costs += Object.values(months).reduce((sum, value) => sum + value, 0);
  }

  const net = income - costs;
  assert.equal(net, 1_186_400);
  assert.ok(net > 1_000_000);
  assert.ok(net < 1_300_000);

  const storedSales = Object.values(actuals.get("total_sales")).reduce((sum, value) => sum + value, 0);
  assert.equal(storedSales, income);
});
