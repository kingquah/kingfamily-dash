import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import { formatRm, isLowStock, marginPct, skuCogs, skuMargin, skuRevenue } from "./commerce-math.js";

const emptyForm = {
  sku: "",
  name: "",
  unit_cost: "",
  sell_price: "",
  stock_on_hand: "",
  reorder_level: "",
  active: true,
};

function monthNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function missingTable(error) {
  return /does not exist|PGRST205|42P01|schema cache|relation/i.test(
    `${error?.message || ""} ${error?.code || ""}`,
  );
}

export function ProductsPage({ isManager }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [month, setMonth] = useState(monthNow);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);

  async function load() {
    setLoading(true);
    const [productResult, salesResult] = await Promise.all([
      supabase.from("kf_products").select("*").order("sku"),
      supabase.from("kf_product_sales").select("*").eq("month", month),
    ]);
    const failed = [productResult, salesResult].find((result) => result.error);
    if (failed) {
      setNotice(
        missingTable(failed.error)
          ? "Products need supabase/pulse_ecommerce.sql. Run it once in the Supabase SQL editor, then reload."
          : `Couldn't load products. ${failed.error.message || "Try again."}`,
      );
      setLoading(false);
      return;
    }
    setNotice("");
    setProducts(productResult.data || []);
    setSales(salesResult.data || []);
    const next = {};
    for (const sale of salesResult.data || []) {
      next[sale.product_id] = {
        units: String(sale.units_sold ?? ""),
        revenue: sale.revenue == null ? "" : String(sale.revenue),
      };
    }
    setDrafts(next);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [month]);

  const salesByProduct = useMemo(() => {
    const map = {};
    for (const sale of sales) map[sale.product_id] = sale;
    return map;
  }, [sales]);

  const low = products.filter(isLowStock);
  const visible = products.filter((product) => !lowOnly || isLowStock(product));

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      unit_cost: String(product.unit_cost ?? ""),
      sell_price: String(product.sell_price ?? ""),
      stock_on_hand: String(product.stock_on_hand ?? ""),
      reorder_level: String(product.reorder_level ?? ""),
      active: product.active !== false,
    });
  }

  async function saveProduct() {
    const sku = form.sku.trim();
    const name = form.name.trim();
    if (!sku || !name) {
      setNotice("SKU and name are required.");
      return;
    }
    const payload = {
      sku,
      name,
      unit_cost: Number(form.unit_cost) || 0,
      sell_price: Number(form.sell_price) || 0,
      stock_on_hand: Math.max(0, Math.round(Number(form.stock_on_hand) || 0)),
      reorder_level: Math.max(0, Math.round(Number(form.reorder_level) || 0)),
      active: !!form.active,
      updated_at: new Date().toISOString(),
    };
    const query = editingId
      ? supabase.from("kf_products").update(payload).eq("id", editingId)
      : supabase.from("kf_products").insert(payload);
    const { error } = await query;
    if (error) {
      setNotice(/duplicate|unique/i.test(error.message || "") ? "That SKU already exists." : `Couldn't save the SKU. ${error.message}`);
      return;
    }
    setForm(null);
    setNotice("");
    await load();
  }

  async function saveUnits(product) {
    const draft = drafts[product.id] || { units: "", revenue: "" };
    const units = Math.max(0, Math.round(Number(draft.units) || 0));
    const payload = { product_id: product.id, month, units_sold: units };
    if (isManager) payload.revenue = draft.revenue === "" ? null : Number(draft.revenue);
    const { error } = await supabase.from("kf_product_sales").upsert(payload, { onConflict: "product_id,month" });
    if (error) {
      setNotice(`Couldn't save units for ${product.sku}. ${error.message || "Try again."}`);
      return;
    }
    setNotice("");
    await load();
  }

  if (loading) return <div style={{ color: "#9a8a7a", padding: 24 }}>Loading products…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a", margin: 0 }}>📦 Products</h2>
          <p style={{ color: "#9a8a7a", fontSize: 13, margin: "6px 0 0" }}>
            Enter units sold for the month. Margin is revenue minus units × unit cost.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#7a6a5a", fontWeight: 700 }}>
            Month{" "}
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={fieldStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#7a6a5a" }}>
            <input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /> Low stock
          </label>
          {isManager && (
            <button type="button" onClick={startCreate} style={primaryBtn}>Add SKU</button>
          )}
        </div>
      </div>
      {notice && <Banner>{notice}</Banner>}
      {low.length > 0 && (
        <Banner tone="warn">
          Low stock: {low.map((product) => `${product.sku} (${product.stock_on_hand} left, reorder at ${product.reorder_level})`).join(" · ")}
        </Banner>
      )}
      {form && isManager && (
        <div style={panel}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{editingId ? "Edit SKU" : "New SKU"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <Field label="SKU" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} />
            <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="Unit cost" type="number" value={form.unit_cost} onChange={(value) => setForm({ ...form, unit_cost: value })} />
            <Field label="Sell price" type="number" value={form.sell_price} onChange={(value) => setForm({ ...form, sell_price: value })} />
            <Field label="Stock on hand" type="number" value={form.stock_on_hand} onChange={(value) => setForm({ ...form, stock_on_hand: value })} />
            <Field label="Reorder level" type="number" value={form.reorder_level} onChange={(value) => setForm({ ...form, reorder_level: value })} />
          </div>
          <label style={{ display: "block", marginTop: 10, fontSize: 13, color: "#5a4a3a" }}>
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={saveProduct} style={primaryBtn}>Save</button>
            <button type="button" onClick={() => setForm(null)} style={quietBtn}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ ...panel, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
          <thead>
            <tr>
              {["SKU", "Name", "Cost", "Price", "Unit margin", "Stock", "Units", isManager ? "Revenue override" : "Revenue", "Margin", ""].map((heading) => (
                <th key={heading} style={th}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} style={{ ...td, color: "#9a8a7a" }}>No products yet.</td>
              </tr>
            )}
            {visible.map((product) => {
              const sale = salesByProduct[product.id];
              const draft = drafts[product.id] || {
                units: sale ? String(sale.units_sold) : "",
                revenue: sale && sale.revenue != null ? String(sale.revenue) : "",
              };
              const preview = {
                units_sold: draft.units === "" ? 0 : Number(draft.units) || 0,
                revenue: isManager
                  ? (draft.revenue === "" ? null : Number(draft.revenue))
                  : (sale?.revenue ?? null),
              };
              const revenue = skuRevenue(product, preview);
              const margin = skuMargin(product, preview);
              const pct = marginPct(margin, revenue);
              const unitMargin = Number(product.sell_price) - Number(product.unit_cost);
              const lowStock = isLowStock(product);
              return (
                <tr key={product.id} style={{ opacity: product.active === false ? 0.55 : 1 }}>
                  <td style={td}><strong>{product.sku}</strong></td>
                  <td style={td}>{product.name}</td>
                  <td style={td}>{formatRm(product.unit_cost)}</td>
                  <td style={td}>{formatRm(product.sell_price)}</td>
                  <td style={{ ...td, color: unitMargin < 0 ? "#e74c3c" : "#3a2a1a" }}>{formatRm(unitMargin)}</td>
                  <td style={td}>
                    {product.stock_on_hand}
                    {lowStock && <span style={lowBadge}>Low</span>}
                  </td>
                  <td style={td}>
                    <input
                      aria-label={`Units sold for ${product.sku}`}
                      type="number"
                      min="0"
                      value={draft.units}
                      onChange={(event) => setDrafts({ ...drafts, [product.id]: { ...draft, units: event.target.value } })}
                      style={{ ...fieldStyle, width: 72 }}
                    />
                  </td>
                  <td style={td}>
                    {isManager ? (
                      <input
                        aria-label={`Revenue override for ${product.sku}`}
                        type="number"
                        placeholder="Auto"
                        value={draft.revenue}
                        onChange={(event) => setDrafts({ ...drafts, [product.id]: { ...draft, revenue: event.target.value } })}
                        style={{ ...fieldStyle, width: 90 }}
                      />
                    ) : (
                      formatRm(revenue)
                    )}
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: margin < 0 ? "#e74c3c" : "#6B3FA0" }}>
                    {formatRm(margin)}
                    <div style={{ fontWeight: 500, color: "#9a8a7a", fontSize: 11 }}>{pct == null ? "—" : `${Math.round(pct)}%`}</div>
                    <div style={{ fontWeight: 500, color: "#b0a09a", fontSize: 11 }}>COGS {formatRm(skuCogs(product, preview))}</div>
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => saveUnits(product)} style={quietBtn}>Save</button>
                    {isManager && (
                      <button type="button" onClick={() => startEdit(product)} style={{ ...quietBtn, marginLeft: 6 }}>Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: "#9a8a7a" }}>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} style={{ ...fieldStyle, width: "100%", marginTop: 4, display: "block" }} />
    </label>
  );
}

function Banner({ children, tone }) {
  const warn = tone === "warn";
  return (
    <div style={{
      background: warn ? "#fff8ee" : "#fdf0f0",
      border: `1px solid ${warn ? "#f0dcc0" : "#f0c2c2"}`,
      color: warn ? "#8a6a3a" : "#9b2c2c",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      marginBottom: 12,
    }}
    >
      {children}
    </div>
  );
}

const panel = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: 14,
};
const th = {
  textAlign: "left",
  padding: "10px 12px",
  color: "#9a8a7a",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  borderBottom: "2px solid #f0ebe4",
};
const td = { padding: "10px 12px", borderBottom: "1px solid #f6f1ec", color: "#3a2a1a", verticalAlign: "top" };
const fieldStyle = {
  padding: "7px 8px",
  borderRadius: 8,
  border: "1px solid #e0d5cc",
  fontSize: 13,
  fontFamily: "inherit",
};
const primaryBtn = {
  background: "#6B3FA0",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
const quietBtn = {
  background: "#fff",
  color: "#6B3FA0",
  border: "1px solid #e0d5cc",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 700,
};
const lowBadge = {
  marginLeft: 6,
  background: "#fdf0f0",
  color: "#c0392b",
  borderRadius: 99,
  padding: "1px 7px",
  fontSize: 11,
  fontWeight: 800,
};
