"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ScanLine, Clock, CheckCircle2, DollarSign, AlertTriangle,
  Activity, Cpu, CalendarClock, Bell, Download,
} from "lucide-react";
import { formatRs, timeAgo } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface RISData {
  kpis: {
    todayOrders: number; pendingScans: number; urgentPending: number;
    completed: number; completionRate: number; todayRevenue: number;
    pendingReports: number; avgTAT: number; criticalAlerts: number;
  };
  modalityVolume: { name: string; count: number; revenue: number }[];
  equipmentUtil: { name: string; modality: string; utilization: number; status: string }[];
  statusCounts: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
  criticalAlerts: {
    id: string; patientName: string; modality: string; bodyPart: string | null;
    finding: string; severity: string; aiConfidence: number | null;
    doctorNotified: boolean; smsSent: boolean; erAlerted: boolean; createdAt: string;
  }[];
  waitingPatients: { studyUid: string; patientName: string; modality: string; bodyPart: string; priority: string }[];
  upcomingSchedules: { patientName: string; modality: string; bodyPart: string; timeSlot: string; status: string }[];
}

const MODALITY_COLORS = ["#0d9488", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#f43f5e", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

export function RisDashboard() {
  const { data, loading } = useFetch<RISData>("/api/radiology-dashboard");

  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;

  const { kpis, modalityVolume, equipmentUtil, statusCounts, dailyTrend, criticalAlerts, waitingPatients, upcomingSchedules } = data;

  const handleExport = () => {
    exportToCSV("radiology-dashboard", ["Metric", "Value"], [
      ["Today's Orders", kpis.todayOrders],
      ["Pending Scans", kpis.pendingScans],
      ["Urgent Pending", kpis.urgentPending],
      ["Completed", kpis.completed],
      ["Completion Rate", `${kpis.completionRate}%`],
      ["Today's Revenue", formatRs(kpis.todayRevenue)],
      ["Pending Reports", kpis.pendingReports],
      ["Avg TAT (hrs)", kpis.avgTAT],
      ["Critical Alerts", kpis.criticalAlerts],
    ]);
    toast.success("Dashboard exported");
  };

  const acknowledgeAlert = async (id: string) => {
    const res = await fetchAPI(`/api/radiology-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "acknowledged", acknowledgedBy: "Dr. Admin" }),
    });
    if (res.ok) toast.success("Alert acknowledged");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Today's Orders" value={kpis.todayOrders} icon={ScanLine} accent="from-teal-500 to-teal-600" trend="+12%" index={0} />
        <KpiCard label="Pending Scans" value={kpis.pendingScans} icon={Clock} accent="from-amber-500 to-orange-500" subtitle={`${kpis.urgentPending} urgent`} index={1} />
        <KpiCard label="Completed" value={kpis.completed} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" trend={`${kpis.completionRate}%`} index={2} />
        <KpiCard label="Today's Revenue" value={formatRs(kpis.todayRevenue)} icon={DollarSign} accent="from-cyan-500 to-cyan-600" trend="+8.4%" index={3} />
        <KpiCard label="Critical Alerts" value={kpis.criticalAlerts} icon={AlertTriangle} accent="from-rose-500 to-red-600" index={4} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Study Volume Trend</CardTitle>
            <CardDescription className="text-xs">Daily studies (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="risVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.3} strokeDasharray="3 3" />
                <XAxis dataKey="date" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2.5} fill="url(#risVol)" name="Studies" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Modality Distribution</CardTitle>
            <CardDescription className="text-xs">Study volume by modality</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={modalityVolume} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {modalityVolume.map((_, i) => <Cell key={i} fill={MODALITY_COLORS[i % MODALITY_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Equipment Utilization + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5"><Cpu className="w-4 h-4 text-teal-600" /> Equipment Utilization</CardTitle>
            <CardDescription className="text-xs">Real-time machine status & throughput</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {equipmentUtil.map((eq, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{eq.name}</span>
                    <span className="text-xs text-muted-foreground">{eq.modality}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${eq.utilization > 80 ? "bg-rose-500" : eq.utilization > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${eq.utilization}%` }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-10 text-right">{eq.utilization}%</span>
                  </div>
                </div>
                <Badge className={`text-[9px] shrink-0 ${eq.status === "operational" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : eq.status === "maintenance" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                  {eq.status}
                </Badge>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5"><Activity className="w-4 h-4 text-teal-600" /> Study Status</CardTitle>
            <CardDescription className="text-xs">Current pipeline breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium capitalize">{status.replace("-", " ")}</span>
                <span className="text-lg font-bold tabular-nums">{count}</span>
              </div>
            ))}
            {Object.keys(statusCounts).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No studies</p>}
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="card-hover border-rose-200 dark:border-rose-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Critical Findings Alert
              <Badge className="ml-1 bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-[10px]">{criticalAlerts.length} active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalAlerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[9px] ${a.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}>
                        {a.severity === "critical" ? "STAT" : "URGENT"}
                      </Badge>
                      <span className="text-sm font-semibold">{a.modality} — {a.bodyPart || "N/A"}</span>
                      {a.aiConfidence && (
                        <Badge variant="outline" className="text-[9px]">AI {Math.round(a.aiConfidence * 100)}%</Badge>
                      )}
                    </div>
                    <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">{a.finding}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Patient: {a.patientName} · {timeAgo(a.createdAt)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {a.doctorNotified && <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">✓ Doctor Notified</span>}
                      {a.smsSent && <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">✓ SMS Sent</span>}
                      {a.erAlerted && <span className="text-[9px] text-rose-600 flex items-center gap-0.5">✓ ER Alerted</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => acknowledgeAlert(a.id)}>Acknowledge</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Waiting Patients + Upcoming Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-600" /> Waiting Patients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {waitingPatients.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No patients waiting</p> : waitingPatients.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{p.patientName}</p>
                  <p className="text-[10px] text-muted-foreground">{p.modality} · {p.bodyPart}</p>
                </div>
                <Badge className={`text-[9px] ${p.priority === "stat" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" : p.priority === "urgent" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"}`}>
                  {p.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-teal-600" /> Upcoming Schedules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {upcomingSchedules.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No upcoming schedules</p> : upcomingSchedules.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.patientName}</p>
                  <p className="text-[10px] text-muted-foreground">{s.modality} · {s.bodyPart}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{s.timeSlot}</p>
                  <Badge className={`text-[9px] ${s.status === "confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
