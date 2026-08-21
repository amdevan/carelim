"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  PauseCircle,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Stethoscope,
  CalendarRange,
} from "lucide-react";

interface DashboardKPIs {
  totalClinics: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalDoctors: number;
  totalPatients: number;
  mrr: number;
  annualRevenue: number;
}

function formatRs(amount: number): string {
  return `NPR ${amount.toLocaleString("en-NP")}`;
}

export default function SaasDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        const res = await fetch("/api/saas-dashboard");
        if (res.ok) {
          const data = await res.json();
          setKpis(data.kpis);
        }
      } catch {
        setKpis({
          totalClinics: 0,
          activeTenants: 0,
          trialTenants: 0,
          suspendedTenants: 0,
          totalDoctors: 0,
          totalPatients: 0,
          mrr: 0,
          annualRevenue: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchKPIs();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpiItems = [
    { label: "Tenants", value: kpis?.totalClinics || 0, icon: Building2, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
    { label: "Subscriptions", value: kpis?.activeTenants || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "MRR", value: formatRs(kpis?.mrr || 0), icon: Wallet, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
    { label: "Doctors", value: kpis?.totalDoctors || 0, icon: Stethoscope, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Patients", value: kpis?.totalPatients || 0, icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time SaaS metrics across all tenants</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 px-2.5 py-1 text-xs font-medium w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiItems.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 card-hover">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card card-hover">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold">Tenants</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Healthcare organizations overview</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">{kpis?.activeTenants || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trial</span>
                <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">{kpis?.trialTenants || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suspended</span>
                <span className="inline-flex items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 text-xs font-medium">{kpis?.suspendedTenants || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card card-hover">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Revenue</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Subscription & billing overview</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">MRR</span>
                <span className="font-semibold tabular-nums">{formatRs(kpis?.mrr || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Annual</span>
                <span className="font-semibold tabular-nums">{formatRs(kpis?.annualRevenue || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" /> Growing
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card card-hover">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-semibold">Health</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Platform status & performance</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-semibold text-emerald-600">99.98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Doctors</span>
                <span className="font-semibold tabular-nums">{kpis?.totalDoctors || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Patients</span>
                <span className="font-semibold tabular-nums">{kpis?.totalPatients || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
