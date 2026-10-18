// Shop margin and profit math for Pulse Dashboard.
// Revenue on a SKU is the optional override, otherwise units × sell price.
// Cost of goods is always units × unit cost.
// Net profit is revenue minus all seven cost lines.

export const MONTHS = [
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

export const COST_LINES = [
  { key: "cogs", label: "Cost of Goods" },
  { key: "labour", label: "Labour (Levi)" },
  { key: "shipping", label: "Shipping" },
  { key: "platform_fees", label: "Platform Fees" },
  { key: "marketing", label: "Marketing" },
  { key: "taxes", label: "Taxes" },
  { key: "miscellaneous", label: "Miscellaneous" },
];

export const COST_KEYS = COST_LINES.map((line) => line.key);

export function monthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function monthsThrough(monthIndex) {
  return MONTHS.slice(0, monthIndex + 1);
}

export function monthKeysThrough(year, monthIndex) {
  return Array.from({ length: monthIndex + 1 }, (_, index) => monthKey(year, index));
}

export function skuRevenue(product, sale) {
  if (!sale) return 0;
  const units = Number(sale.units_sold) || 0;
  if (sale.revenue !== null && sale.revenue !== undefined && sale.revenue !== "") {
    return Number(sale.revenue) || 0;
  }
  return units * (Number(product?.sell_price) || 0);
}

export function skuCogs(product, sale) {
  if (!sale) return 0;
  return (Number(sale.units_sold) || 0) * (Number(product?.unit_cost) || 0);
}

export function skuMargin(product, sale) {
  return skuRevenue(product, sale) - skuCogs(product, sale);
}

export function marginPct(margin, revenue) {
  const base = Number(revenue) || 0;
  if (!base) return null;
  return (Number(margin) || 0) / base * 100;
}

export function isLowStock(product) {
  if (!product || product.active === false) return false;
  return Number(product.stock_on_hand) <= Number(product.reorder_level);
}

export function sumActuals(actuals, months) {
  if (!actuals) return 0;
  return months.reduce((sum, month) => sum + (Number(actuals[month]) || 0), 0);
}

export function profitFromBudget({ revenueActuals, costActuals, months }) {
  const revenue = sumActuals(revenueActuals, months);
  const costs = {};
  let totalCosts = 0;
  for (const key of COST_KEYS) {
    const amount = sumActuals(costActuals?.[key], months);
    costs[key] = amount;
    totalCosts += amount;
  }
  const cogs = costs.cogs || 0;
  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    costs,
    totalCosts,
    netProfit: revenue - totalCosts,
  };
}

export function rankSkus(products, sales, monthKeys) {
  const wanted = new Set(monthKeys);
  const rows = (products || [])
    .filter((product) => product.active !== false)
    .map((product) => {
      const periodSales = (sales || []).filter(
        (sale) => sale.product_id === product.id && wanted.has(sale.month),
      );
      let revenue = 0;
      let cogs = 0;
      let units = 0;
      for (const sale of periodSales) {
        revenue += skuRevenue(product, sale);
        cogs += skuCogs(product, sale);
        units += Number(sale.units_sold) || 0;
      }
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        units,
        revenue,
        cogs,
        margin: revenue - cogs,
      };
    })
    .filter((row) => row.units > 0 || row.revenue !== 0);

  const byMargin = [...rows].sort(
    (a, b) => b.margin - a.margin || String(a.sku).localeCompare(String(b.sku)),
  );
  return {
    rows: byMargin,
    top: byMargin.slice(0, 3),
    bottom: [...byMargin].reverse().slice(0, 3),
  };
}

export function formatRm(value) {
  const amount = Number(value) || 0;
  const text = Math.abs(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `(RM ${text})` : `RM ${text}`;
}
