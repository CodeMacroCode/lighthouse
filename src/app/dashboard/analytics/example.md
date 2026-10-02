import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, FolderOpen, ShieldAlert,
  Plus, Search, ChevronRight, MapPin, FileWarning, X
} from "lucide-react";

/* ---------------- design tokens ---------------- */
const INK = "#0F1B2D";
const STEEL = "#1F3A5F";
const BG = "#F5F6F8";
const CARD = "#FFFFFF";
const BORDER = "#E2E5EA";
const MUTED = "#5B6472";

const SEVERITY_COLORS = { Low: "#2F855A", Medium: "#B7791F", High: "#C05621", Critical: "#7C2D2D" };
const STATUS_COLORS = { Open: "#B7791F", Closed: "#2F855A" };
const SEVERITY_LEVELS = ["Low", "Medium", "High", "Critical"];
const REGIONS = ["North", "South", "East", "West", "Central"];
const ROLES = ["RSO", "AOM", "BM"];

const INCIDENT_TYPES = [
  { name: "Accident", severity: "Medium" },
  { name: "Behavioural Issue", severity: "Low" },
  { name: "Corporal Punishment", severity: "Critical" },
  { name: "Health Problem", severity: "Medium" },
  { name: "POCSO", severity: "Critical" },
  { name: "Unsubstantiated Claims", severity: "High" },
  { name: "Misconduct", severity: "Medium" },
  { name: "Near Miss", severity: "Low" },
  { name: "Theft", severity: "Low" },
  { name: "Other", severity: "Medium" },
];

/* Illustrative national dataset — 23 states/UTs mapped to a simplified tile grid.
   Replace with your live reporting database at rollout; this is for concept demo only. */
const STATE_DATA = [
  { state: "J&K", zone: "North", row: 0, col: 3, centres: 22, incidents: 3 },
  { state: "Punjab", zone: "North", row: 1, col: 2, centres: 58, incidents: 6 },
  { state: "Himachal", zone: "North", row: 1, col: 3, centres: 19, incidents: 2 },
  { state: "Uttarakhand", zone: "North", row: 1, col: 4, centres: 24, incidents: 4 },
  { state: "Haryana", zone: "North", row: 2, col: 2, centres: 71, incidents: 9 },
  { state: "Delhi NCR", zone: "North", row: 2, col: 3, centres: 96, incidents: 14 },
  { state: "Uttar Pradesh", zone: "North", row: 2, col: 4, centres: 168, incidents: 27 },
  { state: "Rajasthan", zone: "West", row: 2, col: 1, centres: 84, incidents: 11 },
  { state: "Bihar", zone: "East", row: 2, col: 5, centres: 92, incidents: 16 },
  { state: "Assam", zone: "East", row: 2, col: 6, centres: 31, incidents: 5 },
  { state: "Gujarat", zone: "West", row: 3, col: 1, centres: 103, incidents: 9 },
  { state: "Madhya Pradesh", zone: "Central", row: 3, col: 3, centres: 89, incidents: 13 },
  { state: "Jharkhand", zone: "East", row: 3, col: 4, centres: 44, incidents: 8 },
  { state: "West Bengal", zone: "East", row: 3, col: 5, centres: 97, incidents: 12 },
  { state: "Maharashtra", zone: "West", row: 4, col: 2, centres: 176, incidents: 15 },
  { state: "Chhattisgarh", zone: "Central", row: 4, col: 3, centres: 38, incidents: 6 },
  { state: "Odisha", zone: "East", row: 4, col: 4, centres: 61, incidents: 10 },
  { state: "Goa", zone: "West", row: 5, col: 1, centres: 12, incidents: 1 },
  { state: "Karnataka", zone: "South", row: 5, col: 2, centres: 141, incidents: 10 },
  { state: "Telangana", zone: "South", row: 5, col: 3, centres: 78, incidents: 7 },
  { state: "Andhra Pradesh", zone: "South", row: 5, col: 4, centres: 86, incidents: 9 },
  { state: "Kerala", zone: "South", row: 6, col: 2, centres: 67, incidents: 4 },
  { state: "Tamil Nadu", zone: "South", row: 6, col: 3, centres: 143, incidents: 11 },
];

