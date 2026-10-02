"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ShieldAlert,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Eye,
  Filter,
  FolderOpen,
  X,
  Loader2,
} from "lucide-react";
import { incidentService, IncidentStatsData } from "@/services/api/incidentService";

/* ---------------- design tokens from example.md ---------------- */
const INK = "#0F1B2D";
const STEEL = "#1F3A5F";
const BG = "#F5F6F8";
const CARD = "#FFFFFF";
const BORDER = "#E2E5EA";
const MUTED = "#5B6472";

const SEVERITY_COLORS = { Low: "#2F855A", Medium: "#B7791F", High: "#C05621", Critical: "#7C2D2D" };
const STATUS_COLORS = { Open: "#B7791F", Closed: "#2F855A" };
const SEVERITY_LEVELS = ["Low", "Medium", "High", "Critical"];
const REGIONS = ["North", "South", "East", "West"];

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


function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide"
      style={{ background: `${color}1A`, color, fontFamily: "Inter, sans-serif" }}
    >
      {text}
    </span>
  );
}

type Region = "All Regions" | "North" | "South" | "East" | "West";
type TabType = "National" | "Zone Overview" | "Escalation Matrix";

interface IncidentMatrixRow {
  type: string;
  north: number;
  south: number;
  east: number;
  west: number;
  central?: number;
  total: number;
}

