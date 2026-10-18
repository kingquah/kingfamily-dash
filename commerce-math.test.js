import test from "node:test";
import assert from "node:assert/strict";
import { BUDGET_STRUCTURE } from "./budget-data.js";
import {
  BUDGET_START,
  activeMonths,
  clampMonthIndex,
  formatRm,
  isLowStock,
  marginPct,
  monthKeysInPeriod,
  monthKeysThrough,
  monthsInPeriod,
  monthsThrough,
  periodLabel,
  profitFromBudget,
  rankSkus,
  skuCogs,
  skuMargin,
  skuRevenue,
} from "./commerce-math.js";

const product = { sell_price: 50, unit_cost: 20 };

test("budget sheet is revenue plus the seven cost lines", () => {
  const inputs = BUDGET_STRUCTURE.filter((line) => line.kind === "input");
  assert.deepEqual(
    inputs.map((line) => [line.key, line.label, line.sign]),
    [
      ["revenue", "Revenue", 1],
      ["cogs", "Cost of Goods", -1],
      ["labour", "Labour (Levi)", -1],
      ["shipping", "Shipping", -1],
      ["platform_fees", "Platform Fees", -1],
      ["marketing", "Marketing", -1],
      ["taxes", "Taxes", -1],
      ["miscellaneous", "Miscellaneous", -1],
    ],
  );
  const gross = BUDGET_STRUCTURE.find((line) => line.key === "gross_profit");
  const net = BUDGET_STRUCTURE.find((line) => line.key === "net_profit");
  const total = BUDGET_STRUCTURE.find((line) => line.key === "total_costs");
  assert.deepEqual(gross, {
    kind: "net",
    key: "gross_profit",
    label: "Gross Profit",
    income: ["revenue"],
    deduct: ["cogs"],
  });
  assert.deepEqual(net.income, ["revenue"]);
  assert.deepEqual(net.deduct, ["total_costs"]);
  assert.deepEqual(total.members, [
    "cogs",
    "labour",
    "shipping",
    "platform_fees",
    "marketing",
    "taxes",
    "miscellaneous",
  ]);
});

test("SKU margin uses a revenue override when one is entered", () => {
  assert.equal(skuRevenue(product, { units_sold: 2, revenue: null }), 100);
  assert.equal(skuRevenue(product, { units_sold: 2, revenue: "" }), 100);
  assert.equal(skuRevenue(product, { units_sold: 2, revenue: 80 }), 80);
  assert.equal(skuRevenue(product, { units_sold: 2, revenue: 0 }), 0);
  assert.equal(skuCogs(product, { units_sold: 2 }), 40);
  assert.equal(skuMargin(product, { units_sold: 2, revenue: null }), 60);
  assert.equal(skuMargin(product, { units_sold: 2, revenue: 80 }), 40);
  assert.equal(marginPct(40, 80), 50);
  assert.equal(marginPct(10, 0), null);
});

test("gross profit is revenue minus COGS and net profit subtracts all seven costs", () => {
  const actuals = {
    revenueActuals: { Jan: 1000, Feb: 500 },
    costActuals: {
      cogs: { Jan: 400, Feb: 100 },
      labour: { Jan: 200 },
      shipping: { Jan: 50 },
      platform_fees: { Jan: 30 },
      marketing: { Jan: 20 },
      taxes: { Jan: 10 },
      miscellaneous: { Jan: 5 },
    },
  };
  const month = profitFromBudget({ ...actuals, months: ["Jan"] });
  assert.equal(month.revenue, 1000);
  assert.equal(month.cogs, 400);
  assert.equal(month.grossProfit, 600);
  assert.equal(month.totalCosts, 715);
  assert.equal(month.netProfit, 285);

  const ytd = profitFromBudget({ ...actuals, months: monthsThrough(1) });
  assert.deepEqual(monthsThrough(1), ["Jan", "Feb"]);
  assert.equal(ytd.revenue, 1500);
  assert.equal(ytd.cogs, 500);
  assert.equal(ytd.grossProfit, 1000);
  assert.equal(ytd.totalCosts, 815);
  assert.equal(ytd.netProfit, 685);
});

