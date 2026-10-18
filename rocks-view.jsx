import { Fragment, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

const STATUS = {
  complete: { color: "#27ae60", label: "Complete" },
  attention: { color: "#f39c12", label: "Needs attention" },
  dropped: { color: "#e74c3c", label: "Dropped" },
};
const STATUS_ORDER = ["complete", "attention", "dropped"];
const DEPT_COLORS = [
  { bg: "#f3eafa", accent: "#6B3FA0" },
  { bg: "#e9f7ef", accent: "#1e7a46" },
  { bg: "#fdf3e0", accent: "#e08a2a" },
  { bg: "#eaf1fb", accent: "#2f6fb0" },
  { bg: "#fdeaf0", accent: "#d6557b" },
];

function currentQuarter(date = new Date()) {
  return { year: date.getFullYear(), quarter: Math.floor(date.getMonth() / 3) + 1 };
}

function missingTable(error) {
  return /does not exist|PGRST205|42P01|schema cache|relation/i.test(
    `${error?.message || ""} ${error?.code || ""}`,
  );
}

function clip(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function fmtDeadline(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function RocksPage({ currentUser, users = [], isManager }) {
  const initial = currentQuarter();
  const [year, setYear] = useState(initial.year);
  const [quarter, setQuarter] = useState(initial.quarter);
  const [quarters, setQuarters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [audit, setAudit] = useState([]);
  const [archives, setArchives] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [openArchive, setOpenArchive] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const active = quarters.find((row) => row.year === year && row.quarter === quarter) || null;
  const groups = departments
    .filter((row) => active && row.quarter_id === active.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  async function load() {
    setLoading(true);
    const [quarterResult, departmentResult, rockResult, auditResult, archiveResult] = await Promise.all([
      supabase.from("kf_rock_quarters").select("*"),
      supabase.from("kf_rock_departments").select("*"),
      supabase.from("kf_rocks").select("*"),
      supabase.from("kf_rock_audit").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("kf_rock_archive").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const failed = [quarterResult, departmentResult, rockResult].find((result) => result.error);
    if (failed) {
      setNotice(
        missingTable(failed.error)
          ? "Rocks need supabase/pulse_ecommerce.sql. Run it once in the Supabase SQL editor, then reload."
          : `Couldn't load rocks. ${failed.error.message || "Try again."}`,
      );
      setLoading(false);
      return;
    }
    setNotice("");
    setQuarters(quarterResult.data || []);
    setDepartments(departmentResult.data || []);
    setRocks(rockResult.data || []);
    setAudit(auditResult.error ? [] : auditResult.data || []);
    setArchives(archiveResult.error ? [] : archiveResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function log(detail) {
    const { data, error } = await supabase
      .from("kf_rock_audit")
      .insert({ detail, user_id: currentUser?.id ?? null, user_name: currentUser?.name ?? null })
      .select()
      .single();
    if (!error && data) setAudit((prev) => [data, ...prev]);
  }

  async function openQuarter() {
    const { data, error } = await supabase
      .from("kf_rock_quarters")
      .insert({ year, quarter, theme: "", bep: "", goal: "", rules: "" })
      .select()
      .single();
    if (error) {
      setNotice(`Couldn't open the quarter. ${error.message || "Try again."}`);
      return;
    }
    setQuarters((prev) => [...prev, data]);
    await log(`opened Q${quarter} ${year}`);
  }

  async function saveQuarter(field, value) {
    if (!active) return;
    const { error } = await supabase.from("kf_rock_quarters").update({ [field]: value }).eq("id", active.id);
    if (error) {
      setNotice(`Couldn't save the header. ${error.message || "Try again."}`);
      return;
    }
    setQuarters((prev) => prev.map((row) => (row.id === active.id ? { ...row, [field]: value } : row)));
    await log(`updated Q${quarter} ${year} · ${field}`);
  }

  async function addDepartment() {
    if (!active) return;
    const { data, error } = await supabase
      .from("kf_rock_departments")
      .insert({ quarter_id: active.id, name: "New department", sort_order: groups.length })
      .select()
      .single();
    if (error) {
      setNotice(`Couldn't add the department. ${error.message || "Try again."}`);
      return;
    }
    setDepartments((prev) => [...prev, data]);
    await log("added a department");
  }

  async function renameDepartment(row, name) {
    const next = name.trim();
    if (!next || next === row.name) return;
    const { error } = await supabase.from("kf_rock_departments").update({ name: next }).eq("id", row.id);
    if (error) {
      setNotice(`Couldn't rename the department. ${error.message || "Try again."}`);
      return;
    }
    setDepartments((prev) => prev.map((item) => (item.id === row.id ? { ...item, name: next } : item)));
    await log(`renamed department "${row.name}" to "${next}"`);
  }

  async function deleteDepartment(row) {
    const count = rocks.filter((rock) => rock.department_id === row.id && !rock.archived).length;
    if (!window.confirm(`Delete department "${row.name}" and its ${count} rock(s)?`)) return;
    const { error } = await supabase.from("kf_rock_departments").delete().eq("id", row.id);
    if (error) {
      setNotice(`Couldn't delete the department. ${error.message || "Try again."}`);
      return;
    }
    setDepartments((prev) => prev.filter((item) => item.id !== row.id));
    setRocks((prev) => prev.filter((rock) => rock.department_id !== row.id));
    await log(`deleted department "${row.name}"`);
  }

  async function addRock(department) {
    const { data, error } = await supabase
      .from("kf_rocks")
      .insert({
        department_id: department.id,
        title: "New rock",
        notes: "",
        updates: "",
        remarks: "",
        progress: 0,
        status: "",
        sort_order: rocks.filter((rock) => rock.department_id === department.id).length,
      })
      .select()
      .single();
    if (error) {
      setNotice(`Couldn't add the rock. ${error.message || "Try again."}`);
      return;
    }
    setRocks((prev) => [...prev, data]);
    await log(`added a rock to ${department.name}`);
  }

  async function patchRock(rock, fields, detail) {
    const { data, error } = await supabase.from("kf_rocks").update(fields).eq("id", rock.id).select().single();
    if (error) {
      setNotice(`Couldn't update the rock. ${error.message || "Try again."}`);
      return;
    }
    setRocks((prev) => prev.map((item) => (item.id === rock.id ? data : item)));
    if (detail) await log(detail);
  }

  async function deleteRock(rock) {
    if (!window.confirm(`Delete rock "${rock.title || "Untitled"}"?`)) return;
    const { error } = await supabase.from("kf_rocks").delete().eq("id", rock.id);
    if (error) {
      setNotice(`Couldn't delete the rock. ${error.message || "Try again."}`);
      return;
    }
    setRocks((prev) => prev.filter((item) => item.id !== rock.id));
    await log(`deleted rock "${clip(rock.title)}"`);
  }

  async function archiveRock(rock, departmentName) {
    if (!window.confirm("Mark this rock done and file it in the complete archives?")) return;
    const owner = users.find((user) => user.id === rock.owner_id);
    const { data, error } = await supabase
      .from("kf_rock_archive")
      .insert({
        title: rock.title,
        department: departmentName,
        details: { ...rock, owner_name: owner?.name || "" },
        user_id: currentUser?.id ?? null,
        user_name: currentUser?.name ?? null,
      })
      .select()
      .single();
    if (error) {
      setNotice(`Couldn't archive the rock. ${error.message || "Try again."}`);
      return;
    }
    await patchRock(rock, { archived: true, status: "complete", progress: 100 }, null);
    setArchives((prev) => [data, ...prev]);
    await log(`completed and archived "${clip(rock.title)}"`);
  }

  if (loading) return <div style={{ color: "#9a8a7a", padding: 24 }}>Loading rocks…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#3a2a1a", margin: 0 }}>🪨 Rocks</h2>
          <p style={{ color: "#9a8a7a", fontSize: 13, margin: "6px 0 0" }}>
            Quarterly goals. {isManager ? "Double-click a goal to edit it." : "You can update progress and status."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select aria-label="Rock year" value={year} onChange={(event) => setYear(Number(event.target.value))} style={selectStyle}>
            {[year - 1, year, year + 1].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Rock quarter" value={quarter} onChange={(event) => setQuarter(Number(event.target.value))} style={selectStyle}>
            {[1, 2, 3, 4].map((value) => <option key={value} value={value}>Q{value}</option>)}
          </select>
        </div>
      </div>
      {notice && <div style={warn}>{notice}</div>}
      {!active ? (
        <div style={{ ...panel, marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No board for Q{quarter} {year} yet.</div>
          {isManager ? (
            <button type="button" onClick={openQuarter} style={primaryBtn}>Open this quarter</button>
          ) : (
            <div style={{ color: "#9a8a7a", fontSize: 13 }}>A manager can open the quarter.</div>
          )}
        </div>
      ) : (
        <>
          <div style={{ ...panel, marginTop: 16, borderLeft: "4px solid #6B3FA0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 12 }}>
              <HeaderField label="Theme" value={active.theme} canEdit={isManager} onSave={(value) => saveQuarter("theme", value)} />
              <HeaderField label="Break even" value={active.bep} canEdit={isManager} onSave={(value) => saveQuarter("bep", value)} />
              <HeaderField label="Goal" value={active.goal} canEdit={isManager} onSave={(value) => saveQuarter("goal", value)} accent />
            </div>
            <div style={kicker}>Rules</div>
            <Editable value={active.rules} canEdit={isManager} multiline placeholder="House rules…" onSave={(value) => saveQuarter("rules", value)} />
          </div>
          <div style={{ ...panel, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>
                  {["Status", "Rock", "What success looks like", "Owner", "Deadline", "Progress", "Remarks", "Done", ""].map((heading) => (
                    <th key={heading} style={th}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((department, index) => {
                  const color = DEPT_COLORS[index % DEPT_COLORS.length];
                  const rows = rocks
                    .filter((rock) => rock.department_id === department.id && !rock.archived)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <Fragment key={department.id}>
                      <tr>
                        <td colSpan={9} style={{ background: color.bg, padding: "10px 12px", borderLeft: `4px solid ${color.accent}` }}>
                          <span style={{ fontWeight: 800, color: color.accent, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 13 }}>
                            <Editable value={department.name} canEdit={isManager} onSave={(value) => renameDepartment(department, value)} style={{ color: color.accent }} />
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: color.accent }}>{rows.length}</span>
                          {isManager && (
                            <button type="button" onClick={() => deleteDepartment(department)} style={textBtn}>Delete department</button>
                          )}
                        </td>
                      </tr>
                      {rows.map((rock) => (
                        <tr key={rock.id} style={{ background: STATUS[rock.status] ? `${STATUS[rock.status].color}10` : "transparent" }}>
                          <td style={td}>
                            <div style={{ display: "flex", gap: 5 }}>
                              {STATUS_ORDER.map((key) => {
                                const on = rock.status === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    title={STATUS[key].label}
                                    aria-label={STATUS[key].label}
                                    onClick={() => patchRock(rock, { status: on ? "" : key }, `${on ? "cleared" : "marked"} "${clip(rock.title)}" as ${STATUS[key].label}`)}
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: "50%",
                                      padding: 0,
                                      background: on ? STATUS[key].color : "transparent",
                                      border: `2px solid ${STATUS[key].color}`,
                                      opacity: on ? 1 : 0.4,
                                      cursor: "pointer",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </td>
                          <td style={td}>
                            <Editable
                              value={rock.title}
                              canEdit={isManager}
                              onSave={(value) => patchRock(rock, { title: value }, `updated title on "${clip(rock.title)}"`)}
                              style={{ fontWeight: 700, textDecoration: rock.status === "dropped" ? "line-through" : "none" }}
                            />
                          </td>
                          <td style={td}>
                            <Editable value={rock.notes} canEdit={isManager} multiline onSave={(value) => patchRock(rock, { notes: value }, `updated success notes on "${clip(rock.title)}"`)} />
                          </td>
                          <td style={td}>
                            {isManager ? (
                              <select
                                aria-label={`Owner of ${rock.title}`}
                                value={rock.owner_id == null ? "" : String(rock.owner_id)}
                                onChange={(event) => {
                                  const ownerId = event.target.value ? Number(event.target.value) : null;
                                  const owner = users.find((user) => user.id === ownerId);
                                  patchRock(rock, { owner_id: ownerId }, `set owner of "${clip(rock.title)}" to ${owner?.name || "nobody"}`);
                                }}
                                style={selectStyle}
                              >
                                <option value="">Unassigned</option>
                                {users.map((user) => (
                                  <option key={user.id} value={String(user.id)}>{user.name}</option>
                                ))}
                              </select>
                            ) : (
                              users.find((user) => user.id === rock.owner_id)?.name || "—"
                            )}
                          </td>
                          <td style={td}>
                            {isManager ? (
                              <input
                                type="date"
                                aria-label={`Deadline for ${rock.title}`}
                                value={rock.deadline || ""}
                                onChange={(event) => patchRock(rock, { deadline: event.target.value || null }, `updated deadline on "${clip(rock.title)}"`)}
                                style={selectStyle}
                              />
                            ) : (
                              fmtDeadline(rock.deadline) || "—"
                            )}
                          </td>
                          <td style={{ ...td, minWidth: 160 }}>
                            <ProgressField
                              value={rock.progress}
                              label={`Progress for ${rock.title}`}
                              onCommit={(progress) => {
                                if (progress !== rock.progress) {
                                  patchRock(rock, { progress }, `set progress on "${clip(rock.title)}" to ${progress}%`);
                                }
                              }}
                            />
                            <div style={{ background: "#ede8e3", borderRadius: 99, height: 6, margin: "6px 0" }}>
                              <div style={{ width: `${rock.progress}%`, height: "100%", background: "#6B3FA0", borderRadius: 99 }} />
                            </div>
                            <Editable value={rock.updates} canEdit multiline placeholder="Add update…" onSave={(value) => patchRock(rock, { updates: value }, `updated progress notes on "${clip(rock.title)}"`)} />
                          </td>
                          <td style={td}>
                            <Editable value={rock.remarks} canEdit={isManager} multiline onSave={(value) => patchRock(rock, { remarks: value }, `updated remarks on "${clip(rock.title)}"`)} />
                          </td>
                          <td style={td}>
                            <button type="button" title="Mark done and archive" onClick={() => archiveRock(rock, department.name)} style={textBtn}>✅</button>
                          </td>
                          <td style={td}>
                            {isManager && (
                              <button type="button" onClick={() => deleteRock(rock)} style={textBtn}>Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {isManager && (
                        <tr>
                          <td colSpan={9} style={{ padding: "8px 12px" }}>
                            <button type="button" onClick={() => addRock(department)} style={textBtn}>+ Add rock</button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isManager && (
            <button type="button" onClick={addDepartment} style={{ ...primaryBtn, marginTop: 12 }}>+ Add department</button>
          )}
        </>
      )}
      <div style={{ ...panel, marginTop: 16 }}>
        <button type="button" onClick={() => setShowAudit((value) => !value)} style={{ ...textBtn, fontWeight: 800, color: "#3a2a1a" }}>
          Audit trail ({audit.length}) {showAudit ? "▲" : "▼"}
        </button>
        {showAudit && (
          <div style={{ marginTop: 10 }}>
            {audit.length === 0 && <div style={{ color: "#9a8a7a", fontSize: 13 }}>No edits recorded yet.</div>}
            {audit.map((row) => (
              <div key={row.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "7px 0", borderBottom: "1px solid #f6f1ec", fontSize: 13 }}>
                <strong>{row.user_name || "—"}</strong>
                <span style={{ color: "#7a6a5a" }}>{row.detail}</span>
                <span style={{ marginLeft: "auto", color: "#b0a294", fontSize: 11 }}>{fmtDeadline(row.created_at)}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, fontWeight: 800, color: "#1e7a46" }}>Task complete archives ({archives.length})</div>
            {archives.length === 0 && <div style={{ color: "#9a8a7a", fontSize: 13, marginTop: 6 }}>No rocks archived yet.</div>}
            {archives.map((row) => {
              const details = row.details || {};
              const open = openArchive === row.id;
              return (
                <div key={row.id} style={{ borderBottom: "1px solid #f6f1ec", padding: "8px 0" }}>
                  <button type="button" onClick={() => setOpenArchive(open ? null : row.id)} style={{ ...textBtn, color: "#3a2a1a" }}>
                    ✅ {row.title} {row.department ? `· ${row.department}` : ""} {open ? "▲" : "▼"}
                  </button>
                  {open && (
                    <div style={{ background: "#faf7f3", borderRadius: 8, padding: 10, marginTop: 6, fontSize: 13, color: "#5a4a3a" }}>
                      {details.owner_name && <div>Owner: {details.owner_name}</div>}
                      {details.deadline && <div>Deadline: {fmtDeadline(details.deadline)}</div>}
                      {details.notes && <div style={{ marginTop: 4 }}>Success: {details.notes}</div>}
                      {details.updates && <div style={{ marginTop: 4 }}>Updates: {details.updates}</div>}
                      {details.remarks && <div style={{ marginTop: 4 }}>Remarks: {details.remarks}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressField({ value, label, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => setDraft(String(value ?? 0)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      min="0"
      max="100"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const progress = Math.max(0, Math.min(100, Math.round(Number(draft) || 0)));
        setDraft(String(progress));
        onCommit(progress);
      }}
      style={{ ...selectStyle, width: 70 }}
    />
  );
}

function HeaderField({ label, value, canEdit, onSave, accent }) {
  return (
    <div>
      <div style={kicker}>{label}</div>
      <div style={{ fontWeight: 700, color: accent ? "#1e7a46" : "#3a2a1a" }}>
        <Editable value={value} canEdit={canEdit} placeholder="—" onSave={onSave} />
      </div>
    </div>
  );
}

function Editable({ value, onSave, canEdit, placeholder = "—", multiline, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => {
    if (!editing) setDraft(value || "");
  }, [value, editing]);
  const commit = () => {
    setEditing(false);
    if ((draft || "") !== (value || "")) onSave(draft);
  };
  if (editing && canEdit) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          style={{ ...editStyle, minHeight: 64 }}
        />
      );
    }
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
        style={editStyle}
      />
    );
  }
  return (
    <span
      onDoubleClick={() => canEdit && setEditing(true)}
      title={canEdit ? "Double-click to edit" : undefined}
      style={{ whiteSpace: "pre-wrap", cursor: canEdit ? "pointer" : "default", color: value ? "inherit" : "#c0b5ae", ...style }}
    >
      {value || placeholder}
    </span>
  );
}

const panel = {
  background: "#fff",
  borderRadius: 16,
  padding: "16px 18px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
};
const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 11,
  color: "#9a8a7a",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  borderBottom: "2px solid #f0ebe4",
};
const td = { padding: "10px 12px", borderBottom: "1px solid #f6f1ec", verticalAlign: "top", fontSize: 13, color: "#3a2a1a" };
const kicker = { fontSize: 11, fontWeight: 700, color: "#9a8a7a", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 };
const selectStyle = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #e0d5cc",
  fontFamily: "inherit",
  fontSize: 13,
  background: "#fff",
};
const editStyle = {
  width: "100%",
  font: "inherit",
  border: "1.5px solid #6B3FA0",
  borderRadius: 6,
  padding: "5px 7px",
  boxSizing: "border-box",
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
const textBtn = {
  background: "none",
  border: "none",
  color: "#6B3FA0",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: 13,
};
const warn = {
  background: "#fff8ee",
  border: "1px solid #f0dcc0",
  color: "#8a6a3a",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  marginTop: 12,
};
