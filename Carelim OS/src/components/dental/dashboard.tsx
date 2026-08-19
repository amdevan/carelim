"use client";

import { useFetch } from "@/lib/use-fetch";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cms/empty-state";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate, timeAgo, statusColors } from "@/lib/format";
import {
  Activity, Stethoscope, CalendarClock, Wallet, ClipboardList,
  CheckCircle2, Users, Wrench, GitBranch, Sparkles,
  BellRing,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

interface DentalDashboardData {
  kpis: {
    todayPatients: number;
    todayProcedures: number;
    upcomingAppointments: number;
    revenue: number;
    totalRevenue: number;
    pendingTreatments: number;
    completedProcedures: number;
    activeOrthoCases: number;
    activeImplants: number;
    pendingLabOrders: number;
    upcomingFollowups: number;
    totalExaminations: number;
    totalImages: number;
  };
  procByType: Record<string, number>;
  planByType: Record<string, number>;
  planStatus: Record<string, number>;
  labStatus: Record<string, number>;
  orthoStatus: Record<string, number>;
  implantStatus: Record<string, number>;
  trend: { month: string; procedures: number; revenue: number }[];
  recentProcedures: { id: string; procNo: string; patientId: string; procedureType: string; toothNumbers: string | null; procedureDate: string; status: string }[];
  upcomingFollowups: { id: string; followupNo: string; patientId: string; type: string; scheduledDate: string; status: string }[];
  doctorSchedule: { id: string; time: string; patientName: string; doctorName: string; status: string; reason: string }[];
  pendingLabOrdersList: { id: string; orderNo: string; patientId: string; labType: string; status: string; sentDate: string; deliveryDate: string | null }[];
}

const TYPE_LABELS: Record<string, string> = {
  scaling: "Scaling", polishing: "Polishing", composite_filling: "Composite Filling",
  amalgam_filling: "Amalgam Filling", rct: "Root Canal", extraction: "Extraction",
  surgical_extraction: "Surgical Extraction", crown: "Crown", bridge: "Bridge",
  implant: "Implant", orthodontics: "Orthodontics", dentures: "Dentures",
  veneers: "Veneers", whitening: "Whitening", perio_surgery: "Perio Surgery",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b", approved: "#0d9488", in_progress: "#0891b2",
  completed: "#10b981", cancelled: "#f43f5e",
  pending: "#f59e0b", in_lab: "#0891b2", ready: "#8b5cf6",
  delivered: "#10b981", returned: "#f43f5e",
  active: "#10b981", paused: "#f59e0b", restored: "#0d9488",
  placed: "#0891b2", osseointegrating: "#0d9488", maintained: "#10b981", failed: "#f43f5e",
};

export function DentalDashboard() {
  const { data, loading } = useFetch<DentalDashboardData>("/api/dental-dashboard");

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const { kpis, trend, procByType, labStatus, recentProcedures, upcomingFollowups, doctorSchedule, pendingLabOrdersList } = data;

  const procChartData = Object.entries(procByType).map(([type, count]) => ({ type: TYPE_LABELS[type] || type, count }));
  const labChartData = Object.entries(labStatus).map(([status, count]) => ({ status: status.replace(/_/g, " "), count, fill: STATUS_COLORS[status] || "#94a3b8" }));

  const kpis8 = [
    { label: "Today's Patients", value: kpis.todayPatients, icon: Users, accent: "from-teal-500 to-teal-600", subtitle: `${kpis.totalExaminations} total exams` },
    { label: "Today's Procedures", value: kpis.todayProcedures, icon: Activity, accent: "from-emerald-500 to-emerald-600", subtitle: `${kpis.completedProcedures} completed total` },
    { label: "Upcoming Appointments", value: kpis.upcomingAppointments, icon: CalendarClock, accent: "from-cyan-500 to-cyan-600", subtitle: "Next 24 hours" },
    { label: "Revenue (Month)", value: formatRs(kpis.revenue), icon: Wallet, accent: "from-amber-500 to-amber-600", subtitle: `${formatRs(kpis.totalRevenue)} total`, trend: "12%" },
    { label: "Pending Treatments", value: kpis.pendingTreatments, icon: ClipboardList, accent: "from-rose-500 to-rose-600", subtitle: "Awaiting completion" },
    { label: "Doctor Schedule", value: doctorSchedule.length, icon: Stethoscope, accent: "from-violet-500 to-violet-600", subtitle: "Today's chair-time" },
    { label: "Completed Procedures", value: kpis.completedProcedures, icon: CheckCircle2, accent: "from-pink-500 to-pink-600", subtitle: "All-time" },
    { label: "Treatment Stats", value: procChartData.length, icon: Sparkles, accent: "from-fuchsia-500 to-fuchsia-600", subtitle: "Procedure types" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold leading-tight">Dental Dashboard</h2>
          <p className="text-xs text-muted-foreground">Clinical overview &amp; practice KPIs for today</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
            <Activity className="w-3 h-3" /> {kpis.activeOrthoCases} active ortho
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300">
            <Wrench className="w-3 h-3" /> {kpis.activeImplants} implants
          </Badge>
          <button
            onClick={() => exportToCSV(`dental-procedures-${Date.now()}`, ["ProcNo", "Patient", "Type", "Teeth", "Date", "Status"], recentProcedures.map(p => [p.procNo, p.patientId, p.procedureType, p.toothNumbers || "", p.procedureDate, p.status]))}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {kpis8.map((k, i) => <KpiCard key={i} {...k} index={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> Procedures &amp; Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="dProc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="procedures" name="Procedures" stroke="#0d9488" strokeWidth={2} fill="url(#dProc)" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#dRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-500" /> Lab Orders Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {labChartData.length === 0 ? (
              <EmptyState icon={GitBranch} title="No lab orders" className="py-6" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={labChartData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2}>
                    {labChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-500" /> Procedures by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={procChartData} layout="vertical" margin={{ left: 28, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                <Bar dataKey="count" name="Procedures" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-violet-500" /> Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {doctorSchedule.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No appointments today" className="py-6" />
            ) : (
              <div className="space-y-2">
                {doctorSchedule.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/40 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">{a.time}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{a.patientName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.doctorName} · {a.reason}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[a.status] || ""}`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> Recent Procedures
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {recentProcedures.length === 0 ? (
              <EmptyState icon={Activity} title="No procedures yet" className="py-6" />
            ) : (
              <div className="space-y-2">
                {recentProcedures.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {p.procNo.slice(-3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{TYPE_LABELS[p.procedureType] || p.procedureType}</p>
                      <p className="text-[10px] text-muted-foreground">Tooth {p.toothNumbers || "—"} · {timeAgo(p.procedureDate)}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[p.status] || ""}`}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-500" /> Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {upcomingFollowups.length === 0 ? (
              <EmptyState icon={BellRing} title="No follow-ups" className="py-6" />
            ) : (
              <div className="space-y-2">
                {upcomingFollowups.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold capitalize truncate">{f.type.replace(/_/g, " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{f.followupNo} · {formatDate(f.scheduledDate)}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[f.status] || ""}`}>{f.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-pink-500" /> Pending Lab Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {pendingLabOrdersList.length === 0 ? (
              <EmptyState icon={Wrench} title="No pending orders" className="py-6" />
            ) : (
              <div className="space-y-2">
                {pendingLabOrdersList.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold capitalize truncate">{l.labType} · {l.orderNo}</p>
                      <p className="text-[10px] text-muted-foreground">Sent {formatDate(l.sentDate)} · Due {l.deliveryDate ? formatDate(l.deliveryDate) : "—"}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColors[l.status] || ""}`}>{l.status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
