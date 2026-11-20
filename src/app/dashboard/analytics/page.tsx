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
import { useAuthStore } from "@/store/authStore";
import { PREK_ROLES, normalizePrekRole } from "@/constants/roles";
import { zoneService } from "@/services/api/zoneService";

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
          <div className="md:col-span-2 rounded-lg p-4 bg-white border border-slate-200 h-[260px] animate-pulse motion-reduce:animate-none" />
          <div className="rounded-lg p-4 bg-white border border-slate-200 h-[260px] animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg p-4 bg-white border border-slate-200 h-[300px] animate-pulse motion-reduce:animate-none" />
          <div className="rounded-lg p-4 bg-white border border-slate-200 h-[300px] animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-lg p-3 sm:p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Incident Trend by Severity</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
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
        <div className="rounded-lg p-3 sm:p-4 flex flex-col justify-between" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold" style={{ color: INK }}>Severity Split</div>
            <span className="text-xs text-slate-500 font-medium">Total: <span className="font-mono tabular-nums">{totalSeverity}</span></span>
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
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-600">{lvl}</span>
                  </div>
                  <span className="font-bold text-slate-900 text-xs font-mono mt-0.5">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg p-3 sm:p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Incidents by Type</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: MUTED }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill={STEEL} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg p-3 sm:p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="text-sm font-semibold mb-3" style={{ color: INK }}>Region Comparison</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#E8843A" radius={[4, 4, 0, 0]} name="Total incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg p-3 sm:p-4 overflow-x-auto scrollbar-thin" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div>
            <div className="text-sm font-semibold" style={{ color: INK }}>Month-wise Summary</div>
            <div className="text-[11px] text-slate-400 font-normal sm:hidden mt-0.5">Scroll horizontally to view columns →</div>
          </div>
          {activeMonth !== "All" && (
            <button
              onClick={() => onSelectMonth("All")}
              className="text-xs font-semibold flex items-center gap-1 cursor-pointer bg-slate-100 px-2 py-1 rounded"
              style={{ color: MUTED }}
            >
              <X size={12} /> Clear month filter
            </button>
          )}
        </div>
        <table className="w-full min-w-[520px] text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Month", "Total", "Open", "Closed", "Closure Rate", "Severity Mix"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: MUTED }}>
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
                  className={`border-t border-slate-200 transition-colors cursor-pointer ${isActive ? "bg-amber-50/70 font-semibold" : "hover:bg-slate-50/60"}`}
                >
                  <td className="px-3 py-2 font-semibold" style={{ color: INK }}>
                    {m.label}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums" style={{ color: INK }}>
                    {m.total}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums" style={{ color: STATUS_COLORS.Open }}>
                    {m.open}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums" style={{ color: STATUS_COLORS.Closed }}>
                    {m.closed}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums" style={{ color: MUTED }}>
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
        <div className="p-4 sm:p-5 pb-2 sm:pb-3 flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">
            Incident Type × Region
          </h2>
          <span className="text-[11px] text-slate-400 font-normal sm:hidden">Scroll to view all →</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[500px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Incident Type</th>
                <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${activeRegion === "North" ? "bg-slate-800" : ""}`}>North</th>
                <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${activeRegion === "South" ? "bg-slate-800" : ""}`}>South</th>
                <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${activeRegion === "East" ? "bg-slate-800" : ""}`}>East</th>
                <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${activeRegion === "West" ? "bg-slate-800" : ""}`}>West</th>
                <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-amber-400 whitespace-nowrap">Total</th>
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
                      className={`transition-colors hover:bg-slate-50/80 ${isEven ? "bg-white" : "bg-slate-50/60"}`}
                    >
                      <td className="py-2 px-3 sm:px-4 font-medium text-slate-800 whitespace-nowrap">{row.type}</td>
                      <td className={`py-2 px-3 sm:px-4 text-center ${row.north === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "North" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.north}
                      </td>
                      <td className={`py-2 px-3 sm:px-4 text-center ${row.south === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "South" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.south}
                      </td>
                      <td className={`py-2 px-3 sm:px-4 text-center ${row.east === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "East" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.east}
                      </td>
                      <td className={`py-2 px-3 sm:px-4 text-center ${row.west === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${activeRegion === "West" ? "bg-orange-50/70 font-bold text-orange-950" : ""}`}>
                        {row.west}
                      </td>
                      <td className="py-2 px-3 sm:px-4 text-center font-bold text-amber-600">
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
  const user = useAuthStore((state) => state.decodedToken);
  const prekRole = normalizePrekRole(user?.role);
  const isCentral =
    prekRole === PREK_ROLES.CENTRAL ||
    user?.role === "superAdmin" ||
    user?.role === "central" ||
    user?.role === "Central";
  const isNationalHead =
    prekRole === PREK_ROLES.NATIONAL_HEAD ||
    user?.role === "school" ||
    user?.role === "national_head" ||
    user?.role === "National Head" ||
    user?.role === "NationalHead";
  const isRSO =
    prekRole === PREK_ROLES.RSO ||
    user?.role === "branchGroup" ||
    user?.role === "rso" ||
    user?.role === "RSO";
  const canAccessZoneFilter = isCentral || isNationalHead;

  const [zonesList, setZonesList] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    zoneService
      .getZones({ isActive: true })
      .then((res) => {
        if (active && res?.data && Array.isArray(res.data)) {
          setZonesList(res.data.map((z) => z.name));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch active zones for analytics:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const [selectedRegion, setSelectedRegion] = useState<any>("All Regions");
  const [activeTab, setActiveTab] = useState<TabType>("National");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [activeZoneRegion, setActiveZoneRegion] = useState("All");
  const [activeZoneMonth, setActiveZoneMonth] = useState("All");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isRSO && (user?.zone || user?.region)) {
      const assigned = user.zone || user.region || "";
      if (assigned) {
        setActiveZoneRegion(assigned);
        setSelectedRegion(assigned as any);
      }
    }
  }, [isRSO, user?.zone, user?.region]);

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

  // BRD v1.1 National Dashboard Data
  const [nationalDashboardData, setNationalDashboardData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    async function fetchNational() {
      try {
        const res = await incidentService.getNationalDashboard();
        if (active && res && (res.data || res.success)) {
          setNationalDashboardData(res.data || res);
        }
      } catch (err) {
        console.warn("National dashboard API fallback to local computation:", err);
      }
    }
    fetchNational();
    return () => {
      active = false;
    };
  }, []);

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
    <div className="min-h-full bg-slate-50 text-slate-800 -m-2 md:-m-4 overflow-x-clip">
      {/* 1. UNIFIED COMMAND BAR HEADER */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs sticky top-0 z-20">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 gap-1 shrink-0">
            {(["National", "Zone Overview", "Escalation Matrix"] as TabType[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
                  }`}
                >
                  {tab === "National" ? "National Overview" : tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Context Controls based on active tab */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between md:justify-end">
          {canAccessZoneFilter && activeTab === "National" && (
            <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/50">
              {["All Regions", ...(zonesList.length > 0 ? zonesList : ["North", "South", "East", "West"])].map((region) => {
                const isActive = selectedRegion === region;
                return (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region as any)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          )}

          {canAccessZoneFilter && activeTab === "Zone Overview" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/50">
                {["All", ...(zonesList.length > 0 ? zonesList : REGIONS)].map((r) => {
                  const isActive = activeZoneRegion === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setActiveZoneRegion(r)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      {r === "All" ? "All Zones" : r}
                    </button>
                  );
                })}
              </div>

              <select
                value={activeZoneMonth}
                onChange={(e) => setActiveZoneMonth(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                <option value="All">All Months</option>
                {zoneMonthOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Network Footprint Badge & Loading */}
          <div className="flex items-center gap-2 shrink-0">
            {loadingStats && (
              <div className="flex items-center gap-1 text-xs text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md border border-amber-200/60">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span className="text-[11px] font-medium">Syncing…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
        {/* ======================================================== */}
        {/* TAB 1: NATIONAL OVERVIEW (WITH 4 KPI CARDS & FULL STATS) */}
        {/* ======================================================== */}
        {activeTab === "National" && (
          <div className="space-y-4 sm:space-y-6">
            {statsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center justify-between">
                <span>{statsError}</span>
                <button
                  onClick={() => setSelectedRegion(selectedRegion)}
                  className="font-semibold underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 4-COLUMN EXECUTIVE TELEMETRY DECK */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Metric 1: Total Incidents */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Total Incidents
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {loadingStats && !statsData ? "..." : totalIncidents}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Across {nationalDashboardData?.totalCentres || 2260} monitored centres
                </div>
              </div>

              {/* Metric 2: Open Cases */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Open Cases
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-600 tracking-tight font-mono">
                  {loadingStats && !statsData ? "..." : openCases}
                </div>
                <div className="text-[11px] text-amber-700/70 font-medium mt-1">
                  Active inquiry & resolution
                </div>
              </div>

              {/* Metric 3: High / Critical */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    High / Critical
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-rose-600 tracking-tight font-mono">
                  {loadingStats && !statsData ? "..." : highOrCritical}
                </div>
                <div className="text-[11px] text-rose-700/70 font-medium mt-1">
                  Zero-tolerance SLA escalation
                </div>
              </div>

              {/* Metric 4: Closure Rate */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Closure Rate
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-emerald-600 tracking-tight font-mono">
                  {loadingStats && !statsData ? "..." : closureRate}
                </div>
                <div className="text-[11px] text-emerald-700/70 font-medium mt-1">
                  Closed vs total recorded
                </div>
              </div>
            </div>

            {/* ROW 1: Incident Trend by Severity & Severity Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              {/* Card 1: Incident Trend by Severity (Stacked Bar) */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Incident Trend by Severity
                  </h2>
                  <span className="text-[11px] text-slate-400 font-normal sm:hidden">Scroll months →</span>
                </div>

                <div className="h-60 sm:h-64 flex items-end justify-start sm:justify-center gap-6 sm:gap-10 md:gap-16 px-2 sm:px-4 overflow-x-auto scrollbar-thin">
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
                          <div className="w-11 sm:w-16 flex flex-col-reverse rounded-t-sm overflow-hidden shadow-xs transition-transform duration-300 hover:scale-[1.02]">
                            {(item.low || 0) > 0 && (
                              <div
                                style={{ height: `${lowH}px` }}
                                className="bg-emerald-600 w-full transition-opacity duration-300 relative group"
                                title={`Low: ${item.low}`}
                              />
                            )}
                            {(item.medium || 0) > 0 && (
                              <div
                                style={{ height: `${medH}px` }}
                                className="bg-amber-600 w-full transition-opacity duration-300 relative group"
                                title={`Medium: ${item.medium}`}
                              />
                            )}
                            {(item.high || 0) > 0 && (
                              <div
                                style={{ height: `${highH}px` }}
                                className="bg-red-600 w-full transition-opacity duration-300 relative group"
                                title={`High: ${item.high}`}
                              />
                            )}
                            {(item.critical || 0) > 0 && (
                              <div
                                style={{ height: `${critH}px` }}
                                className="bg-rose-950 w-full transition-opacity duration-300 relative group"
                                title={`Critical: ${item.critical}`}
                              />
                            )}
                            {(item.total || 0) === 0 && (
                              <div className="h-1 bg-slate-200 w-full" />
                            )}
                          </div>

                          <div className="text-center mt-2.5 sm:mt-3">
                            <div className="text-[11px] sm:text-xs font-medium text-slate-700">{item.month}</div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-mono tabular-nums">{item.total}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 text-[11px] sm:text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-600" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs bg-red-600" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-950" />
                    <span>Critical</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Severity Split */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-3 sm:mb-4">
                  Severity Split
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 my-auto">
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 180 180" aria-hidden="true" className="w-full h-full -rotate-90 transform overflow-visible">
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
                            className="transition-opacity duration-300 cursor-pointer hover:opacity-90"
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
                      <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Total</span>
                      <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono tabular-nums">{totalSeverity}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-3 text-xs md:text-sm font-medium w-full sm:w-auto">
                    {severityItems.map((item) => {
                      const color = SEVERITY_COLORS[item.name as keyof typeof SEVERITY_COLORS] || "#64748b";
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-600 w-14 sm:w-16 text-xs">{item.name}</span>
                          <span className="text-slate-400 font-normal hidden sm:inline">:</span>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm ml-auto sm:ml-0 font-mono tabular-nums">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[10px] sm:text-[11px] text-slate-400 text-center mt-3 sm:mt-4">
                  Categorized by initial safety assessment
                </div>
              </div>
            </div>

            {/* ROW 2: Incidents by Type & Region Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4 sm:mb-6">
                  Incidents by Type
                </h2>

                {incidentsByType.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
                    No incidents recorded by type
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-3.5">
                    {incidentsByType.map((item, idx) => {
                      const widthPercent = (item.count / maxTypeCount) * 100;
                      return (
                        <div key={`${item.name || idx}-${idx}`} className="flex items-center gap-2 sm:gap-3 text-xs">
                          <div className="w-28 sm:w-40 md:w-44 text-right truncate text-slate-700 font-medium shrink-0 text-[11px] sm:text-xs">
                            {item.name}
                          </div>
                          <div className="flex-1 bg-slate-100 rounded-sm h-4 sm:h-5 overflow-hidden flex items-center pr-2">
                            <div
                              style={{ width: `${Math.max(widthPercent, 2)}%` }}
                              className="bg-slate-900 h-full rounded-sm transition-transform duration-500 ease-out"
                            />
                          </div>
                          <div className="w-6 text-right font-bold text-slate-800 shrink-0 text-[11px] sm:text-xs font-mono tabular-nums">
                            {item.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4 sm:mb-6">
                  Region Comparison
                </h2>

                {regionComparison.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
                    No regional comparison data available
                  </div>
                ) : (
                  <div className="h-48 sm:h-56 flex items-end justify-between px-2 sm:px-8 pt-4 sm:pt-6">
                    {regionComparison.map((item, idx) => {
                      const barHeight = ((item.count || 0) / maxRegionVal) * 160;
                      const isSelected = selectedRegion === "All Regions" || (item.region && selectedRegion.toLowerCase() === item.region.toLowerCase());

                      return (
                        <div key={`${item.region || idx}-${idx}`} className="flex flex-col items-center flex-1 max-w-[50px] sm:max-w-[60px]">
                          <div className="text-xs font-bold text-slate-700 mb-1.5 font-mono tabular-nums">{item.count}</div>
                          <div
                            style={{ height: `${Math.max(barHeight, 4)}px` }}
                            className={`w-8 sm:w-12 rounded-t-sm transition-colors duration-300 ${
                              isSelected ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-600/40"
                            }`}
                          />
                          <div className="text-[10px] sm:text-[11px] font-medium text-slate-600 mt-2 sm:mt-2.5 truncate max-w-full text-center">
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 pb-2 sm:pb-3 flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Incident Type × Region
                </h2>
                <span className="text-[11px] text-slate-400 font-normal sm:hidden">Scroll to view all →</span>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[500px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold whitespace-nowrap">Incident Type</th>
                      <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${selectedRegion === "North" ? "bg-slate-800" : ""}`}>North</th>
                      <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${selectedRegion === "South" ? "bg-slate-800" : ""}`}>South</th>
                      <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${selectedRegion === "East" ? "bg-slate-800" : ""}`}>East</th>
                      <th className={`py-2.5 sm:py-3 px-3 sm:px-4 text-center font-semibold whitespace-nowrap ${selectedRegion === "West" ? "bg-slate-800" : ""}`}>West</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center font-bold text-amber-400 whitespace-nowrap">Total</th>
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
                            className={`transition-colors hover:bg-slate-50/80 ${isEven ? "bg-white" : "bg-slate-50/60"}`}
                          >
                            <td className="py-2 px-3 sm:px-4 font-medium text-slate-800 whitespace-nowrap">{row.type}</td>
                            <td className={`py-2 px-3 sm:px-4 text-center font-mono tabular-nums ${row.north === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "North" ? "bg-amber-50/70 font-bold text-amber-950" : ""}`}>
                              {row.north ?? 0}
                            </td>
                            <td className={`py-2 px-3 sm:px-4 text-center font-mono tabular-nums ${row.south === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "South" ? "bg-amber-50/70 font-bold text-amber-950" : ""}`}>
                              {row.south ?? 0}
                            </td>
                            <td className={`py-2 px-3 sm:px-4 text-center font-mono tabular-nums ${row.east === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "East" ? "bg-amber-50/70 font-bold text-amber-950" : ""}`}>
                              {row.east ?? 0}
                            </td>
                            <td className={`py-2 px-3 sm:px-4 text-center font-mono tabular-nums ${row.west === 0 ? "text-slate-300 font-light" : "text-slate-700 font-medium"} ${selectedRegion === "West" ? "bg-amber-50/70 font-bold text-amber-950" : ""}`}>
                              {row.west ?? 0}
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-center font-bold font-mono tabular-nums text-amber-600">
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
          <div className="space-y-4 sm:space-y-6">
            {/* KPI strip matching national view */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {[
                { label: "Total Incidents", value: zoneKpis.total, icon: FolderOpen, tint: "bg-slate-100 text-slate-700 border-slate-200" },
                { label: "Open Cases", value: zoneKpis.open, icon: Clock, tint: "bg-amber-50 text-amber-600 border-amber-200/60" },
                { label: "High / Critical", value: zoneKpis.critical, icon: ShieldAlert, tint: "bg-rose-50 text-rose-600 border-rose-200/60" },
                { label: "Closure Rate", value: `${zoneKpis.closureRate}%`, icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600 border-emerald-200/60" },
              ].map((k, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {k.label}
                    </span>
                    <div className={`h-7 w-7 rounded-lg border flex items-center justify-center ${k.tint}`}>
                      <k.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
                    {k.value}
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
        {/* TAB 3: ESCALATION MATRIX & SLA PIPELINE                 */}
        {/* ======================================================== */}
        {activeTab === "Escalation Matrix" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 md:p-8 shadow-sm space-y-4">
            <p className="text-xs md:text-sm text-slate-500 mb-2 leading-relaxed">
              Every incident is routed automatically to a designated owner based on severity. Reps can escalate manually if an initial risk is understated.
            </p>

            {/* Row 1: LOW */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-colors">
              <div className="flex items-center justify-between md:justify-start md:w-28 shrink-0">
                <span className="text-center bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold text-xs px-3 py-1 rounded-lg">
                  Low
                </span>
                <span className="md:hidden text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  72 hrs
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Area Operations Manager (AOM)</div>
                <div className="text-xs text-slate-500 mt-0.5 hidden md:block">SLA: 3 working days (72 hrs)</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Log the case, investigate locally, resolve and close. Include in weekly summary to BM.
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">Authorized Closure:</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">AOM</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">BM</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">RSO</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">National Head</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">Central</span>
                </div>
              </div>
            </div>

            {/* Row 2: MEDIUM */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6 shadow-xs hover:border-amber-300 hover:shadow-md transition-colors">
              <div className="flex items-center justify-between md:justify-start md:w-28 shrink-0">
                <span className="text-center bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold text-xs px-3 py-1 rounded-lg">
                  Medium
                </span>
                <span className="md:hidden text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  48 hrs
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Business Manager (BM)</div>
                <div className="text-xs text-slate-500 mt-0.5 hidden md:block">SLA: 48 hours</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Review with AOM, agree corrective action, keep RSO informed via weekly rollup.
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">Authorized Closure:</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">BM</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">RSO</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">National Head</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">Central</span>
                </div>
              </div>
            </div>

            {/* Row 3: HIGH */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6 shadow-xs hover:border-orange-300 hover:shadow-md transition-colors">
              <div className="flex items-center justify-between md:justify-start md:w-28 shrink-0">
                <span className="text-center bg-orange-50 text-orange-700 border border-orange-200/60 font-semibold text-xs px-3 py-1 rounded-lg">
                  High
                </span>
                <span className="md:hidden text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  24 hrs
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Regional Safety Officer (RSO)</div>
                <div className="text-xs text-slate-500 mt-0.5 hidden md:block">SLA: 24 hours</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Lead investigation directly, initiate parent/guardian communication, notify National Head & Central.
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">Authorized Closure:</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">RSO</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">National Head</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">Central</span>
                </div>
              </div>
            </div>

            {/* Row 4: CRITICAL */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6 shadow-xs hover:border-rose-300 hover:shadow-md transition-colors">
              <div className="flex items-center justify-between md:justify-start md:w-28 shrink-0">
                <span className="text-center bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold text-xs px-3 py-1 rounded-lg">
                  Critical
                </span>
                <span className="md:hidden text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  2 hrs
                </span>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="w-full md:w-64 lg:w-72 shrink-0">
                <div className="text-sm md:text-[15px] font-bold text-slate-900">Central (All-Activity Admin)</div>
                <div className="text-xs text-slate-500 mt-0.5 hidden md:block">SLA: 2 hours (immediate)</div>
              </div>
              <div className="w-5 shrink-0 hidden md:flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
              </div>
              <div className="flex-1 text-xs md:text-sm text-slate-600 leading-relaxed">
                Emergency crisis response, legal/regulatory counsel, brand communications, direct board notification. RSO, National Head & Central notified simultaneously. Mandatory / statutory reporting triggered (POCSO, Corporal Punishment).
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">Authorized Closure:</span>
                  <span className="bg-slate-100 border border-slate-200/60 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold">Central Admin Only</span>
                </div>
              </div>
            </div>

            {/* Bottom Alert / Warning */}
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed font-normal">
                Corporal Punishment and POCSO cases are treated as Critical by default and cannot be downgraded from this portal (statutory and mandatory reporting rules apply regardless of who logs the case).
              </p>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