function rateOf(s) { return Math.round((s.incidents / s.centres) * 1000) / 10; }
function rateColor(rate) {
  if (rate >= 14) return "#7C2D2D";
  if (rate >= 10) return "#C05621";
  if (rate >= 6) return "#B7791F";
  return "#2F855A";
}

const ESCALATION_MATRIX = [
  { severity: "Low", owner: "Branch Manager (BM)", sla: "3 working days",
    action: "Log the case, investigate locally, resolve and close. Include in weekly summary to AOM." },
  { severity: "Medium", owner: "Area Operations Manager (AOM)", sla: "48 hours",
    action: "Review with BM, agree corrective action, keep RSO informed via weekly rollup." },
  { severity: "High", owner: "Regional Safety Officer (RSO)", sla: "24 hours",
    action: "Lead investigation directly, initiate parent/guardian communication, notify Central Safety Team." },
  { severity: "Critical", owner: "Central Safety & Compliance", sla: "2 hours — immediate",
    action: "RSO and Central notified simultaneously. Mandatory / statutory reporting triggered (e.g. POCSO, Corporal Punishment)." },
];

const SAMPLE_SEED = [
  { id: "PK-NOR-0001", region: "North", type: "Accident", severity: "Medium", status: "Closed", date: "2026-03-04", reportedByName: "A. Verma", reportedByRole: "BM", description: "Minor fall on playground during outdoor play, first aid given." },
  { id: "PK-SOU-0002", region: "South", type: "Near Miss", severity: "Low", status: "Closed", date: "2026-03-11", reportedByName: "R. Iyer", reportedByRole: "BM", description: "Unlatched gate noticed and secured before any child reached it." },
  { id: "PK-EAS-0003", region: "East", type: "Behavioural Issue", severity: "Low", status: "Open", date: "2026-04-02", reportedByName: "S. Nair", reportedByRole: "AOM", description: "Repeated biting incident between two toddlers, parents informed." },
  { id: "PK-WES-0004", region: "West", type: "Health Problem", severity: "Medium", status: "Closed", date: "2026-04-14", reportedByName: "P. Shah", reportedByRole: "BM", description: "Fever spike, parent contacted and child sent home." },
  { id: "PK-CEN-0005", region: "Central", type: "Unsubstantiated Claims", severity: "High", status: "Open", date: "2026-05-06", reportedByName: "M. Das", reportedByRole: "RSO", description: "Claim raised by a parent, under review, no evidence found so far." },
  { id: "PK-NOR-0006", region: "North", type: "Misconduct", severity: "Medium", status: "Open", date: "2026-05-19", reportedByName: "A. Verma", reportedByRole: "AOM", description: "Staff conduct concern raised, HR informed, review in progress." },
];

/* ---------------- helpers ---------------- */
const fontLinkId = "prek-dashboard-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(fontLinkId)) return;
    const link = document.createElement("link");
    link.id = fontLinkId;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

function monthLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function monthKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function keyLabel(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function Badge({ text, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide"
      style={{ background: `${color}1A`, color, fontFamily: "Inter" }}
    >
      {text}
    </span>
  );
}

/* ---------------- main component ---------------- */
export default function IncidentDashboard() {
  useFonts();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [activeRegion, setActiveRegion] = useState("All");
  const [activeMonth, setActiveMonth] = useState("All");
  const [tab, setTab] = useState("national");
  const [logFilter, setLogFilter] = useState("All");
  const [logSearch, setLogSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("incidents", true);
        setIncidents(res ? JSON.parse(res.value) : SAMPLE_SEED);
        if (!res) await window.storage.set("incidents", JSON.stringify(SAMPLE_SEED), true);
      } catch (e) {
        setIncidents(SAMPLE_SEED);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(list) {
    setIncidents(list);
    try {
      const ok = await window.storage.set("incidents", JSON.stringify(list), true);
      if (!ok) setSaveError(true);
    } catch (e) {
      setSaveError(true);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function addIncident(newCase) {
    const seq = incidents.length + 1;
    const id = `PK-${newCase.region.slice(0, 3).toUpperCase()}-${String(seq).padStart(4, "0")}`;
    const full = { ...newCase, id };
    await persist([full, ...incidents]);
    showToast(`Case ${id} logged and routed to ${ESCALATION_MATRIX.find(e => e.severity === newCase.severity).owner}`);
    setTab("log");
  }

  async function toggleStatus(id) {
    const list = incidents.map(i => i.id === id ? { ...i, status: i.status === "Open" ? "Closed" : "Open" } : i);
    await persist(list);
  }

  const regionFiltered = useMemo(
    () => activeRegion === "All" ? incidents : incidents.filter(i => i.region === activeRegion),
    [incidents, activeRegion]
  );

  const filtered = useMemo(
    () => regionFiltered.filter(i => activeMonth === "All" || monthKey(i.date) === activeMonth),
    [regionFiltered, activeMonth]
  );

  const monthOptions = useMemo(() => {
    const map = new Map();
    incidents.forEach(i => {
      const k = monthKey(i.date);
      if (!map.has(k)) map.set(k, keyLabel(k));
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([key, label]) => ({ key, label }));
  }, [incidents]);

  const monthlySummary = useMemo(() => {
    const map = {};
    regionFiltered.forEach(i => {
      const k = monthKey(i.date);
      if (!map[k]) map[k] = { key: k, label: keyLabel(k), total: 0, open: 0, closed: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
      map[k].total += 1;
      map[k][i.status === "Open" ? "open" : "closed"] += 1;
      map[k][i.severity] += 1;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [regionFiltered]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter(i => i.status === "Open").length;
    const critical = filtered.filter(i => i.severity === "High" || i.severity === "Critical").length;
    const closed = total - open;
    const closureRate = total ? Math.round((closed / total) * 100) : 100;
    return { total, open, critical, closureRate };
  }, [filtered]);

  const trendData = useMemo(() => {
    const map = {};
    filtered.forEach(i => {
      const k = monthKey(i.date);
      if (!map[k]) map[k] = { key: k, label: monthLabel(i.date), Low: 0, Medium: 0, High: 0, Critical: 0 };
      map[k][i.severity] += 1;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  const typeData = useMemo(() => {
    const map = {};
    filtered.forEach(i => { map[i.type] = (map[i.type] || 0) + 1; });
    return INCIDENT_TYPES.map(t => ({ name: t.name, count: map[t.name] || 0 })).filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const regionData = useMemo(() => {
    return REGIONS.map(r => {
      const list = incidents.filter(i => i.region === r);
      const closed = list.filter(i => i.status === "Closed").length;
      return { name: r, total: list.length, closureRate: list.length ? Math.round((closed / list.length) * 100) : 100 };
    });
  }, [incidents]);

  const severityPie = useMemo(() => {
    return SEVERITY_LEVELS.map(s => ({ name: s, value: filtered.filter(i => i.severity === s).length }))
      .filter(s => s.value > 0);
  }, [filtered]);

  const heatmap = useMemo(() => {
    const regionsShown = activeRegion === "All" ? REGIONS : [activeRegion];
    return INCIDENT_TYPES.map(t => {
      const row = { type: t.name };
      let rowTotal = 0;
      regionsShown.forEach(r => {
        const c = incidents.filter(i => i.region === r && i.type === t.name).length;
        row[r] = c;
        rowTotal += c;
      });
      row.total = rowTotal;
      return row;
    }).filter(r => r.total > 0);
  }, [incidents, activeRegion]);

  const logRows = useMemo(() => {
    return filtered
      .filter(i => logFilter === "All" || i.status === logFilter)
      .filter(i => !logSearch || i.id.toLowerCase().includes(logSearch.toLowerCase()) || i.description.toLowerCase().includes(logSearch.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filtered, logFilter, logSearch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, fontFamily: "Inter" }}>
        <div style={{ color: MUTED }}>Loading incident portal…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: BG, fontFamily: "Inter" }}>
      {/* header */}
      <div style={{ background: INK }} className="w-full">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} color="#E8843A" />
              <span style={{ fontFamily: "Archivo", fontWeight: 800, letterSpacing: "0.02em", color: "#fff" }} className="text-lg">
                PRE-K DIVISION — NATIONAL INCIDENT &amp; SAFETY PORTAL
              </span>
            </div>
            <div style={{ color: "#9AA7BD", fontFamily: "IBM Plex Mono" }} className="text-xs mt-1">
              ~2,000 centres · 5 zones · logged by RSO / AOM / BM · live case tracking
            </div>
          </div>
          <button
            onClick={() => setTab("report")}
            className="flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm"
            style={{ background: "#E8843A", color: INK, fontFamily: "Inter" }}
          >
            <Plus size={16} /> Report Incident
          </button>
        </div>
      </div>

      {/* zone tabs */}
      {tab !== "national" && (
      <div className="w-full border-b" style={{ background: CARD, borderColor: BORDER }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-3">
          <div className="flex gap-1 overflow-x-auto">
            {["All", ...REGIONS].map(r => (
              <button
                key={r}
                onClick={() => { setActiveRegion(r); if (tab === "national") setTab("overview"); }}
                className="px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderColor: activeRegion === r ? "#E8843A" : "transparent",
                  color: activeRegion === r ? INK : MUTED,
                  fontFamily: "Inter",
                }}
              >
                {r === "All" ? "All Zones" : `${r} Zone`}
              </button>
            ))}
          </div>
          <select
            value={activeMonth}
            onChange={e => setActiveMonth(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded border flex-shrink-0"
            style={{ borderColor: BORDER, color: INK, fontFamily: "Inter" }}
          >
            <option value="All">All Months</option>
            {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* KPI strip */}
        {tab !== "national" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Incidents", value: kpis.total, icon: FolderOpen, color: STEEL },
            { label: "Open Cases", value: kpis.open, icon: Clock, color: STATUS_COLORS.Open },
            { label: "High / Critical", value: kpis.critical, icon: AlertTriangle, color: SEVERITY_COLORS.Critical },
            { label: "Closure Rate", value: `${kpis.closureRate}%`, icon: CheckCircle2, color: STATUS_COLORS.Closed },
          ].map((k, idx) => (
            <div key={idx} className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${k.color}` }}>
              <div className="flex items-center justify-between">
                <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: "1.9rem", color: INK }}>{k.value}</div>
                <k.icon size={18} color={k.color} />
              </div>
              <div style={{ color: MUTED }} className="text-xs mt-1 font-medium">{k.label}</div>
            </div>
          ))}
        </div>
        )}

        {/* tab nav */}
        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: BORDER }}>
          {[
            { id: "national", label: "National" },
            { id: "overview", label: "Zone Overview" },
            { id: "matrix", label: "Escalation Matrix" },
            { id: "report", label: "Report Incident" },
            { id: "log", label: "Case Log" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-sm font-semibold border-b-2 -mb-px"
              style={{ borderColor: tab === t.id ? STEEL : "transparent", color: tab === t.id ? INK : MUTED }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {saveError && (
          <div className="mb-4 px-3 py-2 rounded text-sm" style={{ background: "#FDECEC", color: "#7C2D2D" }}>
            Storage isn't available right now — new entries will show for this session only.
          </div>
        )}

        {tab === "national" && <NationalView onSelectZone={z => { setActiveRegion(z); setTab("overview"); }} />}
        {tab === "overview" && (
          <Overview trendData={trendData} typeData={typeData} regionData={regionData} severityPie={severityPie}
            heatmap={heatmap} activeRegion={activeRegion} monthlySummary={monthlySummary} activeMonth={activeMonth}
            onSelectMonth={setActiveMonth} />
        )}
        {tab === "matrix" && <EscalationMatrixView />}
        {tab === "report" && <ReportForm onSubmit={addIncident} defaultRegion={activeRegion} />}
        {tab === "log" && (
          <CaseLog rows={logRows} filter={logFilter} setFilter={setLogFilter}
            search={logSearch} setSearch={setLogSearch} onToggle={toggleStatus} />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2"
          style={{ background: INK, color: "#fff", fontFamily: "Inter" }}>
          <CheckCircle2 size={16} color="#4ADE80" /> {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- national tab ---------------- */
function NationalView({ onSelectZone }) {
  const [selected, setSelected] = useState(null);

  const totals = useMemo(() => {
    const centres = STATE_DATA.reduce((a, s) => a + s.centres, 0);
    const incidents = STATE_DATA.reduce((a, s) => a + s.incidents, 0);
    const rate = Math.round((incidents / centres) * 1000) / 10;
    return { centres, incidents, rate };
  }, []);

  const zoneTotals = useMemo(() => {
    return REGIONS.map(z => {
      const list = STATE_DATA.filter(s => s.zone === z);
      const centres = list.reduce((a, s) => a + s.centres, 0);
      const incidents = list.reduce((a, s) => a + s.incidents, 0);
      return { zone: z, centres, incidents, rate: centres ? Math.round((incidents / centres) * 1000) / 10 : 0 };
    });
  }, []);

  const topStates = useMemo(
    () => [...STATE_DATA].sort((a, b) => rateOf(b) - rateOf(a)).slice(0, 8),
    []
  );

  const maxRow = Math.max(...STATE_DATA.map(s => s.row));
  const maxCol = Math.max(...STATE_DATA.map(s => s.col));
  const maxZoneCentres = Math.max(...zoneTotals.map(z => z.centres));

  return (
    <div className="space-y-6">
      <div className="px-3 py-2 rounded text-xs" style={{ background: "#EEF2F6", color: MUTED }}>
        Illustrative data across 23 states/UTs for concept review — connect this view to your live reporting
        database when the system rolls out to all ~2,000 centres.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${STEEL}` }}>
          <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: "1.9rem", color: INK }}>{totals.centres.toLocaleString("en-IN")}</div>
          <div style={{ color: MUTED }} className="text-xs mt-1 font-medium">Centres Reporting</div>
        </div>
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: "4px solid #E8843A" }}>
          <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: "1.9rem", color: INK }}>{totals.incidents}</div>
          <div style={{ color: MUTED }} className="text-xs mt-1 font-medium">Incidents (Mar–May)</div>
        </div>
        <div className="rounded-lg p-4 col-span-2 md:col-span-1" style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${rateColor(totals.rate)}` }}>
          <div style={{ fontFamily: "IBM Plex Mono", fontWeight: 600, fontSize: "1.9rem", color: INK }}>{totals.rate}</div>
          <div style={{ color: MUTED }} className="text-xs mt-1 font-medium">Incidents / 100 Centres</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: INK }}>India — Incident Rate by State</div>
            <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
              <span className="flex items-center gap-1"><span style={{ width: 9, height: 9, background: rateColor(3), display: "inline-block", borderRadius: 2 }} />Low</span>
              <span className="flex items-center gap-1"><span style={{ width: 9, height: 9, background: rateColor(7), display: "inline-block", borderRadius: 2 }} />Medium</span>
              <span className="flex items-center gap-1"><span style={{ width: 9, height: 9, background: rateColor(11), display: "inline-block", borderRadius: 2 }} />High</span>
              <span className="flex items-center gap-1"><span style={{ width: 9, height: 9, background: rateColor(15), display: "inline-block", borderRadius: 2 }} />Critical</span>
            </div>
          </div>
          <div
            className="grid gap-1.5 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${maxCol + 1}, minmax(0,1fr))`,
              gridTemplateRows: `repeat(${maxRow + 1}, 42px)`,
              maxWidth: 420,
            }}
          >
            {STATE_DATA.map(s => {
              const r = rateOf(s);
              const isSel = selected && selected.state === s.state;
              return (
                <button
                  key={s.state}
                  onClick={() => setSelected(s)}
                  title={`${s.state} — ${s.incidents} incidents / ${s.centres} centres`}
                  style={{
                    gridColumn: s.col + 1, gridRow: s.row + 1,
                    background: rateColor(r), borderRadius: 5,
                    border: isSel ? "2px solid " + INK : "2px solid transparent",
                    color: "#fff", fontSize: "9px", fontFamily: "IBM Plex Mono", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 2, lineHeight: 1.1,
                  }}
                >
                  {s.state.length > 8 ? s.state.slice(0, 3).toUpperCase() : s.state}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>
            {selected ? selected.state : "Select a state"}
          </div>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: MUTED }}>Zone</span><span style={{ color: INK, fontWeight: 600 }}>{selected.zone}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>Centres</span><span style={{ fontFamily: "IBM Plex Mono", color: INK }}>{selected.centres}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>Incidents</span><span style={{ fontFamily: "IBM Plex Mono", color: INK }}>{selected.incidents}</span></div>
              <div className="flex justify-between"><span style={{ color: MUTED }}>Rate /100 centres</span><Badge text={rateOf(selected)} color={rateColor(rateOf(selected))} /></div>
              <button
                onClick={() => onSelectZone(selected.zone)}
                className="w-full mt-2 px-3 py-2 rounded text-xs font-semibold"
                style={{ background: INK, color: "#fff" }}
              >
                Open {selected.zone} Zone dashboard →
              </button>
            </div>
          ) : (
            <div className="text-xs" style={{ color: MUTED }}>Click any state on the map to see its centres, incident count, and rate.</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Zone Comparison</div>
          <div className="space-y-3">
            {zoneTotals.map(z => (
              <div key={z.zone} className="flex items-center gap-3">
                <div className="w-20 text-xs font-semibold" style={{ color: INK }}>{z.zone}</div>
                <div className="flex-1 rounded" style={{ background: "#EEF1F4", height: 14 }}>
                  <div style={{ width: `${(z.centres / maxZoneCentres) * 100}%`, background: STEEL, height: 14, borderRadius: 4 }} />
                </div>
                <div className="w-16 text-right text-xs" style={{ fontFamily: "IBM Plex Mono", color: MUTED }}>{z.centres} ctrs</div>
                <button onClick={() => onSelectZone(z.zone)}>
                  <Badge text={`${z.rate}/100`} color={rateColor(z.rate)} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>States to Watch — Highest Rate</div>
          <table className="w-full text-sm">
            <tbody>
              {topStates.map((s, i) => (
                <tr key={s.state} style={{ borderTop: i === 0 ? "none" : `1px solid ${BORDER}` }}>
                  <td className="py-2 text-xs" style={{ color: MUTED, width: 20 }}>{i + 1}</td>
                  <td className="py-2" style={{ color: INK }}>{s.state}</td>
                  <td className="py-2 text-xs text-right" style={{ color: MUTED }}>{s.zone}</td>
                  <td className="py-2 text-right"><Badge text={`${rateOf(s)}/100`} color={rateColor(rateOf(s))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- overview tab ---------------- */
function Overview({ trendData, typeData, regionData, severityPie, heatmap, activeRegion, monthlySummary, activeMonth, onSelectMonth }) {
  const regionsShown = activeRegion === "All" ? REGIONS : [activeRegion];
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Incident Trend by Severity</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SEVERITY_LEVELS.map(s => (
                <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={SEVERITY_COLORS[s]} fill={SEVERITY_COLORS[s]} fillOpacity={0.55} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Severity Split</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={severityPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                {severityPie.map((s, i) => <Cell key={i} fill={SEVERITY_COLORS[s.name]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Incidents by Type</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: MUTED }} width={130} />
              <Tooltip />
              <Bar dataKey="count" fill={STEEL} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Region Comparison</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#E8843A" radius={[4, 4, 0, 0]} name="Total incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg p-4 overflow-x-auto" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: INK }}>Month-wise Summary</div>
          {activeMonth !== "All" && (
            <button onClick={() => onSelectMonth("All")} className="text-xs font-semibold flex items-center gap-1" style={{ color: MUTED }}>
              <X size={12} /> Clear month filter
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["Month", "Total", "Open", "Closed", "Closure Rate", "Severity Mix"].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlySummary.map(m => {
              const closureRate = m.total ? Math.round((m.closed / m.total) * 100) : 100;
              const isActive = activeMonth === m.key;
              return (
                <tr
                  key={m.key}
                  onClick={() => onSelectMonth(isActive ? "All" : m.key)}
                  style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer", background: isActive ? "#FDF3EA" : "transparent" }}
                >
                  <td className="px-3 py-2 font-semibold" style={{ color: INK }}>{m.label}</td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: INK }}>{m.total}</td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: STATUS_COLORS.Open }}>{m.open}</td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: STATUS_COLORS.Closed }}>{m.closed}</td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: MUTED }}>{closureRate}%</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {SEVERITY_LEVELS.filter(s => m[s] > 0).map(s => (
                        <Badge key={s} text={`${s} ${m[s]}`} color={SEVERITY_COLORS[s]} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {monthlySummary.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6" style={{ color: MUTED }}>No incidents logged yet for this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg p-4 overflow-x-auto" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Incident Type × Region</div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: INK }}>
              <th className="text-left px-3 py-2 rounded-l" style={{ color: "#fff", fontFamily: "Inter" }}>Incident Type</th>
              {regionsShown.map(r => (
                <th key={r} className="text-center px-3 py-2" style={{ color: "#fff" }}>{r}</th>
              ))}
              <th className="text-center px-3 py-2 rounded-r" style={{ color: "#E8843A" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td className="px-3 py-2" style={{ color: INK }}>{row.type}</td>
                {regionsShown.map(r => (
                  <td key={r} className="text-center px-3 py-2" style={{
                    fontFamily: "IBM Plex Mono", color: row[r] > 0 ? INK : "#C4CAD2",
                    background: row[r] > 0 ? "#EEF2F6" : "transparent"
                  }}>{row[r]}</td>
                ))}
                <td className="text-center px-3 py-2 font-semibold" style={{ fontFamily: "IBM Plex Mono", color: "#E8843A" }}>{row.total}</td>
              </tr>
            ))}
            {heatmap.length === 0 && (
              <tr><td colSpan={regionsShown.length + 2} className="text-center py-6" style={{ color: MUTED }}>No incidents logged yet for this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- escalation matrix tab ---------------- */
function EscalationMatrixView() {
  return (
    <div className="rounded-lg p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="text-sm mb-5" style={{ color: MUTED }}>
        Every incident is routed automatically to an owner based on severity. Reps can still escalate manually if a case feels understated.
      </div>
      <div className="space-y-3">
        {ESCALATION_MATRIX.map((row, idx) => (
          <div key={idx} className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg p-4"
            style={{ borderLeft: `5px solid ${SEVERITY_COLORS[row.severity]}`, background: "#FAFBFC" }}>
            <div className="md:w-32 flex-shrink-0">
              <Badge text={row.severity.toUpperCase()} color={SEVERITY_COLORS[row.severity]} />
            </div>
            <ChevronRight size={16} color={MUTED} className="hidden md:block flex-shrink-0" />
            <div className="md:w-52 flex-shrink-0">
              <div style={{ fontFamily: "Archivo", fontWeight: 700, color: INK }} className="text-sm">{row.owner}</div>
              <div style={{ fontFamily: "IBM Plex Mono", color: MUTED }} className="text-xs mt-0.5">SLA: {row.sla}</div>
            </div>
            <ChevronRight size={16} color={MUTED} className="hidden md:block flex-shrink-0" />
            <div className="text-sm" style={{ color: "#3A4250" }}>{row.action}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-2 text-xs px-3 py-2 rounded" style={{ background: "#FDF3EA", color: "#8A4A16" }}>
        <FileWarning size={14} className="flex-shrink-0 mt-0.5" />
        Corporal Punishment and POCSO cases are treated as Critical by default and cannot be downgraded from this portal — statutory / mandatory reporting rules apply regardless of who logs the case.
      </div>
    </div>
  );
}

/* ---------------- report form tab ---------------- */
function ReportForm({ onSubmit, defaultRegion }) {
  const [region, setRegion] = useState(defaultRegion !== "All" ? defaultRegion : REGIONS[0]);
  const [type, setType] = useState(INCIDENT_TYPES[0].name);
  const [severity, setSeverity] = useState(INCIDENT_TYPES[0].severity);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[2]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function handleTypeChange(t) {
    setType(t);
    const found = INCIDENT_TYPES.find(i => i.name === t);
    setSeverity(found.severity);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) { setError("Reporter name and description are required."); return; }
    setError("");
    onSubmit({ region, type, severity, status: "Open", date, reportedByName: name.trim(), reportedByRole: role, description: description.trim() });
    setName(""); setDescription(""); setDate(new Date().toISOString().slice(0, 10));
  }

  const field = "w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-2";
  const fieldStyle = { borderColor: BORDER, color: INK };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg p-6 max-w-2xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div style={{ fontFamily: "Archivo", fontWeight: 700, color: INK }} className="text-lg mb-1">Log a new incident</div>
      <div style={{ color: MUTED }} className="text-sm mb-5">Filed reports route automatically per the escalation matrix.</div>

      {error && <div className="mb-4 px-3 py-2 rounded text-sm" style={{ background: "#FDECEC", color: "#7C2D2D" }}>{error}</div>}

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Region</label>
          <select className={field} style={fieldStyle} value={region} onChange={e => setRegion(e.target.value)}>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Date of incident</label>
          <input type="date" className={field} style={fieldStyle} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Incident type</label>
          <select className={field} style={fieldStyle} value={type} onChange={e => handleTypeChange(e.target.value)}>
            {INCIDENT_TYPES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Severity</label>
          <select className={field} style={fieldStyle} value={severity} onChange={e => setSeverity(e.target.value)}>
            {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Reported by (name)</label>
          <input className={field} style={fieldStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: MUTED }}>Reported by (role)</label>
          <select className={field} style={fieldStyle} value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-5">
        <label className="text-xs font-semibold" style={{ color: MUTED }}>Description</label>
        <textarea className={field} style={fieldStyle} rows={4} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="What happened, who was involved, immediate action taken…" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="px-4 py-2 rounded font-semibold text-sm" style={{ background: INK, color: "#fff" }}>
          Submit case
        </button>
        <span className="text-xs" style={{ color: MUTED }}>
          Will route to <b style={{ color: INK }}>{ESCALATION_MATRIX.find(e => e.severity === severity).owner}</b>
        </span>
      </div>
    </form>
  );
}

/* ---------------- case log tab ---------------- */
function CaseLog({ rows, filter, setFilter, search, setSearch, onToggle }) {
  return (
    <div className="rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b" style={{ borderColor: BORDER }}>
        <div className="relative flex-1">
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: MUTED }} />
          <input
            className="w-full pl-8 pr-3 py-2 rounded border text-sm"
            style={{ borderColor: BORDER }}
            placeholder="Search case ID or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {["All", "Open", "Closed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded text-xs font-semibold"
              style={{ background: filter === f ? INK : "#EEF1F4", color: filter === f ? "#fff" : MUTED }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["Case ID", "Region", "Type", "Severity", "Reported by", "Date", "Escalated to", "Status"].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const owner = ESCALATION_MATRIX.find(e => e.severity === r.severity).owner;
              return (
                <tr key={r.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: INK }}>{r.id}</td>
                  <td className="px-3 py-2" style={{ color: "#3A4250" }}><MapPin size={12} className="inline mr-1" style={{ color: MUTED }} />{r.region}</td>
                  <td className="px-3 py-2" style={{ color: "#3A4250" }}>{r.type}</td>
                  <td className="px-3 py-2"><Badge text={r.severity} color={SEVERITY_COLORS[r.severity]} /></td>
                  <td className="px-3 py-2" style={{ color: "#3A4250" }}>{r.reportedByName} <span style={{ color: MUTED }}>({r.reportedByRole})</span></td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono", color: MUTED }}>{r.date}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: MUTED }}>{owner}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => onToggle(r.id)}>
                      <Badge text={r.status} color={STATUS_COLORS[r.status]} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8" style={{ color: MUTED }}>No cases match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
