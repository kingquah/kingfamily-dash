import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("./supabase/pulse_ecommerce.sql", import.meta.url), "utf8");
const seed = readFileSync(new URL("./supabase/pulse_ecommerce_seed.sql", import.meta.url), "utf8");
const app = [
  readFileSync(new URL("./kingfamily-dash.js", import.meta.url), "utf8"),
  readFileSync(new URL("./products-view.jsx", import.meta.url), "utf8"),
  readFileSync(new URL("./rocks-view.jsx", import.meta.url), "utf8"),
  readFileSync(new URL("./commerce-summary.jsx", import.meta.url), "utf8"),
].join("\n");

function activeSql(source) {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

const active = activeSql(sql);
const seedActive = activeSql(seed);

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

const MAPPED_KEYS = [
  "total_sales",
  "total_cogs",
  "payroll_my",
  "payroll_sg",
  "epf_cpf",
  "socso",
  "eis",
  "sdl_sg",
  "incentive",
  "delivery",
  "stripe",
  "sub_google",
  "sub_chatgpt",
  "sub_octopus",
  "sub_canva",
  "sub_other",
  "sub_hosting",
  "sub_systeme",
  "sub_misc",
  "digital_mkt",
  "ads_spend",
  "mkt_materials",
  "samples",
  "sponsorships",
  "cp204",
  "tax_agent",
  "rental",
  "sinking_fund",
  "maintenance",
  "company_trip",
  "team_bonus",
  "entertainment",
  "fin_perfectaim",
  "fin_sg",
  "secretary",
  "cosec_sg",
  "filing",
  "audit",
  "tech_dev",
  "cleaning",
  "misc_prof",
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
];

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

test("shop SQL is additive, kf_ only, and does not open the public key", () => {
  assert.doesNotMatch(active, /\bdrop\s+table\b/i);
  assert.doesNotMatch(active, /\bdelete\s+from\b/i);
  assert.doesNotMatch(active, /disable row level security/i);
  assert.doesNotMatch(active, /\bto anon\b/i);
  assert.doesNotMatch(active, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(active, /with check\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(active, /kf_checklist/);
  for (const name of ORIGINAL_TABLES) {
    assert.doesNotMatch(
      active,
      new RegExp(`\\b(table|policy|into|from|update|join|on)\\s+(public\\.)?${name}\\b`, "i"),
      name,
    );
  }
  for (const table of [
    "kf_products",
    "kf_product_sales",
    "kf_rocks",
    "kf_rock_quarters",
    "kf_rock_departments",
    "kf_rock_audit",
    "kf_rock_archive",
    "kf_budget_line_archive",
    "kf_budget_map_applied",
  ]) {
    assert.match(active, new RegExp(`public\\.${table}\\b`), table);
  }
  assert.match(active, /enable row level security/);
  assert.match(active, /public\.kf_is_manager\(\)/);
  assert.match(active, /public\.kf_current_role\(\)/);
  assert.match(active, /public\.kf_is_admin\(\)/);
  for (const row of rows) {
    assert.match(row.body, /to authenticated/);
    assert.doesNotMatch(row.body, /using\s*\(\s*true\s*\)/i);
  }
});

test("old budget lines are mapped once and hidden, not deleted", () => {
  for (const key of MAPPED_KEYS) assert.match(sql, new RegExp(`'${key}'`), key);
  for (const label of [
    "Revenue",
    "Cost of Goods",
    "Labour (Levi)",
    "Shipping",
    "Platform Fees",
    "Marketing",
    "Taxes",
    "Miscellaneous",
  ]) {
    assert.ok(sql.includes(label), label);
  }
  assert.match(active, /on conflict \(year, line_key\) do nothing/i);
  assert.match(active, /set hidden = true/);
  assert.match(active, /kf_budget_map_applied/);
  assert.equal(policy("kf_budget_lines", "select").length, 1);
  assert.match(policy("kf_budget_lines", "select")[0].body, /kf_current_role\(\) is not null/);
});

test("product and rock access follows admin, supervisor, and staff", () => {
  assert.match(policy("kf_products", "select")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_products", "update")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_products", "delete")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_product_sales", "insert")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_product_sales", "update")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_product_sales", "delete")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_rocks", "select")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_rocks", "insert")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_rocks", "update")[0].body, /kf_current_role\(\) is not null/);
  assert.match(policy("kf_rocks", "delete")[0].body, /kf_is_manager\(\)/);
  assert.match(policy("kf_rock_audit", "delete")[0].body, /kf_is_admin\(\)/);
  assert.equal(policy("kf_rock_audit", "update").length, 0);
  assert.match(active, /Only a manager can edit rock details/);
  assert.match(active, /new\.revenue := null/);
  assert.match(active, /status = any \(array\[''::text, 'complete'::text, 'attention'::text, 'dropped'::text\]\)/);
});

test("demo seed only inserts sample products and rocks", () => {
  assert.match(seed, /PLS-TEE-BLK/);
  assert.match(seed, /PLS-CAP-NVY/);
  assert.match(seed, /Publish the first 20 SKUs with a price/);
  assert.match(seed, /on conflict \(sku\) do nothing/i);
  assert.match(seed, /on conflict \(product_id, month\) do nothing/i);
  assert.match(seed, /king@kingfamily\.demo/);
  assert.doesNotMatch(seedActive, /\bdrop\s+table\b/i);
  assert.doesNotMatch(seedActive, /\bdelete\s+from\b/i);
  assert.doesNotMatch(seedActive, /\bupdate\s+public\.kf_/i);
  assert.doesNotMatch(seed, /kf_checklist/);
  for (const name of ORIGINAL_TABLES) {
    assert.doesNotMatch(
      seedActive,
      new RegExp(`\\b(into|update|from|join|table)\\s+(public\\.)?${name}\\b`, "i"),
      name,
    );
  }
});

test("the app reads shop tables and drops Checklist from the nav", () => {
  const shell = app.slice(app.indexOf("function J3"), app.indexOf("function Q3"));
  assert.match(shell, /id: "products"/);
  assert.match(shell, /id: "rocks"/);
  assert.doesNotMatch(shell, /id: "checklist"/);
  assert.match(app, /\.from\("kf_products"\)/);
  assert.match(app, /\.from\("kf_product_sales"\)/);
  assert.match(app, /\.from\("kf_rocks"\)/);
  assert.match(app, /\.from\("kf_rock_quarters"\)/);
  for (const name of ["products", "rocks", "budget_lines"]) {
    assert.doesNotMatch(app, new RegExp(`\\.from\\("${name}"\\)`), name);
  }
});
