"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface AnalyticsKPIs {
  totalTenants: number;
  activeTenants: number;
  mrr: number;
  annualRevenue: number;
  totalDoctors: number;
  totalPatients: number;
  totalTickets: number;
  resolvedTickets: number;
  conversionRate: number;
  churnRate: number;
}

interface RevenueTrend {
  month: string;
  subscription: number;
  addOn: number;
  commission: number;
}

interface TenantGrowth {
  month: string;
  count: number;
}

function formatRs(amount: number): string {
  return `NPR ${amount.toLocaleString("en-NP")}`;
}

const PIE_COLORS = ["#0d9488", "#10b981", "#f59e0b", "#6366f1"];

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas-dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setKpis({
            totalTenants: data.kpis?.totalClinics || 0,
            activeTenants: data.kpis?.activeTenants || 0,
            mrr: data.kpis?.mrr || 0,
            annualRevenue: data.kpis?.annualRevenue || 0,
            totalDoctors: data.kpis?.totalDoctors || 0,
            totalPatients: data.kpis?.totalPatients || 0,
            totalTickets: data.tickets?.total || 0,
            resolvedTickets: data.tickets?.resolved || 0,
            conversionRate: data.kpis?.subscriptionGrowth || 0,
            churnRate: data.kpis?.churnRate || 0,
          });
          setRevenueTrend(data.revenueTrend || []);
          setTenantGrowth(data.tenantGrowth || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Tenants", value: kpis?.totalTenants || 0, icon: Building2, color: "text-teal-600", change: "+12%", up: true },
    { label: "Active Tenants", value: kpis?.activeTenants || 0, icon: Activity, color: "text-emerald-600", change: "+8%", up: true },
    { label: "MRR", value: formatRs(kpis?.mrr || 0), icon: Wallet, color: "text-cyan-600", change: "+15%", up: true },
    { label: "Annual Revenue", value: formatRs(kpis?.annualRevenue || 0), icon: TrendingUp, color: "text-violet-600", change: "+22%", up: true },
    { label: "Total Doctors", value: kpis?.totalDoctors || 0, icon: Users, color: "text-amber-600", change: "+5%", up: true },
    { label: "Total Patients", value: kpis?.totalPatients || 0, icon: Users, color: "text-rose-600", change: "+18%", up: true },
    { label: "Churn Rate", value: `${kpis?.churnRate || 0}%`, icon: ArrowDownRight, color: "text-rose-600", change: "-2%", up: true },
    { label: "Resolution Rate", value: `${kpis?.totalTickets ? Math.round(((kpis?.resolvedTickets || 0) / kpis.totalTickets) * 100) : 0}%`, icon: ArrowUpRight, color: "text-emerald-600", change: "+5%", up: true },
  ];

  const tenantStatusData = [
    { name: "Active", value: kpis?.activeTenants || 0 },
    { name: "Trial", value: Math.max(0, (kpis?.totalTenants || 0) - (kpis?.activeTenants || 0)) },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform performance & insights</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 px-2.5 py-1 text-xs font-medium w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 card-hover">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${kpi.color}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.up ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-rose-500" />
                )}
                <span className="text-[11px] text-emerald-600 font-medium">{kpi.change}</span>
                <span className="text-[11px] text-muted-foreground">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue Trend - Line Chart */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Revenue Trend
            </h3>
          </div>
          <div className="px-4 pb-4">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="subscription" stroke="#0d9488" strokeWidth={2} name="Subscription" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="addOn" stroke="#10b981" strokeWidth={2} name="Add-on" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="commission" stroke="#f59e0b" strokeWidth={2} name="Commission" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </div>
        </div>

        {/* Tenant Growth - Bar Chart */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Tenant Growth
            </h3>
          </div>
          <div className="px-4 pb-4">
            {tenantGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tenantGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Tenants" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No growth data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tenant Status Distribution - Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" /> Tenant Status Distribution
            </h3>
          </div>
          <div className="px-4 pb-4">
            {kpis && kpis.totalTenants > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tenantStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tenantStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Revenue</span>
              <span className="text-sm font-semibold tabular-nums">{formatRs(kpis?.annualRevenue || 0)}</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2">
              <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: "72%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Recurring</span>
              <span className="text-sm font-semibold tabular-nums">{formatRs(kpis?.mrr || 0)}</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: "58%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Doctor Coverage</span>
              <span className="text-sm font-semibold tabular-nums">{kpis?.totalDoctors || 0}</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2">
              <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: "45%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Patient Reach</span>
              <span className="text-sm font-semibold tabular-nums">{kpis?.totalPatients || 0}</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: "63%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