test("top and bottom SKUs are ranked by margin for the month and year to date", () => {
  const products = [
    { id: "a", sku: "A", name: "Alpha", sell_price: 10, unit_cost: 4, active: true },
    { id: "b", sku: "B", name: "Beta", sell_price: 10, unit_cost: 8, active: true },
    { id: "c", sku: "C", name: "Gamma", sell_price: 5, unit_cost: 9, active: true },
    { id: "d", sku: "D", name: "Delta", sell_price: 20, unit_cost: 1, active: false },
    { id: "e", sku: "E", name: "Echo", sell_price: 10, unit_cost: 1, active: true },
  ];
  const sales = [
    { product_id: "a", month: "2026-10", units_sold: 10, revenue: null },
    { product_id: "b", month: "2026-10", units_sold: 10, revenue: null },
    { product_id: "c", month: "2026-10", units_sold: 4, revenue: null },
    { product_id: "d", month: "2026-10", units_sold: 10, revenue: null },
    { product_id: "e", month: "2026-09", units_sold: 1, revenue: null },
  ];
  const october = rankSkus(products, sales, ["2026-10"]);
  assert.deepEqual(october.top.map((row) => row.sku), ["A", "B", "C"]);
  assert.deepEqual(october.top.map((row) => row.margin), [60, 20, -16]);
  assert.deepEqual(october.bottom.map((row) => row.sku), ["C", "B", "A"]);
  assert.equal(october.rows.some((row) => row.sku === "D"), false);
  assert.equal(october.rows.some((row) => row.sku === "E"), false);

  const ytd = rankSkus(products, sales, monthKeysThrough(2026, 9));
  assert.deepEqual(monthKeysThrough(2026, 9).slice(0, 2), ["2026-01", "2026-02"]);
  assert.equal(monthKeysThrough(2026, 9).at(-1), "2026-10");
  assert.equal(ytd.rows.find((row) => row.sku === "E").margin, 9);
  assert.equal(ytd.top[0].sku, "A");
  assert.equal(ytd.bottom[0].sku, "C");
});

test("budget months and year-to-date start in October 2026", () => {
  assert.equal(BUDGET_START, "2026-10-01");
  assert.deepEqual(activeMonths(2025), []);
  assert.deepEqual(activeMonths(2026), ["Oct", "Nov", "Dec"]);
  assert.equal(activeMonths(2027).length, 12);
  assert.equal(activeMonths(2027)[0], "Jan");
  assert.equal(clampMonthIndex(2026, 0), 9);
  assert.equal(clampMonthIndex(2026, 10), 10);
  assert.equal(clampMonthIndex(2025, 3), 0);
  assert.deepEqual(monthsInPeriod(2026, 9, "ytd"), ["Oct"]);
  assert.deepEqual(monthsInPeriod(2026, 11, "ytd"), ["Oct", "Nov", "Dec"]);
  assert.deepEqual(monthsInPeriod(2026, 2, "ytd"), []);
  assert.deepEqual(monthsInPeriod(2026, 8, "month"), []);
  assert.deepEqual(monthsInPeriod(2026, 9, "month"), ["Oct"]);
  assert.deepEqual(monthsInPeriod(2027, 1, "ytd"), ["Jan", "Feb"]);
  assert.deepEqual(monthKeysInPeriod(2026, 9, "ytd"), ["2026-10"]);
  assert.equal(periodLabel(2026, 11, "ytd"), "Oct–Dec 2026");
  assert.equal(periodLabel(2026, 2, "ytd"), "Budget starts 1 October 2026");

  const actuals = {
    revenueActuals: { Jan: 50, Sep: 999, Oct: 100 },
    costActuals: {
      cogs: { Sep: 400, Oct: 40 },
      labour: { Oct: 10 },
      shipping: { Sep: 80 },
      platform_fees: {},
      marketing: {},
      taxes: {},
      miscellaneous: {},
    },
  };
  const october = profitFromBudget({
    ...actuals,
    months: monthsInPeriod(2026, 9, "ytd"),
  });
  assert.equal(october.revenue, 100);
  assert.equal(october.cogs, 40);
  assert.equal(october.grossProfit, 60);
  assert.equal(october.netProfit, 50);
  assert.equal(Number.isNaN(october.netProfit), false);

  const beforeStart = profitFromBudget({
    revenueActuals: { Jan: 50, Sep: 999 },
    costActuals: {},
    months: monthsInPeriod(2026, 8, "ytd"),
  });
  assert.equal(beforeStart.revenue, 0);
  assert.equal(beforeStart.grossProfit, 0);
  assert.equal(beforeStart.netProfit, 0);
  assert.equal(formatRm(undefined), "RM 0");
  assert.equal(formatRm(NaN), "RM 0");
  assert.equal(formatRm(beforeStart.netProfit), "RM 0");
  assert.equal(formatRm(beforeStart.grossProfit), "RM 0");
});

test("low stock means on-hand stock is at or under the reorder level", () => {
  assert.equal(isLowStock({ active: true, stock_on_hand: 3, reorder_level: 10 }), true);
  assert.equal(isLowStock({ active: true, stock_on_hand: 10, reorder_level: 10 }), true);
  assert.equal(isLowStock({ active: true, stock_on_hand: 11, reorder_level: 10 }), false);
  assert.equal(isLowStock({ active: false, stock_on_hand: 0, reorder_level: 5 }), false);
});
