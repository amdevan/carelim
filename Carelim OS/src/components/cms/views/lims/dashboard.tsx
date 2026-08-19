"use client";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  FlaskConical, TestTube, ListChecks, Syringe, Microscope, FileText,
  AlertTriangle, Wallet, Clock, Download, Activity, Bell,
  Package, CheckCircle2, ChevronRight, Stethoscope, Building2,
} from "lucide-react";
import { formatRs, timeAgo, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { motion } from "framer-motion";
import { toast } from "sonner";

/* ---------- Types (match /api/lab-dashboard response) ---------- */

interface LabDashboardData {
  kpis: {
    totalOrders: number;
    pendingCollection: number;
    collectedSamples: number;
    processingSamples: number;
    pendingResults: number;
    pendingApproval: number;
    completedReports: number;
    criticalResults: number;
    todayRevenue: number;
    avgTAT: number;
  };
  dailyVolume: { date: string; count: number; revenue: number }[];
  deptRequests: { name: string; value: number; color: string }[];
  mostRequested: { name: string; count: number }[];
  techPerf: { name: string; completed: number }[];
  flagCounts: Record<string, number>;
  waitingCollection: { orderNo: string; patient: string; priority: string; tests: number }[];
  urgentTests: { orderNo: string; patient: string; priority: string }[];
  criticalAlerts: { parameter: string; value: string; flag: string; orderId: string }[];
  pendingApprovalList: { orderNo: string; patient: string; tests: number }[];
  recentlyReleased: { orderNo: string; patient: string; completedAt: string | null }[];
  lowStock: { id: string; name: string; stockQty: number; reorderLevel: number }[];
  monthRevenue: number;
  qcStats: { total: number; pass: number; fail: number; warning: number };
  departments: { id: string; name: string; code: string; color: string; tests: number; equipment: number }[];
}

/* ---------- Constants ---------- */

const FLAG_COLORS: Record<string, string> = {
  normal: "#0d9488",
  high: "#f59e0b",
  low: "#06b6d4",
  critical: "#f43f5e",
  panic: "#dc2626",
  abnormal: "#8b5cf6",
};

const FLAG_LABELS: Record<string, string> = {
  normal: "Normal",
  high: "High",
  low: "Low",
  critical: "Critical",
  panic: "Panic",
  abnormal: "Abnormal",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  urgent: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  emergency: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const QC_COLORS: Record<string, string> = {
  pass: "#10b981",
  fail: "#f43f5e",
  warning: "#f59e0b",
};

/* ---------- Small helpers ---------- */

interface KpiCardDef {
  key: string;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

export function LimsDashboard() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<LabDashboardData>(
    refresh ? `/api/lab-dashboard?_r=${refresh}` : "/api/lab-dashboard",
  );

  /* ---- Build chart datasets ---- */
  const flagData = useMemo(() => {
    if (!data?.flagCounts) return [];
    return Object.keys(FLAG_COLORS)
      .filter((k) => (data.flagCounts[k] ?? 0) > 0)
      .map((k) => ({ name: FLAG_LABELS[k], value: data.flagCounts[k] ?? 0, color: FLAG_COLORS[k] }));
  }, [data]);

  const qcData = useMemo(() => {
    if (!data?.qcStats) return [];
    return [
      { name: "Pass", value: data.qcStats.pass, fill: QC_COLORS.pass },
      { name: "Fail", value: data.qcStats.fail, fill: QC_COLORS.fail },
      { name: "Warning", value: data.qcStats.warning, fill: QC_COLORS.warning },
    ];
  }, [data]);

  if (loading || !data) return <DashboardSkeleton />;

  const { kpis } = data;

  /* ---------- 10 KPI cards ---------- */
  const kpiCards: KpiCardDef[] = [
    { key: "totalOrders", label: "Total Lab Orders", value: String(kpis.totalOrders), icon: FlaskConical, accent: "from-teal-500 to-teal-600" },
    { key: "pendingCollection", label: "Pending Collection", value: String(kpis.pendingCollection), icon: ListChecks, accent: "from-amber-500 to-orange-500" },
    { key: "collectedSamples", label: "Collected Samples", value: String(kpis.collectedSamples), icon: Syringe, accent: "from-cyan-500 to-teal-600" },
    { key: "processingSamples", label: "Processing", value: String(kpis.processingSamples), icon: Microscope, accent: "from-violet-500 to-purple-600" },
    { key: "pendingResults", label: "Pending Results", value: String(kpis.pendingResults), icon: TestTube, accent: "from-amber-500 to-yellow-600" },
    { key: "pendingApproval", label: "Pending Approval", value: String(kpis.pendingApproval), icon: FileText, accent: "from-teal-500 to-emerald-600" },
    { key: "completedReports", label: "Completed Reports", value: String(kpis.completedReports), icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
    { key: "criticalResults", label: "Critical Results", value: String(kpis.criticalResults), icon: AlertTriangle, accent: "from-rose-500 to-rose-600" },
    { key: "todayRevenue", label: "Today's Revenue", value: formatRs(kpis.todayRevenue), icon: Wallet, accent: "from-emerald-500 to-teal-600" },
    { key: "avgTAT", label: "Avg TAT (hrs)", value: String(kpis.avgTAT), icon: Clock, accent: "from-teal-500 to-cyan-600" },
  ];

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["Total Lab Orders", kpis.totalOrders],
      ["Pending Collection", kpis.pendingCollection],
      ["Collected Samples", kpis.collectedSamples],
      ["Processing Samples", kpis.processingSamples],
      ["Pending Results", kpis.pendingResults],
      ["Pending Approval", kpis.pendingApproval],
      ["Completed Reports", kpis.completedReports],
      ["Critical Results", kpis.criticalResults],
      ["Today's Revenue", formatRs(kpis.todayRevenue)],
      ["Avg TAT (hours)", kpis.avgTAT],
      ["Month Revenue", formatRs(data.monthRevenue)],
      ["QC Total", data.qcStats.total],
      ["QC Pass", data.qcStats.pass],
      ["QC Fail", data.qcStats.fail],
      ["QC Warning", data.qcStats.warning],
    ];
    exportToCSV("lims-dashboard-summary", ["Metric", "Value"], rows);
    toast.success("LIMS dashboard summary exported");
  };

  const handleRefresh = () => setRefresh((r) => r + 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" /> Laboratory Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time LIMS analytics · Month revenue {formatRs(data.monthRevenue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
            <Activity className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* 10 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((k, i) => (
          <motion.div
            key={k.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
          >
            <Card className="overflow-hidden border-border/60">
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.accent} flex items-center justify-center text-white shadow-sm`}>
                    <k.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <p className="text-xl font-bold mt-2 leading-tight">{k.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 — Daily volume (2-col) + Dept requests donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" /> Daily Test Volume (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyVolume} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="labVolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis className="fill-muted-foreground" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} fill="url(#labVolGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" /> Department-wise Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 250 }}>
              {data.deptRequests.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No department requests
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.deptRequests}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {data.deptRequests.map((d, i) => (
                        <Cell key={i} fill={d.color || "#0d9488"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 — Most Requested (horizontal bar) + Tech Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TestTube className="w-4 h-4 text-teal-600" /> Most Requested Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              {data.mostRequested.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No test request data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.mostRequested}
                    layout="vertical"
                    margin={{ left: 16, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" className="fill-muted-foreground" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                      width={120}
                      tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600" /> Technician Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              {data.techPerf.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No technician data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.techPerf} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                      tickFormatter={(v: string) => (v.length > 10 ? v.split(" ")[0] : v)}
                    />
                    <YAxis className="fill-muted-foreground" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 — Abnormal Result Stats (2-col) + QC Stats card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Abnormal Result Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 240 }}>
              {flagData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No result flags
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flagData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis className="fill-muted-foreground" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                      {flagData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> QC Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-2.5 text-center">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{data.qcStats.pass}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pass</p>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-2.5 text-center">
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{data.qcStats.fail}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fail</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2.5 text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{data.qcStats.warning}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Warning</p>
              </div>
            </div>
            <div className="text-center pt-1">
              <p className="text-xs text-muted-foreground">
                Total QC runs: <span className="font-semibold text-foreground">{data.qcStats.total}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Pass rate:{" "}
                <span className="font-semibold text-emerald-600">
                  {data.qcStats.total > 0
                    ? Math.round((data.qcStats.pass / data.qcStats.total) * 100)
                    : 0}
                  %
                </span>
              </p>
            </div>
            {qcData.length > 0 && data.qcStats.total > 0 && (
              <div style={{ height: 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="30%"
                    outerRadius="100%"
                    data={qcData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background dataKey="value" cornerRadius={6} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live panels — 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Waiting Sample Collection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-amber-600" /> Waiting Sample Collection
              <Badge variant="outline" className="ml-auto text-[10px]">{data.waitingCollection.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {data.waitingCollection.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No samples waiting for collection</p>
              ) : (
                data.waitingCollection.map((w) => (
                  <button
                    key={w.orderNo}
                    onClick={() => toast.info(`Order ${w.orderNo} · ${w.patient} · ${w.tests} tests`)}
                    className="w-full flex items-center justify-between gap-2 text-left rounded-md border border-border/60 hover:bg-accent/50 px-3 py-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.patient}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{w.orderNo} · {w.tests} tests</p>
                    </div>
                    <Badge className={`text-[10px] ${PRIORITY_COLORS[w.priority] || PRIORITY_COLORS.normal}`}>
                      {statusLabel(w.priority)}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Tests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Urgent Tests
              <Badge variant="outline" className="ml-auto text-[10px]">{data.urgentTests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {data.urgentTests.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No urgent tests pending</p>
              ) : (
                data.urgentTests.map((u) => (
                  <div
                    key={u.orderNo}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.patient}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{u.orderNo}</p>
                    </div>
                    <Badge className={`text-[10px] ${PRIORITY_COLORS[u.priority] || PRIORITY_COLORS.urgent}`}>
                      {statusLabel(u.priority)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-600" /> Critical Alerts
              <Badge variant="outline" className="ml-auto text-[10px]">{data.criticalAlerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {data.criticalAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No critical alerts 🎉</p>
              ) : (
                data.criticalAlerts.map((c, i) => (
                  <div
                    key={`${c.orderId}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.parameter}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Value: <span className="font-semibold text-rose-700 dark:text-rose-400">{c.value}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[10px] ${c.flag === "panic" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                        {FLAG_LABELS[c.flag] || statusLabel(c.flag)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] gap-1"
                        onClick={() => toast.info(`Notification sent for ${c.parameter} (order ${c.orderId})`)}
                      >
                        Notify
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approval */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Pending Approval
              <Badge variant="outline" className="ml-auto text-[10px]">{data.pendingApprovalList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {data.pendingApprovalList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No reports pending approval</p>
              ) : (
                data.pendingApprovalList.map((p) => (
                  <div
                    key={p.orderNo}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.patient}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{p.orderNo} · {p.tests} tests</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Released + Low Stock — 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recently Released */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recently Released
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {data.recentlyReleased.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No reports released yet</p>
              ) : (
                data.recentlyReleased.map((r) => (
                  <div
                    key={r.orderNo}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.patient}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{r.orderNo}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {r.completedAt ? timeAgo(r.completedAt) : "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Inventory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" /> Low Stock Inventory
              <Badge variant="outline" className="ml-auto text-[10px]">{data.lowStock.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {data.lowStock.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">All inventory levels are healthy ✓</p>
              ) : (
                data.lowStock.map((s) => {
                  const ratio = s.reorderLevel > 0 ? (s.stockQty / s.reorderLevel) * 100 : 100;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ratio <= 50 ? "bg-rose-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-rose-600">{s.stockQty}</p>
                        <p className="text-[10px] text-muted-foreground">/ {s.reorderLevel}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments strip */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" /> Lab Departments
            <Badge variant="outline" className="ml-auto text-[10px]">{data.departments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
            {data.departments.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-border/60 p-3 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color || "#0d9488" }}
                  />
                  <p className="text-sm font-semibold truncate">{d.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{d.code}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px]">
                  <span className="text-muted-foreground">{d.tests} tests</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{d.equipment} equipment</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Skeleton ---------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[320px] rounded-lg" />
        <Skeleton className="h-[320px] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[350px] rounded-lg" />
        <Skeleton className="h-[350px] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[310px] rounded-lg" />
        <Skeleton className="h-[310px] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[260px] rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  );
}

export default LimsDashboard;
