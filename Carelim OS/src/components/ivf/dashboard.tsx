"use client";

import { useFetch } from "@/lib/use-fetch";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { EmptyState } from "@/components/cms/empty-state";
import { exportToCSV } from "@/lib/export-utils";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, HeartPulse, Baby, Snowflake, Layers, FlaskConical, Syringe,
  Stethoscope, TestTube2, TrendingUp, Users, FileWarning, Download,
  CircleDot, Calendar, ChevronRight, Microscope,
} from "lucide-react";
import { formatRs, formatDate, timeAgo } from "@/lib/format";
import { motion } from "framer-motion";
import { toast } from "sonner";

// =====================================================================
// Types
// =====================================================================
interface DashboardData {
  kpis: {
    totalCycles: number;
    activeCycles: number;
    monthCycles: number;
    totalPatients: number;
    totalAssessments: number;
    totalEmbryos: number;
    frozenEmbryos: number;
    cryobankItems: number;
    totalTransfers: number;
    activePregnancies: number;
    positivePregnancies: number;
    successRate: number;
    totalDonors: number;
    pendingConsents: number;
  };
  statusCounts: Record<string, number>;
  cycleTrend: Array<{ month: string; cycles: number; pregnancies: number }>;
  protocols: Array<{ id: string; name: string; code: string; type: string; duration: number }>;
  packages: Array<{ id: string; name: string; code: string; totalCost: number }>;
  recentCycles: Array<{
    id: string; cycleNo: string; patientName: string; status: string;
    cycleNumber: number; startDate: string;
  }>;
  donors: Array<{
    id: string; donorCode: string; type: string;
    screeningStatus: string; status: string;
  }>;
}

// Status → teal-family palette for pie segments (no blue / indigo)
const STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  stimulation: "#14b8a6",
  monitoring: "#06b6d4",
  opu: "#0d9488",
  transfer: "#10b981",
  wait: "#f97316",
  pregnant: "#059669",
  failed: "#f43f5e",
  cancelled: "#94a3b8",
};

const STATUS_BADGE: Record<string, string> = {
  planned: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  stimulation: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  monitoring: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  opu: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  wait: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  pregnant: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  stimulation: "Stimulation",
  monitoring: "Monitoring",
  opu: "OPU",
  transfer: "Transfer",
  wait: "Waiting",
  pregnant: "Pregnant",
  failed: "Failed",
  cancelled: "Cancelled",
};

const DONOR_TYPE_BADGE: Record<string, string> = {
  egg: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  sperm: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  embryo: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
};

