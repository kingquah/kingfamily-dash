import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import {
  COST_KEYS,
  MONTHS,
  formatRm,
  marginPct,
  monthKey,
  monthKeysThrough,
  monthsThrough,
  profitFromBudget,
  rankSkus,
} from "./commerce-math.js";

const card = {
  background: "#fff",
  borderRadius: 14,
  padding: "16px 18px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  borderLeft: "4px solid #6B3FA0",
};

function missingTable(error) {
  return /does not exist|PGRST205|42P01|schema cache|relation/i.test(
    `${error?.message || ""} ${error?.code || ""}`,
  );
}

export function CommerceSummary() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [span, setSpan] = useState("month");
  const [profit, setProfit] = useState(null);
  const [ranked, setRanked] = useState({ top: [], bottom: [] });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNotice("");
      const months = span === "ytd" ? monthsThrough(monthIndex) : [MONTHS[monthIndex]];
      const keys = span === "ytd" ? monthKeysThrough(year, monthIndex) : [monthKey(year, monthIndex)];
      const [lines, products, sales] = await Promise.all([
        supabase.from("kf_budget_lines").select("line_key, actuals").eq("year", year),
        supabase.from("kf_products").select("id, sku, name, unit_cost, sell_price, active"),
        supabase.from("kf_product_sales").select("product_id, month, units_sold, revenue").in("month", keys),
      ]);
      if (cancelled) return;
      const failed = [lines, products, sales].find((result) => result.error);
      if (failed) {
        setProfit(null);
        setRanked({ top: [], bottom: [] });
        setNotice(
          missingTable(failed.error)
            ? "Shop totals need supabase/pulse_ecommerce.sql. Run it once in the Supabase SQL editor, then reload."
            : `Couldn't load shop totals. ${failed.error.message || "Try again."}`,
        );
        return;
      }
      const actuals = {};
      for (const row of lines.data || []) actuals[row.line_key] = row.actuals || {};
      const costs = {};
      for (const key of COST_KEYS) costs[key] = actuals[key] || {};
      setProfit(
        profitFromBudget({
          revenueActuals: actuals.revenue || {},
          costActuals: costs,
          months,
        }),
      );
      setRanked(rankSkus(products.data || [], sales.data || [], keys));
    })();
    return () => {
      cancelled = true;
    };
  }, [year, monthIndex, span]);

  const label = span === "ytd" ? `Jan–${MONTHS[monthIndex]} ${year}` : `${MONTHS[monthIndex]} ${year}`;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Shop results
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#3a2a1a", marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            aria-label="Results year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            style={selectStyle}
          >
            {[year - 1, year, year + 1].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Results month"
            value={monthIndex}
            onChange={(event) => setMonthIndex(Number(event.target.value))}
            style={selectStyle}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>{name}</option>
            ))}
          </select>
          <select aria-label="Month or year to date" value={span} onChange={(event) => setSpan(event.target.value)} style={selectStyle}>
            <option value="month">This month</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
      </div>
      {notice && (
        <div style={{ background: "#fff8ee", border: "1px solid #f0dcc0", color: "#8a6a3a", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
          {notice}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
        <ProfitCard title="Revenue" value={profit?.revenue} hint="Budget actual" />
        <ProfitCard title="Gross profit" value={profit?.grossProfit} hint="Revenue − cost of goods" />
        <ProfitCard title="Net profit" value={profit?.netProfit} hint="After all seven costs" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        <SkuList title="Top 3 by margin" rows={ranked.top} empty="No units entered for this period." />
        <SkuList title="Bottom 3 by margin" rows={ranked.bottom} empty="No units entered for this period." />
      </div>
    </section>
  );
}

function ProfitCard({ title, value, hint }) {
  const amount = Number(value) || 0;
  const color = value == null ? "#3a2a1a" : amount < 0 ? "#e74c3c" : "#3a2a1a";
  return (
    <div style={card}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value == null ? "—" : formatRm(amount)}</div>
      <div style={{ fontSize: 12, color: "#9a8a7a", marginTop: 6 }}>{hint}</div>
    </div>
  );
}

function SkuList({ title, rows, empty }) {
  return (
    <div style={{ ...card, borderLeftColor: "#EDE4F8" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ color: "#9a8a7a", fontSize: 13 }}>{empty}</div>
      ) : (
        rows.map((row, index) => {
          const pct = marginPct(row.margin, row.revenue);
          return (
            <div key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: index ? "1px solid #f4efe9" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3a2a1a" }}>{row.name}</div>
                <div style={{ fontSize: 11, color: "#9a8a7a" }}>{row.sku} · {row.units} sold</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: row.margin < 0 ? "#e74c3c" : "#6B3FA0" }}>{formatRm(row.margin)}</div>
                <div style={{ fontSize: 11, color: "#9a8a7a" }}>{pct == null ? "—" : `${Math.round(pct)}%`}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const selectStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e0d5cc",
  fontSize: 13,
  fontFamily: "inherit",
  background: "#fff",
};