/* ---------------- overview tab from example.md ---------------- */
function Overview({
  trendData,
  typeData,
  regionData,
  severityPie,
  activeRegion,
  monthlySummary,
  activeMonth,
  onSelectMonth,
  isMounted,
  matrixData = [],
}: {
  trendData: any[];
  typeData: any[];
  regionData: any[];
  severityPie: any[];
  heatmap?: any[];
  activeRegion: string;
  monthlySummary: any[];
  activeMonth: string;
  onSelectMonth: (m: string) => void;
  isMounted: boolean;
  matrixData?: IncidentMatrixRow[];
}) {
  const totalSeverity = useMemo(() => {
    return (severityPie || []).reduce((acc: number, s: any) => acc + (Number(s.value) || 0), 0);
  }, [severityPie]);

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-lg p-4 bg-white border border-[#E2E5EA] h-[260px] animate-pulse" />
          <div className="rounded-lg p-4 bg-white border border-[#E2E5EA] h-[260px] animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg p-4 bg-white border border-[#E2E5EA] h-[300px] animate-pulse" />
          <div className="rounded-lg p-4 bg-white border border-[#E2E5EA] h-[300px] animate-pulse" />
        </div>
      </div>
    );
  }

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
              {SEVERITY_LEVELS.map((s) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stackId="1"
                  stroke={SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS]}
                  fill={SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS]}
                  fillOpacity={0.55}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg p-4 flex flex-col justify-between" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold" style={{ color: INK }}>Severity Split</div>
            <span className="text-xs font-mono text-slate-500 font-medium">Total: {totalSeverity}</span>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={severityPie.length > 0 ? severityPie : [{ name: "None", value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={severityPie.length > 1 ? 2 : 0}
              >
                {severityPie.length > 0 ? (
                  severityPie.map((s: any, i: number) => (
                    <Cell key={i} fill={SEVERITY_COLORS[s.name as keyof typeof SEVERITY_COLORS] || "#64748b"} />
                  ))
                ) : (
                  <Cell fill="#e2e8f0" />
                )}
              </Pie>
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "10px", fill: MUTED, fontWeight: 500 }}>
                Total
              </text>
              <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "16px", fill: INK, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>
                {totalSeverity}
              </text>
              <Tooltip formatter={(value: any, name: any) => [name === "None" ? 0 : `${value} incidents`, name]} />
              <Legend
                formatter={(value, entry: any) => {
                  const val = entry?.payload?.value ?? 0;
                  return (
                    <span style={{ color: INK, fontSize: 11, fontWeight: 500 }}>
                      {value}: <strong style={{ fontWeight: 700 }}>{val}</strong>
                    </span>
                  );
                }}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-4 gap-1 pt-2.5 mt-1 border-t border-slate-100 text-center">
            {SEVERITY_LEVELS.map((lvl) => {
              const found = severityPie.find((s: any) => s.name?.toLowerCase() === lvl.toLowerCase());
              const count = found ? found.value : 0;
              const color = SEVERITY_COLORS[lvl as keyof typeof SEVERITY_COLORS];
              return (
                <div key={lvl} className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-medium text-slate-600">{lvl}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs font-mono mt-0.5">{count}</span>
                </div>
              );
            })}
          </div>
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
            <button
              onClick={() => onSelectMonth("All")}
              className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
              style={{ color: MUTED }}
            >
              <X size={12} /> Clear month filter
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F7F8FA" }}>
              {["Month", "Total", "Open", "Closed", "Closure Rate", "Severity Mix"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: MUTED }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlySummary.map((m: any, idx: number) => {
              const rowKey = m.key || m.label || idx;
              const closureRate = m.closureRate !== undefined ? m.closureRate : (m.total ? `${Math.round(((m.closed || 0) / m.total) * 100)}%` : "0%");
              const isActive = activeMonth === m.key || activeMonth === m.label;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onSelectMonth(isActive ? "All" : (m.key || m.label))}
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    cursor: "pointer",
                    background: isActive ? "#FDF3EA" : "transparent",
                  }}
                >
                  <td className="px-3 py-2 font-semibold" style={{ color: INK }}>
                    {m.label}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono, monospace", color: INK }}>
                    {m.total}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono, monospace", color: STATUS_COLORS.Open }}>
                    {m.open}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono, monospace", color: STATUS_COLORS.Closed }}>
                    {m.closed}
                  </td>
                  <td className="px-3 py-2" style={{ fontFamily: "IBM Plex Mono, monospace", color: MUTED }}>
                    {String(closureRate).includes("%") ? closureRate : `${closureRate}%`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {SEVERITY_LEVELS.filter((s) => (m[s] || 0) > 0).map((s) => (
                        <Badge
                          key={s}
                          text={`${s} ${m[s]}`}
                          color={SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS]}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {monthlySummary.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6" style={{ color: MUTED }}>
                  No incidents logged yet for this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Incident Type × Region Matrix Table (Using the existing table) */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">
            Incident Type × Region
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#0b1b2d] text-white">
                <th className="py-3 px-4 font-semibold">Incident Type</th>
                <th className={`py-3 px-4 text-center font-semibold ${activeRegion === "North" ? "bg-[#162f4c]" : ""}`}>North</th>
                <th className={`py-3 px-4 text-center font-semibold ${activeRegion === "South" ? "bg-[#162f4c]" : ""}`}>South</th>
                <th className={`py-3 px-4 text-center font-semibold ${activeRegion === "East" ? "bg-[#162f4c]" : ""}`}>East</th>
                <th className={`py-3 px-4 text-center font-semibold ${activeRegion === "West" ? "bg-[#162f4c]" : ""}`}>West</th>
                <th className="py-3 px-4 text-center font-bold text-orange-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No incident matrix data found.
                  </td>
                </tr>
              ) : (
                matrixData.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={row.type}
                      className={`transition-colors hover:bg-slate-50/80 ${isEven ? "bg-white" : "bg-[#f8fafc]/60"}`}
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-800">{row.type}</td>
                      <td className={`py-2.5 px-4 text-center ${row.north === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "North" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.north}
                      </td>
                      <td className={`py-2.5 px-4 text-center ${row.south === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "South" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.south}
                      </td>
                      <td className={`py-2.5 px-4 text-center ${row.east === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "East" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.east}
                      </td>
                      <td className={`py-2.5 px-4 text-center ${row.west === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "West" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.west}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#e07a38]">
                        {row.total}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState<Region>("All Regions");
  const [activeTab, setActiveTab] = useState<TabType>("National");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [activeZoneRegion, setActiveZoneRegion] = useState("All");
  const [activeZoneMonth, setActiveZoneMonth] = useState("All");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Live Incident Stats from API
  const [statsData, setStatsData] = useState<IncidentStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        setLoadingStats(true);
        setStatsError(null);
        const params: { region?: string } = {};
        if (selectedRegion !== "All Regions") {
          params.region = selectedRegion;
        }
        const res = await incidentService.getIncidentStats(params);
        if (active) {
          if (res && res.success && res.data) {
            setStatsData(res.data);
          } else {
            setStatsData(null);
          }
        }
      } catch (err: any) {
        console.warn("Failed to load incident stats:", err);
        if (active) {
          setStatsError(err?.message || "Failed to load incident stats");
        }
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    }

    fetchStats();
    return () => {
      active = false;
    };
  }, [selectedRegion]);

  // Live Incident Stats for Zone Overview
  const [zoneBaselineData, setZoneBaselineData] = useState<IncidentStatsData | null>(null);
  const [zoneMonthData, setZoneMonthData] = useState<IncidentStatsData | null>(null);
  const [loadingZoneStats, setLoadingZoneStats] = useState<boolean>(true);
  const [zoneStatsError, setZoneStatsError] = useState<string | null>(null);

  // Fetch baseline stats for the active zone region (unfiltered by month)
  useEffect(() => {
    let active = true;
    async function fetchZoneBaseline() {
      try {
        setLoadingZoneStats(true);
        setZoneStatsError(null);
        const params: { region?: string } = {};
        if (activeZoneRegion !== "All") {
          params.region = activeZoneRegion;
        }
        const res = await incidentService.getIncidentStats(params);
        if (active && res && res.success && res.data) {
          setZoneBaselineData(res.data);
        }
      } catch (err: any) {
        console.warn("Failed to load zone baseline stats:", err);
        if (active) {
          setZoneStatsError(err?.message || "Failed to load zone stats");
        }
      } finally {
        if (active) {
          setLoadingZoneStats(false);
        }
      }
    }

    fetchZoneBaseline();
    return () => {
      active = false;
    };
  }, [activeZoneRegion]);

  // When activeZoneMonth changes and is not "All", fetch month-filtered stats for that zone
  useEffect(() => {
    if (activeZoneMonth === "All") {
      setZoneMonthData(null);
      return;
    }

    let active = true;
    async function fetchZoneMonth() {
      try {
        setLoadingZoneStats(true);
        const params: { region?: string; month?: string } = {
          month: activeZoneMonth,
        };
        if (activeZoneRegion !== "All") {
          params.region = activeZoneRegion;
        }
        const res = await incidentService.getIncidentStats(params);
        if (active && res && res.success && res.data) {
          setZoneMonthData(res.data);
        }
      } catch (err: any) {
        console.warn("Failed to load zone month stats:", err);
      } finally {
        if (active) {
          setLoadingZoneStats(false);
        }
      }
    }

    fetchZoneMonth();
    return () => {
      active = false;
    };
  }, [activeZoneRegion, activeZoneMonth]);

  // Dynamic values from API for National Tab
  const totalIncidents = statsData?.totalIncidents ?? 0;
  const openCases = statsData?.openCases ?? 0;
  const highOrCritical = statsData?.highOrCritical ?? 0;
  const closureRate = statsData?.closureRate ?? "0%";

  const incidentsByType = useMemo(() => {
    return statsData?.incidentsByType || [];
  }, [statsData]);

  const maxTypeCount = useMemo(() => {
    const counts = incidentsByType.map((i) => i.count);
    return Math.max(...counts, 1);
  }, [incidentsByType]);

  const incidentTrend = useMemo(() => {
    return statsData?.incidentTrendBySeverity || [];
  }, [statsData]);

  const maxTrendVal = useMemo(() => {
    const totals = incidentTrend.map((t) => t.total);
    return Math.max(...totals, 5);
  }, [incidentTrend]);

  const regionComparison = useMemo(() => {
    return statsData?.regionComparison || [];
  }, [statsData]);

  const maxRegionVal = useMemo(() => {
    const counts = regionComparison.map((r) => r.count);
    return Math.max(...counts, 5);
  }, [regionComparison]);

  const matrixData = useMemo(() => {
    return statsData?.incidentTypeByRegion || [];
  }, [statsData]);

  // National Donut chart math supporting all 4 severities
  const severityLevels = ["Low", "Medium", "High", "Critical"];
  const severityItems = useMemo(() => {
    const list = statsData?.severitySplit || [];
    return severityLevels.map((lvl) => {
      const found = list.find((s) => s.name.toLowerCase() === lvl.toLowerCase());
      return { name: lvl, value: found ? found.value : 0 };
    });
  }, [statsData]);

  const totalSeverity = useMemo(() => {
    return severityItems.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [severityItems]);

  const severitySegments = useMemo(() => {
    const RADIUS = 60;
    const CIRC = 2 * Math.PI * RADIUS;
    let accumulatedDash = 0;
    return severityItems.map((item) => {
      const dash = totalSeverity > 0 ? (item.value / totalSeverity) * CIRC : 0;
      const offset = -accumulatedDash;
      accumulatedDash += dash;
      return {
        name: item.name,
        value: item.value,
        dash,
        offset,
        color: SEVERITY_COLORS[item.name as keyof typeof SEVERITY_COLORS] || "#64748b",
      };
    });
  }, [severityItems, totalSeverity]);

  // Zone Overview live computed values
  const activeZoneData = zoneMonthData || zoneBaselineData;

  const zoneMonthOptions = useMemo(() => {
    const trends = zoneBaselineData?.incidentTrendBySeverity || [];
    return trends.map((t) => ({
      key: t.monthKey || t.key || t.month,
      label: t.label || t.month,
    }));
  }, [zoneBaselineData]);

  const monthlySummary = useMemo(() => {
    const trends = zoneBaselineData?.incidentTrendBySeverity || [];
    return trends.map((t) => ({
      key: t.monthKey || t.key || t.month,
      label: t.label || t.month,
      total: t.total || 0,
      open: t.open ?? 0,
      closed: t.closed ?? 0,
      closureRate: t.closureRate || (t.total > 0 ? `${Math.round(((t.closed || 0) / t.total) * 100)}%` : "0%"),
      Low: t.Low ?? t.low ?? 0,
      Medium: t.Medium ?? t.medium ?? 0,
      High: t.High ?? t.high ?? 0,
      Critical: t.Critical ?? t.critical ?? 0,
    }));
  }, [zoneBaselineData]);

  const zoneKpis = useMemo(() => {
    const total = activeZoneData?.totalIncidents ?? 0;
    const open = activeZoneData?.openCases ?? 0;
    const critical = activeZoneData?.highOrCritical ?? 0;
    const rawRate = activeZoneData?.closureRate ?? "0%";
    const closureRate = typeof rawRate === "string" ? rawRate.replace("%", "") : String(rawRate);
    return { total, open, critical, closureRate };
  }, [activeZoneData]);

  const trendData = useMemo(() => {
    const trends = zoneBaselineData?.incidentTrendBySeverity || [];
    return trends.map((t) => ({
      key: t.monthKey || t.key || t.month,
      label: t.label || t.month,
      Low: t.Low ?? t.low ?? 0,
      Medium: t.Medium ?? t.medium ?? 0,
      High: t.High ?? t.high ?? 0,
      Critical: t.Critical ?? t.critical ?? 0,
    }));
  }, [zoneBaselineData]);

  const typeData = useMemo(() => {
    return activeZoneData?.incidentsByType || [];
  }, [activeZoneData]);

  const regionData = useMemo(() => {
    const list = activeZoneData?.regionComparison || [];
    return list.map((r) => ({
      name: r.region,
      total: r.count,
    }));
  }, [activeZoneData]);

  const severityPie = useMemo(() => {
    const split = activeZoneData?.severitySplit || [];
    return split.filter((s) => s.value > 0);
  }, [activeZoneData]);

  const zoneMatrixData = useMemo(() => {
    return activeZoneData?.incidentTypeByRegion || [];
  }, [activeZoneData]);

  return (
    <div className="min-h-full bg-[#f8fafc] text-slate-800 -m-2 md:-m-4">
      {/* 1. TOP NAVIGATION SUB-TABS */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 flex items-center gap-8 text-xs md:text-sm shadow-2xs">
        {(["National", "Zone Overview", "Escalation Matrix"] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3.5 font-semibold cursor-pointer relative transition-colors whitespace-nowrap ${
                isActive ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. REGION FILTER TABS (Shown on National tab) */}
      {activeTab === "National" && (
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between overflow-x-auto shadow-2xs">
          <div className="flex items-center gap-6">
            {(["All Regions", "North", "South", "East", "West"] as Region[]).map((region) => {
              const isActive = selectedRegion === region;
              return (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`py-3 text-xs md:text-sm transition-all duration-150 whitespace-nowrap cursor-pointer relative ${
                    isActive
                      ? "text-slate-900 font-bold"
                      : "text-slate-500 font-medium hover:text-slate-800"
                  }`}
                >
                  {region}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#ea580c] rounded-t-full transition-all" />
                  )}
                </button>
              );
            })}
          </div>
          {loadingStats && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* ======================================================== */}
        {/* TAB 1: NATIONAL OVERVIEW (WITH 4 KPI CARDS & FULL STATS) */}
        {/* ======================================================== */}
        {activeTab === "National" && (
          <div className="space-y-6">
            {statsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-center justify-between">
                <span>{statsError}</span>
                <button
                  onClick={() => setSelectedRegion(selectedRegion)}
                  className="font-semibold underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm border-l-4 border-l-[#0f2942] transition-transform hover:-translate-y-0.5 duration-200">
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {loadingStats && !statsData ? "..." : totalIncidents}
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                  Total Incidents
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm border-l-4 border-l-[#d97706] transition-transform hover:-translate-y-0.5 duration-200">
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {loadingStats && !statsData ? "..." : openCases}
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                  Open Cases
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm border-l-4 border-l-[#991b1b] transition-transform hover:-translate-y-0.5 duration-200">
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {loadingStats && !statsData ? "..." : highOrCritical}
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                  High / Critical
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm border-l-4 border-l-[#059669] transition-transform hover:-translate-y-0.5 duration-200">
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {loadingStats && !statsData ? "..." : closureRate}
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1.5">
                  Closure Rate
                </div>
              </div>
            </div>

            {/* ROW 1: Incident Trend by Severity & Severity Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card 1: Incident Trend by Severity (Stacked Bar) */}
              <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200/90 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 tracking-wide mb-6">
                  Incident Trend by Severity
                </h2>

                <div className="h-64 flex items-end justify-center gap-8 md:gap-16 px-4 overflow-x-auto">
                  {incidentTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs w-full">
                      No trend data available for this selection
                    </div>
                  ) : (
                    incidentTrend.map((item, idx) => {
                      const lowH = ((item.low || 0) / maxTrendVal) * 180;
                      const medH = ((item.medium || 0) / maxTrendVal) * 180;
                      const highH = ((item.high || 0) / maxTrendVal) * 180;
                      const critH = ((item.critical || 0) / maxTrendVal) * 180;

                      return (
                        <div key={`${item.month || idx}-${idx}`} className="flex flex-col items-center flex-shrink-0">
                          <div className="w-14 sm:w-16 flex flex-col-reverse rounded-t-sm overflow-hidden shadow-sm transition-all duration-300 hover:brightness-105">
                            {(item.low || 0) > 0 && (
                              <div
                                style={{ height: `${lowH}px` }}
                                className="bg-[#2e7d52] w-full transition-all duration-300 relative group"
                                title={`Low: ${item.low}`}
                              />
                            )}
                            {(item.medium || 0) > 0 && (
                              <div
                                style={{ height: `${medH}px` }}
                                className="bg-[#b87326] w-full transition-all duration-300 relative group"
                                title={`Medium: ${item.medium}`}
                              />
                            )}
                            {(item.high || 0) > 0 && (
                              <div
                                style={{ height: `${highH}px` }}
                                className="bg-[#b93829] w-full transition-all duration-300 relative group"
                                title={`High: ${item.high}`}
                              />
                            )}
                            {(item.critical || 0) > 0 && (
                              <div
                                style={{ height: `${critH}px` }}
                                className="bg-[#651212] w-full transition-all duration-300 relative group"
                                title={`Critical: ${item.critical}`}
                              />
                            )}
                            {(item.total || 0) === 0 && (
                              <div className="h-1 bg-slate-200 w-full" />
                            )}
                          </div>

                          <div className="text-center mt-3">
                            <div className="text-xs font-medium text-slate-700">{item.month}</div>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">{item.total}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#2e7d52]" />
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#b87326]" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#b93829]" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#651212]" />
                    <span>Critical</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Severity Split */}
              <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
                <h2 className="text-sm font-bold text-slate-800 tracking-wide mb-4">
                  Severity Split
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform overflow-visible">
                      {severitySegments
                        .filter((seg) => seg.dash > 0)
                        .map((seg) => (
                          <circle
                            key={seg.name}
                            cx="90"
                            cy="90"
                            r={60}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="32"
                            strokeDasharray={`${seg.dash} ${2 * Math.PI * 60}`}
                            strokeDashoffset={seg.offset}
                            className="transition-all duration-500 cursor-pointer hover:opacity-90"
                          />
                        ))}
                      {totalSeverity === 0 && (
                        <circle
                          cx="90"
                          cy="90"
                          r={60}
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="32"
                        />
                      )}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-slate-400 font-medium">Total</span>
                      <span className="text-xl font-extrabold text-slate-900">{totalSeverity}</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs md:text-sm font-medium">
                    {severityItems.map((item) => {
                      const color = SEVERITY_COLORS[item.name as keyof typeof SEVERITY_COLORS] || "#64748b";
                      return (
                        <div key={item.name} className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-600 w-16">{item.name}</span>
                          <span className="text-slate-400 font-normal">—</span>
                          <span className="font-bold text-slate-900">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 text-center mt-4">
                  Categorized by initial safety assessment
                </div>
              </div>
            </div>

            {/* ROW 2: Incidents by Type & Region Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200/90 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 tracking-wide mb-6">
                  Incidents by Type
                </h2>

                {incidentsByType.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                    No incidents recorded by type
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {incidentsByType.map((item, idx) => {
                      const widthPercent = (item.count / maxTypeCount) * 100;
                      return (
                        <div key={`${item.name || idx}-${idx}`} className="flex items-center gap-3 text-xs">
                          <div className="w-40 sm:w-44 text-right truncate text-slate-700 font-medium shrink-0">
                            {item.name}
                          </div>
                          <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden flex items-center pr-2">
                            <div
                              style={{ width: `${Math.max(widthPercent, 2)}%` }}
                              className="bg-[#0f2942] h-full rounded-sm transition-all duration-500 ease-out"
                            />
                          </div>
                          <div className="w-6 text-right font-bold text-slate-800 shrink-0">
                            {item.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-slate-200/90 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 tracking-wide mb-6">
                  Region Comparison
                </h2>

                {regionComparison.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                    No regional comparison data available
                  </div>
                ) : (
                  <div className="h-56 flex items-end justify-between px-4 sm:px-8 pt-6">
                    {regionComparison.map((item, idx) => {
                      const barHeight = ((item.count || 0) / maxRegionVal) * 160;
                      const isSelected = selectedRegion === "All Regions" || (item.region && selectedRegion.toLowerCase() === item.region.toLowerCase());

                      return (
                        <div key={`${item.region || idx}-${idx}`} className="flex flex-col items-center flex-1 max-w-[60px]">
                          <div className="text-xs font-bold text-slate-700 mb-1.5">{item.count}</div>
                          <div
                            style={{ height: `${Math.max(barHeight, 4)}px` }}
                            className={`w-10 sm:w-12 rounded-t-sm transition-all duration-300 ${
                              isSelected ? "bg-[#e07a38] hover:bg-[#d06927]" : "bg-[#e07a38]/40"
                            }`}
                          />
                          <div className="text-[11px] font-medium text-slate-600 mt-2.5">
                            {item.region}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 3: Incident Type × Region Matrix Table */}
            <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-5 pb-3">
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  Incident Type × Region
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0b1b2d] text-white">
                      <th className="py-3 px-4 font-semibold">Incident Type</th>
                      <th className={`py-3 px-4 text-center font-semibold ${selectedRegion === "North" ? "bg-[#162f4c]" : ""}`}>North</th>
                      <th className={`py-3 px-4 text-center font-semibold ${selectedRegion === "South" ? "bg-[#162f4c]" : ""}`}>South</th>
                      <th className={`py-3 px-4 text-center font-semibold ${selectedRegion === "East" ? "bg-[#162f4c]" : ""}`}>East</th>
                      <th className={`py-3 px-4 text-center font-semibold ${selectedRegion === "West" ? "bg-[#162f4c]" : ""}`}>West</th>
                      <th className="py-3 px-4 text-center font-bold text-orange-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                          No incident matrix data found.
                        </td>
                      </tr>
                    ) : (
                      matrixData.map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={`${row.type || idx}-${idx}`}
                            className={`transition-colors hover:bg-slate-50/80 ${isEven ? "bg-white" : "bg-[#f8fafc]/60"}`}
                          >
                            <td className="py-2.5 px-4 font-medium text-slate-800">{row.type}</td>
                            <td className={`py-2.5 px-4 text-center ${row.north === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "North" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                              {row.north ?? 0}
                            </td>
                            <td className={`py-2.5 px-4 text-center ${row.south === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "South" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                              {row.south ?? 0}
                            </td>
                            <td className={`py-2.5 px-4 text-center ${row.east === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "East" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                              {row.east ?? 0}
                            </td>
                            <td className={`py-2.5 px-4 text-center ${row.west === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "West" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                              {row.west ?? 0}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-[#e07a38]">
                              {row.total ?? 0}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ZONE OVERVIEW (FROM example.md)                   */}
        {/* ======================================================== */}
        {activeTab === "Zone Overview" && (
          <div className="space-y-6">
            {/* Zone & Month filter subheader bar matching example.md */}
            <div className="w-full border-b bg-white -mt-6 -mx-4 md:-mx-6 mb-6 px-4 md:px-6 py-0 border-slate-200">
              <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto">
                  {["All", ...REGIONS].map((r) => (
                    <button
                      key={r}
                      onClick={() => setActiveZoneRegion(r)}
                      className="px-4 py-3 text-xs md:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer"
                      style={{
                        borderColor: activeZoneRegion === r ? "#E8843A" : "transparent",
                        color: activeZoneRegion === r ? INK : MUTED,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {r === "All" ? "All Zones" : `${r} Zone`}
                    </button>
                  ))}
                </div>
                <select
                  value={activeZoneMonth}
                  onChange={(e) => setActiveZoneMonth(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded border flex-shrink-0 cursor-pointer bg-white"
                  style={{ borderColor: BORDER, color: INK, fontFamily: "Inter, sans-serif" }}
                >
                  <option value="All">All Months</option>
                  {zoneMonthOptions.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPI strip matching example.md */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Incidents", value: zoneKpis.total, icon: FolderOpen, color: STEEL },
                { label: "Open Cases", value: zoneKpis.open, icon: Clock, color: STATUS_COLORS.Open },
                { label: "High / Critical", value: zoneKpis.critical, icon: AlertTriangle, color: SEVERITY_COLORS.Critical },
                { label: "Closure Rate", value: `${zoneKpis.closureRate}%`, icon: CheckCircle2, color: STATUS_COLORS.Closed },
              ].map((k, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-4"
                  style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${k.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: "1.9rem", color: INK }}>
                      {k.value}
                    </div>
                    <k.icon size={18} color={k.color} />
                  </div>
                  <div style={{ color: MUTED }} className="text-xs mt-1 font-medium">
                    {k.label}
                  </div>
                </div>
              ))}
            </div>

            <Overview
              trendData={trendData}
              typeData={typeData}
              regionData={regionData}
              severityPie={severityPie}
              activeRegion={activeZoneRegion}
              monthlySummary={monthlySummary}
              activeMonth={activeZoneMonth}
              onSelectMonth={setActiveZoneMonth}
              isMounted={isMounted}
              matrixData={zoneMatrixData}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ESCALATION MATRIX                                 */}
        {/* ======================================================== */}
        {activeTab === "Escalation Matrix" && (
          <div className="bg-white rounded-xl border border-slate-200/90 p-6 md:p-8 shadow-sm space-y-3.5">
            <p className="text-xs md:text-sm text-slate-600 mb-6">
              Every incident is routed automatically to an owner based on severity. Reps can still escalate manually if a case feels understated.
            </p>

            {/* Row 1: LOW */}
            <div className="bg-[#fcfdfd] border border-slate-100 rounded-lg p-4 md:py-4 md:px-5 border-l-4 border-l-[#1b6d48] flex flex-col md:flex-row md:items-center gap-3 md:gap-5 shadow-2xs">
              <div className="w-24 shrink-0 flex items-center">
                <span className="w-full text-center bg-[#eef7f2] text-[#1b6d48] font-bold text-xs uppercase py-1 rounded tracking-wide">
                  LOW
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Branch Manager (BM)</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">SLA: 3 working days</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Log the case, investigate locally, resolve and close. Include in weekly summary to AOM.
              </div>
            </div>

            {/* Row 2: MEDIUM */}
            <div className="bg-[#fcfdfd] border border-slate-100 rounded-lg p-4 md:py-4 md:px-5 border-l-4 border-l-[#b87326] flex flex-col md:flex-row md:items-center gap-3 md:gap-5 shadow-2xs">
              <div className="w-24 shrink-0 flex items-center">
                <span className="w-full text-center bg-[#fdf6ee] text-[#b87326] font-bold text-xs uppercase py-1 rounded tracking-wide">
                  MEDIUM
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Area Operations Manager (AOM)</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">SLA: 48 hours</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Review with BM, agree corrective action, keep RSO informed via weekly rollup.
              </div>
            </div>

            {/* Row 3: HIGH */}
            <div className="bg-[#fcfdfd] border border-slate-100 rounded-lg p-4 md:py-4 md:px-5 border-l-4 border-l-[#c2410c] flex flex-col md:flex-row md:items-center gap-3 md:gap-5 shadow-2xs">
              <div className="w-24 shrink-0 flex items-center">
                <span className="w-full text-center bg-[#fef2f2] text-[#c2410c] font-bold text-xs uppercase py-1 rounded tracking-wide">
                  HIGH
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Regional Safety Officer (RSO)</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">SLA: 24 hours</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Lead investigation directly, initiate parent/guardian communication, notify Central Safety Team.
              </div>
            </div>

            {/* Row 4: CRITICAL */}
            <div className="bg-[#fcfdfd] border border-slate-100 rounded-lg p-4 md:py-4 md:px-5 border-l-4 border-l-[#781919] flex flex-col md:flex-row md:items-center gap-3 md:gap-5 shadow-2xs">
              <div className="w-24 shrink-0 flex items-center">
                <span className="w-full text-center bg-[#fdf2f2] text-[#781919] font-bold text-xs uppercase py-1 rounded tracking-wide">
                  CRITICAL
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Central Safety & Compliance</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">SLA: 2 hours — immediate</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                RSO and Central notified simultaneously. Mandatory / statutory reporting triggered (e.g. POCSO, Corporal Punishment).
              </div>
            </div>

            {/* Bottom Alert / Warning */}
            <div className="bg-[#fff8f3] border border-[#fed7aa]/80 rounded-lg p-3.5 px-4 mt-6 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#c2410c] shrink-0 mt-0.5" />
              <p className="text-xs text-[#9a3412] leading-relaxed font-normal">
                Corporal Punishment and POCSO cases are treated as Critical by default and cannot be downgraded from this portal — statutory / mandatory reporting rules apply regardless of who logs the case.
              </p>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
