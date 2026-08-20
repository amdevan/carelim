"use client";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { EmptyState } from "@/components/cms/empty-state";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import {
  Building2, CheckCircle2, Clock, PauseCircle, Stethoscope, Users,
  Wallet, CalendarRange, TrendingUp, Activity, CalendarClock, Sparkles,
  Receipt, Radio, ShieldCheck, ChevronRight, CircleDot,
} from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { motion } from "framer-motion";

interface SaasDashboardData {
  kpis: {
    totalClinics: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalDoctors: number;
    totalPatients: number;
    totalAppointments: number;
    mrr: number;
    annualRevenue: number;
    monthlyRevenue: number;
    churnRate: number;
    subscriptionGrowth: number;
  };
  plans: Array<{
    id: string; name: string; priceMonthly: number; priceYearly: number;
    maxDoctors: number; isActive: boolean; tenantCount: number;
  }>;
  revenueTrend: Array<{ month: string; subscription: number; addOn: number; commission: number }>;
  tenantGrowth: Array<{ month: string; count: number }>;
  tickets: { open: number; assigned: number; resolved: number; total: number };
  leads: { total: number; converted: number; trial: number; demo: number };
  recentActivity: Array<{
    adminEmail: string; action: string; module: string;
    detail: string | null; createdAt: string;
  }>;
  tenants: Array<{
    id: string; name: string; plan: string | null; status: string;
    ownerEmail: string; city: string | null; createdAt: string; lastLoginAt: string | null;
  }>;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  LOGIN: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  APPROVE: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  SUSPEND: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

export function SaasDashboard() {
  const { data, loading } = useFetch<SaasDashboardData>("/api/saas-dashboard");

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const { kpis, plans, revenueTrend, tenantGrowth, recentActivity, tenants, tickets, leads } = data;

  const kpiItems = [
    { label: "Total Clinics", value: kpis.totalClinics, icon: Building2, accent: "from-teal-500 to-teal-600", trend: `+${kpis.subscriptionGrowth} this month` },
    { label: "Active Tenants", value: kpis.activeTenants, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
    { label: "On Trial", value: kpis.trialTenants, icon: Clock, accent: "from-amber-500 to-orange-500" },
    { label: "Suspended", value: kpis.suspendedTenants, icon: PauseCircle, accent: "from-rose-500 to-rose-600" },
    { label: "Total Doctors", value: kpis.totalDoctors, icon: Stethoscope, accent: "from-cyan-500 to-cyan-600" },
    { label: "Total Patients", value: kpis.totalPatients, icon: Users, accent: "from-violet-500 to-purple-600" },
    { label: "MRR", value: formatRs(kpis.mrr), icon: Wallet, accent: "from-teal-500 to-emerald-600", subtitle: "Monthly Recurring Revenue" },
    { label: "Annual Revenue", value: formatRs(kpis.annualRevenue), icon: CalendarRange, accent: "from-emerald-500 to-teal-600" },
    { label: "Monthly Revenue", value: formatRs(kpis.monthlyRevenue), icon: TrendingUp, accent: "from-cyan-500 to-teal-600" },
    { label: "Churn Rate", value: `${kpis.churnRate}%`, icon: Activity, accent: "from-rose-500 to-pink-600", trendDown: kpis.churnRate > 5 },
    { label: "Appointments", value: kpis.totalAppointments, icon: CalendarClock, accent: "from-amber-500 to-orange-500" },
    { label: "New This Month", value: kpis.subscriptionGrowth, icon: Sparkles, accent: "from-teal-500 to-cyan-600" },
  ];

  const maxTenantCount = Math.max(...plans.map(p => p.tenantCount), 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Platform Overview</h2>
          <p className="text-xs text-muted-foreground">Real-time SaaS metrics across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
          <Badge variant="outline" className="text-[11px]">{tenants.length} recent tenants</Badge>
        </div>
      </div>

      {/* 12 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiItems.map((k, i) => (
          <KpiCard key={k.label} {...k} index={i} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Analytics */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue Analytics</CardTitle>
                <CardDescription className="text-xs">Subscription · Add-on · Commission trend (6 months)</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <TrendingUp className="w-3 h-3" /> {formatRs(kpis.annualRevenue)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="saasSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="saasAddOn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="saasComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.4} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip money />} />
                <Area type="monotone" dataKey="subscription" stroke="#0d9488" strokeWidth={2} fill="url(#saasSub)" name="Subscription" />
                <Area type="monotone" dataKey="addOn" stroke="#10b981" strokeWidth={2} fill="url(#saasAddOn)" name="Add-on" />
                <Area type="monotone" dataKey="commission" stroke="#06b6d4" strokeWidth={2} fill="url(#saasComm)" name="Commission" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tenant Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tenant Growth</CardTitle>
            <CardDescription className="text-xs">New clinics per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tenantGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="saasBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.4} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.1 }} />
                <Bar dataKey="count" fill="url(#saasBar)" radius={[6, 6, 0, 0]} name="New Tenants" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Plans + Recent Tenants + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plans Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4 text-teal-600" /> Plans Overview</CardTitle>
            <CardDescription className="text-xs">Active subscriptions by plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {plans.length === 0 ? (
              <EmptyState icon={Receipt} title="No plans" description="Create plans via Subscription Management" />
            ) : plans.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card/50 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {!p.isActive && <Badge className="text-[9px] bg-gray-100 text-gray-600">Inactive</Badge>}
                  </div>
                  <span className="text-sm font-bold tabular-nums">{p.tenantCount}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatRs(p.priceMonthly)}/mo · {p.maxDoctors} doctors</span>
                  <span>{p.tenantCount > 0 ? Math.round((p.tenantCount / Math.max(kpis.totalClinics, 1)) * 100) : 0}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.tenantCount / maxTenantCount) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-teal-600" /> Recent Tenants</CardTitle>
            <CardDescription className="text-xs">Latest clinic signups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {tenants.length === 0 ? (
              <EmptyState icon={Building2} title="No tenants yet" />
            ) : tenants.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                <Avatar className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                  <AvatarFallback className="bg-transparent text-teal-700 dark:text-teal-300 text-xs font-semibold">
                    {t.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {t.plan || "No plan"} · {t.city || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={`text-[9px] ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}>
                    {statusLabel(t.status)}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-600" /> Live Activity</CardTitle>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </Badge>
            </div>
            <CardDescription className="text-xs">Platform audit events</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity" description="Actions will appear here" />
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 flex items-center justify-center shrink-0">
                        <CircleDot className="w-3 h-3 text-teal-600" />
                      </div>
                      {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-border my-0.5" />}
                    </div>
                    <div className="flex-1 pb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[9px] ${actionColors[a.action] || "bg-gray-100 text-gray-600"}`}>
                          {a.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{a.module}</span>
                      </div>
                      <p className="text-xs text-foreground mt-1 leading-snug">{a.detail || a.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.adminEmail} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer stats: Tickets + Leads */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open Tickets</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{tickets.open}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tickets.total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-violet-600 mb-1.5">
              <ChevronRight className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{tickets.assigned}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tickets.resolved} resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-teal-600 mb-1.5">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{leads.total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{leads.demo} demos · {leads.trial} trials</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Converted</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{leads.converted}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {leads.total > 0 ? Math.round((leads.converted / leads.total) * 100) : 0}% conversion
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