// =====================================================================
// Component
// =====================================================================
export function IvfDashboard() {
  const { data, loading } = useFetch<DashboardData>("/api/ivf-dashboard");

  const handleExport = useCallback(() => {
    if (!data?.recentCycles?.length) {
      toast.info("Nothing to export");
      return;
    }
    exportToCSV(
      "ivf-recent-cycles",
      ["Cycle No", "Patient ID", "Cycle #", "Status", "Start Date"],
      data.recentCycles.map((c) => [
        c.cycleNo, c.patientName, c.cycleNumber,
        STATUS_LABEL[c.status] || c.status, formatDate(c.startDate),
      ]),
    );
    toast.success("Recent cycles exported");
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const { kpis, statusCounts, cycleTrend, recentCycles, donors, protocols, packages } = data;

  const kpiItems = [
    { label: "Total Cycles", value: kpis.totalCycles, icon: Activity, accent: "from-teal-500 to-teal-600", trend: `+${kpis.monthCycles} mo` },
    { label: "Active Cycles", value: kpis.activeCycles, icon: HeartPulse, accent: "from-emerald-500 to-emerald-600" },
    { label: "This Month", value: kpis.monthCycles, icon: Calendar, accent: "from-cyan-500 to-teal-600" },
    { label: "Total Embryos", value: kpis.totalEmbryos, icon: Microscope, accent: "from-teal-500 to-emerald-600" },
    { label: "Frozen Embryos", value: kpis.frozenEmbryos, icon: Snowflake, accent: "from-cyan-500 to-cyan-600" },
    { label: "Cryobank Items", value: kpis.cryobankItems, icon: Layers, accent: "from-teal-600 to-emerald-600" },
    { label: "Total Transfers", value: kpis.totalTransfers, icon: Syringe, accent: "from-emerald-500 to-teal-600" },
    { label: "Active Pregnancies", value: kpis.activePregnancies, icon: Baby, accent: "from-pink-500 to-rose-500" },
    { label: "Positive Pregnancies", value: kpis.positivePregnancies, icon: HeartPulse, accent: "from-emerald-500 to-green-600" },
    { label: "Success Rate", value: `${kpis.successRate}%`, icon: TrendingUp, accent: "from-teal-500 to-emerald-600", subtitle: "Positive / total cycles" },
    { label: "Total Donors", value: kpis.totalDonors, icon: Users, accent: "from-amber-500 to-orange-500" },
    { label: "Pending Consents", value: kpis.pendingConsents, icon: FileWarning, accent: "from-rose-500 to-pink-600" },
  ];

  // Pie data: filter zero counts
  const pieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABEL[k] || k, value: v, key: k }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">IVF Dashboard</h2>
          <p className="text-xs text-muted-foreground">
            Live fertility operations overview · {kpis.totalCycles} cycles · {kpis.successRate}% success rate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
          <Badge variant="outline" className="text-[11px]">{protocols.length} protocols</Badge>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* 12 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiItems.map((k, i) => (
          <KpiCard key={k.label} {...k} index={i} />
        ))}
      </div>

      {/* Charts: Cycle Trend + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cycle Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" /> Cycle Trend
                </CardTitle>
                <CardDescription className="text-xs">Cycles & pregnancies — last 6 months</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {cycleTrend.reduce((a, m) => a + m.cycles, 0)} cycles
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cycleTrend} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="ivfCycles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ivfPreg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.4} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="cycles" stroke="#0d9488" strokeWidth={2} fill="url(#ivfCycles)" name="Cycles" />
                <Area type="monotone" dataKey="pregnancies" stroke="#10b981" strokeWidth={2} fill="url(#ivfPreg)" name="Pregnancies" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-emerald-600" /> Cycle Status
            </CardTitle>
            <CardDescription className="text-xs">Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyState icon={CircleDot} title="No cycles yet" description="Cycles will appear once created" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={48}
                      outerRadius={84}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {pieData.map((entry) => (
                    <div key={entry.key} className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[entry.key] || "#94a3b8" }}
                      />
                      <span className="text-muted-foreground truncate flex-1">{entry.name}</span>
                      <span className="font-semibold tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Cycles + Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Cycles */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" /> Recent Cycles
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{recentCycles.length} latest</Badge>
            </div>
            <CardDescription className="text-xs">Newest IVF cycles in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentCycles.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No cycles yet" description="Create a new cycle to begin" />
            ) : (
              recentCycles.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                    <AvatarFallback className="bg-transparent text-teal-700 dark:text-teal-300 text-[11px] font-semibold">
                      {c.cycleNo.replace("IVF-", "").slice(-3)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.cycleNo}</p>
                      <span className="text-[10px] text-muted-foreground">· Cycle #{c.cycleNumber}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Patient ID: {c.patientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-[9px] ${STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {timeAgo(c.startDate)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Donors + Protocols */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" /> Donors
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{kpis.totalDonors} total</Badge>
              </div>
              <CardDescription className="text-xs">Latest donor profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {donors.length === 0 ? (
                <EmptyState icon={Users} title="No donors yet" />
              ) : (
                donors.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 flex items-center justify-center shrink-0">
                      <TestTube2 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.donorCode}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{d.type} donor</p>
                    </div>
                    <Badge className={`text-[9px] ${DONOR_TYPE_BADGE[d.type] || "bg-gray-100 text-gray-600"}`}>
                      {d.type}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" /> Protocols & Packages
              </CardTitle>
              <CardDescription className="text-xs">Treatment summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Protocols</p>
                  <p className="text-lg font-bold tabular-nums text-teal-700 dark:text-teal-300">{protocols.length}</p>
                </div>
                <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Packages</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{packages.length}</p>
                </div>
              </div>
              {packages.length > 0 && (
                <div className="space-y-1">
                  {packages.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs px-1 py-1">
                      <span className="truncate">{p.name}</span>
                      <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-300">
                        {formatRs(p.totalCost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
