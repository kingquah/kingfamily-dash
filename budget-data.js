// Pulse Dashboard — shop budget lines.
// Monthly amounts here are zero. The live shop starts fresh on 1 October 2026
// (BUDGET_START in commerce-math.js). supabase/pulse_fresh_start.sql hides the
// older lines without deleting them.

import { COST_LINES } from "./commerce-math.js";

export const BUDGET_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const zeros = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function input(key, label, sign) {
  return {
    kind: "input",
    key,
    label,
    sign,
    budget: 0,
    actuals: zeros(),
  };
}

export const BUDGET_STRUCTURE = [
  { kind: "group", label: "Revenue" },
  input("revenue", "Revenue", 1),
  { kind: "group", label: "Costs" },
  ...COST_LINES.map((line) => input(line.key, line.label, -1)),
  {
    kind: "subtotal",
    key: "total_costs",
    label: "Total Costs",
    members: COST_LINES.map((line) => line.key),
    sign: -1,
  },
  {
    kind: "net",
    key: "gross_profit",
    label: "Gross Profit",
    income: ["revenue"],
    deduct: ["cogs"],
  },
  {
    kind: "net",
    key: "net_profit",
    label: "Net Profit",
    income: ["revenue"],
    deduct: ["total_costs"],
  },
  {
    kind: "npm",
    key: "npm",
    label: "Net Profit Margin %",
    net: "net_profit",
    base: "revenue",
  },
];

// Custom lines added from the Budget tab roll into Total Costs.
export const BUDGET_SECTIONS = [{ label: "Costs", subtotal: "total_costs" }];

export const sectionSubtotal = Object.fromEntries(
  BUDGET_SECTIONS.map((section) => [section.label, section.subtotal]),
);

export const labelByKey = Object.fromEntries(
  BUDGET_STRUCTURE.filter((line) => line.key).map((line) => [line.key, line.label]),
);
