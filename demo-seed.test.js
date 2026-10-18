import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const LEGACY_COST_KEYS = [
  "total_cogs",
  "payroll_my",
  "payroll_sg",
  "epf_cpf",
  "socso",
  "eis",
  "sdl_sg",
  "incentive",
  "rental",
  "sinking_fund",
  "maintenance",
  "delivery",
  "samples",
  "company_trip",
  "sponsorships",
  "team_bonus",
  "entertainment",
  "fin_perfectaim",
  "fin_sg",
  "secretary",
  "cosec_sg",
  "filing",
  "tax_agent",
  "audit",
  "stripe",
  "digital_mkt",
  "ads_spend",
  "mkt_materials",
  "tech_dev",
  "cleaning",
  "misc_prof",
  "sub_google",
  "sub_chatgpt",
  "sub_octopus",
  "sub_canva",
  "sub_other",
  "sub_hosting",
  "sub_systeme",
  "sub_misc",
  "util_electric",
  "util_water",
  "util_internet",
  "util_phone",
  "off_stationery",
  "off_pantry",
  "off_it",
  "off_furniture",
  "veh_insurance",
  "veh_service",
  "depreciation",
  "loan_proton",
  "loan_denza",
  "loan_maybank",
  "cp204",
];

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

test("seed creates King and does not store a password", () => {
  for (const email of [
    "king@kingfamily.demo",
    "mira.king@kingfamily.demo",
    "leo.king@kingfamily.demo",
    "sable.king@kingfamily.demo",
    "nora.king@kingfamily.demo",
  ]) {
    assert.match(sql, new RegExp(email));
  }
  assert.match(sql, /'King'/);
  assert.doesNotMatch(sql, /adrian/i);
  assert.doesNotMatch(active, /\bpassword\b/i);
});

test("Net Profit (Actual YTD) is RM 1,186,400", () => {
  const costKeys = LEGACY_COST_KEYS;
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
