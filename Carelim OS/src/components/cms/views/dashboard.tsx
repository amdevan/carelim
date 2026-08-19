"use client";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import { formatRs, formatCurrency, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { SystemStatusWidget } from "@/components/cms/system-status";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  Users, CalendarClock, Wallet, AlertCircle, ListChecks, FileText,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Stethoscope,
  Pill, Plus, CalendarPlus, Receipt, UserPlus, FlaskConical,
  Download, Building2, Banknote, UserCheck, PackageX, Megaphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface DashboardData {
  kpis: {
    todayPatients: number;
    todayAppointments: number;
    todayRevenue: number;
    todayDue: number;
    todayQueue: number;
    todayPrescriptions: number;
    monthRevenue: number;
    totalPatients: number;
    totalDoctors: number;
    pendingLabs: number;
  };
  revenueDays: { date: string; revenue: number; appointments: number }[];
  patientGrowth: { month: string; patients: number }[];
  deptAppts: { name: string; value: number; color: string }[];
  statusCounts: Record<string, number>;
  lowStock: { id: string; name: string; stockQty: number; reorderLevel: number }[];
  expiringSoon: { id: string; name: string; expiryDate: string }[];
  recentActivities: { id: string; user: string; action: string; module: string; detail: string | null; createdAt: string }[];
}

interface Branch {
  id: string; name: string; code: string; status: string;
}

interface Invoice {
  id: string; invoiceNo: string; type: string; total: number;
}

interface Doctor {
  id: string; name: string; specialization: string; status: string;
  department: { id: string; name: string; color: string | null };
}

const REVENUE_TYPE_COLORS: Record<string, string> = {
  consultation: "#0d9488",
  pharmacy: "#10b981",
  lab: "#f59e0b",
  package: "#06b6d4",
  ipd: "#8b5cf6",
};

const STATUS_RADIAL_COLORS: Record<string, string> = {
  scheduled: "#0d9488",
  "checked-in": "#f59e0b",
  "in-consult": "#8b5cf6",
  completed: "#10b981",
  cancelled: "#f43f5e",
  "no-show": "#94a3b8",
};

interface KpiCard {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  trend: string;
  money?: boolean;
  down?: boolean;
}

export function DashboardView() {
  const { data, loading } = useFetch<DashboardData>("/api/dashboard");
  const { data: branches } = useFetch<Branch[]>("/api/branches");
  const { data: invoices } = useFetch<Invoice[]>("/api/invoices");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const { setView } = useAppStore();
  const [branchId, setBranchId] = useState<string>("all");

  const revenueByService = useMemo(() => {
    if (!invoices) return [];
    const groups: Record<string, number> = {};
    invoices.forEach((i) => {
      const t = i.type || "consultation";
      groups[t] = (groups[t] || 0) + (i.total || 0);
    });
    return Object.entries(groups).map(([type, total]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(total),
      color: REVENUE_TYPE_COLORS[type] || "#0d9488",
    }));
  }, [invoices]);

  const weeklyVisits = useMemo(() => {
    if (!data?.revenueDays) return [];
    return data.revenueDays.map((d) => ({
      day: d.date,
      visits: d.appointments,
    }));
  }, [data]);

  const statusRadial = useMemo(() => {
    if (!data?.statusCounts) return [];
    return Object.entries(data.statusCounts).map(([name, value]) => ({
      name: statusLabel(name),
      value,
      fill: STATUS_RADIAL_COLORS[name] || "#94a3b8",
    }));
  }, [data]);

  const doctorAvailability = useMemo(() => {
    if (!doctors) return { active: 0, onLeave: 0, inactive: 0, onLeaveList: [] as Doctor[] };
    const active = doctors.filter((d) => d.status === "active").length;
    const onLeaveList = doctors.filter((d) => d.status === "on_leave");
    const inactive = doctors.filter((d) => d.status === "inactive").length;
    return { active, onLeave: onLeaveList.length, inactive, onLeaveList };
  }, [doctors]);

  if (loading || !data) return <DashboardSkeleton />;

  const { kpis, revenueDays, patientGrowth, deptAppts, statusCounts, lowStock, expiringSoon, recentActivities } = data;

  // 8 KPI cards (dynamic — derived from kpis + lowStock length)
  const kpiCards: KpiCard[] = [
    { key: "todayAppointments", label: "Today's Appointments", icon: CalendarClock, accent: "from-teal-500 to-teal-600", trend: "+12%" },
    { key: "todayRevenue", label: "Today's Revenue", icon: Wallet, accent: "from-emerald-500 to-emerald-600", trend: "+8%", money: true },
    { key: "todayQueue", label: "Active Queue", icon: ListChecks, accent: "from-amber-500 to-orange-500", trend: "+3" },
    { key: "todayDue", label: "Today's Due", icon: AlertCircle, accent: "from-rose-500 to-rose-600", trend: "-5%", money: true, down: true },
    { key: "monthRevenue", label: "Monthly Revenue", icon: Banknote, accent: "from-cyan-500 to-teal-600", trend: "+18%", money: true },
    { key: "totalPatients", label: "New Registrations", icon: UserCheck, accent: "from-violet-500 to-purple-600", trend: "+9%" },
    { key: "todayDue", label: "Pending Payments", icon: Receipt, accent: "from-amber-500 to-yellow-600", trend: "-2%", money: true, down: true },
    { key: "lowStockCount", label: "Low Stock Alerts", icon: PackageX, accent: "from-rose-500 to-pink-600", trend: `${lowStock.length} items` },
  ];

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["Today's Appointments", kpis.todayAppointments],
      ["Today's Revenue", formatCurrency(kpis.todayRevenue)],
      ["Today's Due", formatCurrency(kpis.todayDue)],
      ["Active Queue", kpis.todayQueue],
      ["Monthly Revenue", formatCurrency(kpis.monthRevenue)],
      ["Total Patients", kpis.totalPatients],
      ["Total Doctors", kpis.totalDoctors],
      ["Pending Lab Tests", kpis.pendingLabs],
      ["Low Stock Items", lowStock.length],
      ["Expiring Soon Items", expiringSoon.length],
    ];
    exportToCSV("medcore-dashboard-summary", ["Metric", "Value"], rows);
    toast.success("Dashboard summary exported");
  };

  const handleBranchChange = (v: string) => {
    setBranchId(v);
    if (v === "all") {
      toast.info("Switched to All Branches");
    } else {
      const b = branches?.find((x) => x.id === v);
      toast.info(`Switched to ${b?.name ?? "branch"}`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 p-5 sm:p-6 text-white"
      >
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-300/20 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-teal-100/90 text-sm">Good {greeting()}, Admin 👋</p>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5">Here's what's happening at Carelim OS today</h2>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-teal-50/90">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {kpis.totalPatients} total patients</span>
              <span className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> {kpis.totalDoctors} doctors on staff</span>
              <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> {kpis.pendingLabs} lab tests</span>
            </div>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur gap-1.5" onClick={() => setView("appointments")}>
                <CalendarPlus className="w-4 h-4" /> Book
              </Button>
              <Button size="sm" className="bg-white text-teal-700 hover:bg-teal-50 gap-1.5" onClick={() => setView("patients")}>
                <UserPlus className="w-4 h-4" /> New Patient
              </Button>
            </div>
            {/* Branch selector */}
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-teal-100/80" />
              <Select value={branchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="h-8 w-[180px] bg-white/15 border-white/20 text-white hover:bg-white/25 text-xs">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="text-[10px] text-muted-foreground font-mono">· {b.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Export banner button */}
      <div className="flex justify-end -mt-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export Dashboard
        </Button>
      </div>

      {/* KPI cards (8) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((k, i) => {
          const value = k.key === "lowStockCount" ? lowStock.length : (kpis as Record<string, number>)[k.key];
          return (
            <KpiCard
              key={`${k.key}-${i}`}
              label={k.label}
              value={k.money ? formatRs(value) : value}
              icon={k.icon}
              accent={k.accent}
              trend={k.trend}
              trendDown={k.down}
              index={i}
            />
          );
        })}
      </div>

      {/* Charts row 1: Revenue (7d) + Dept pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue & Appointments</CardTitle>
                <CardDescription className="text-xs">Last 7 days performance</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Last 7 days</Badge>
                <Badge variant="secondary" className="gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                  <TrendingUp className="w-3 h-3" /> {formatRs(kpis.monthRevenue)} this month
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueDays} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                <XAxis dataKey="date" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip money />} />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#rev)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointments by Department</CardTitle>
            <CardDescription className="text-xs">This month distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={deptAppts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {deptAppts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Patient growth + Revenue by service donut + Weekly visits bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Patient Growth</CardTitle>
            <CardDescription className="text-xs">New registrations over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={patientGrowth} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} vertical={false} />
                <XAxis dataKey="month" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="patients" fill="#10b981" radius={[6, 6, 0, 0]} name="New Patients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Service</CardTitle>
            <CardDescription className="text-xs">All-time invoices grouped by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={revenueByService} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3}>
                  {revenueByService.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => formatRs(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Patient Visits</CardTitle>
            <CardDescription className="text-xs">Appointments per day · last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyVisits} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} vertical={false} />
                <XAxis dataKey="day" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="visits" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3: Appointment status RadialBar + Queue status + Doctor availability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointment Status</CardTitle>
            <CardDescription className="text-xs">Today's distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusRadial.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No appointments today yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={statusRadial} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={6} />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Queue status */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today's Queue Status</CardTitle>
            <CardDescription className="text-xs">Appointment breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {Object.entries(statusCounts).map(([s, c]) => (
              <div key={s} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s] || "bg-gray-100"}`}>
                  {statusLabel(s)}
                </span>
                <span className="text-sm font-semibold">{c}</span>
              </div>
            ))}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No appointments today yet</p>
            )}
          </CardContent>
        </Card>

        {/* Doctor availability */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" /> Doctor Availability
            </CardTitle>
            <CardDescription className="text-xs">Today's roster status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{doctorAvailability.active}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-center">
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{doctorAvailability.onLeave}</p>
                <p className="text-[10px] text-muted-foreground">On Leave</p>
              </div>
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800/50 p-2 text-center">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-400">{doctorAvailability.inactive}</p>
                <p className="text-[10px] text-muted-foreground">Inactive</p>
              </div>
            </div>
            {doctorAvailability.onLeaveList.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Megaphone className="w-3 h-3" /> On Leave Today
                </p>
                {doctorAvailability.onLeaveList.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground text-[11px]">{d.specialization}</span>
                  </div>
                ))}
              </div>
            )}
            {doctorAvailability.onLeaveList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">All doctors available today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low stock + expiry alerts */}
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="w-4 h-4 text-rose-600" /> Inventory Alerts
            </CardTitle>
            <CardDescription className="text-xs">Low stock & expiring soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {lowStock.length === 0 && expiringSoon.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">All good! No alerts.</p>
            )}
            {lowStock.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">Low stock: {m.stockQty} left (reorder at {m.reorderLevel})</p>
                </div>
                <Badge variant="destructive" className="text-[10px] shrink-0">Reorder</Badge>
              </div>
            ))}
            {expiringSoon.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">Expires {new Date(m.expiryDate).toLocaleDateString()}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] shrink-0">Expiring</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" /> Recent Activity
                </CardTitle>
                <CardDescription className="text-xs">Latest actions across the system</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView("audit")}>View all</Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-72 overflow-y-auto scrollbar-thin">
            <div className="space-y-1">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent/50">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    a.action === "CREATE" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" :
                    a.action === "UPDATE" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                    a.action === "DELETE" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                    a.action === "PAYMENT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                    "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                  }`}>
                    {a.action.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.action}</span>
                      <span className="text-muted-foreground"> · {a.module}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System status + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SystemStatusWidget />
        </div>
        <div className="lg:col-span-2">
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "New Patient", icon: UserPlus, view: "patients" as const, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30" },
              { label: "Book Appointment", icon: CalendarPlus, view: "appointments" as const, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
              { label: "Create Invoice", icon: Receipt, view: "billing" as const, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
              { label: "New Prescription", icon: FileText, view: "emr" as const, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
              { label: "Order Lab Test", icon: FlaskConical, view: "laboratory" as const, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
              { label: "Add Medicine", icon: Plus, view: "pharmacy" as const, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => setView(a.view)}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">{a.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-32 rounded-2xl bg-muted/40" />
      <div className="flex justify-end -mt-2">
        <div className="shimmer h-8 w-40 bg-muted/40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-xl bg-muted/40" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="shimmer lg:col-span-2 h-80 rounded-xl bg-muted/40" />
        <div className="shimmer h-80 rounded-xl bg-muted/40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="shimmer h-72 rounded-xl bg-muted/40" />
        <div className="shimmer h-72 rounded-xl bg-muted/40" />
        <div className="shimmer h-72 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}
