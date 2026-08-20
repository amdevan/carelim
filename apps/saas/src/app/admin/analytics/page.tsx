"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
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

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas-dashboard")
      .then((r) => r.ok ? r.json() : null)
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
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Platform performance & insights</p>
        </div>
        <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="card-hover">
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue & Growth Charts (placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueTrend.length > 0 ? (
              <div className="space-y-2">
                {revenueTrend.map((r) => (
                  <div key={r.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-10">{r.month}</span>
                    <div className="flex-1 bg-muted/40 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(100, (r.subscription / (kpis?.annualRevenue || 1)) * 300)}%` }}
                      >
                        <span className="text-[10px] font-semibold text-white">{formatRs(r.subscription)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> Tenant Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantGrowth.length > 0 ? (
              <div className="space-y-2">
                {tenantGrowth.map((g) => (
                  <div key={g.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-10">{g.month}</span>
                    <div className="flex-1 bg-muted/40 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(100, g.count * 20)}%` }}
                      >
                        {g.count > 0 && <span className="text-[10px] font-semibold text-white">{g.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No growth data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
