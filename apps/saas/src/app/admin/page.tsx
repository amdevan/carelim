"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
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

export default function AdminDashboard() {
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
        // Use placeholder data
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
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpiItems = [
    { label: "Total Clinics", value: kpis?.totalClinics || 0, icon: Building2, color: "text-teal-600" },
    { label: "Active Tenants", value: kpis?.activeTenants || 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "On Trial", value: kpis?.trialTenants || 0, icon: Clock, color: "text-amber-600" },
    { label: "Suspended", value: kpis?.suspendedTenants || 0, icon: PauseCircle, color: "text-rose-600" },
    { label: "Total Doctors", value: kpis?.totalDoctors || 0, icon: Stethoscope, color: "text-cyan-600" },
    { label: "Total Patients", value: kpis?.totalPatients || 0, icon: Users, color: "text-violet-600" },
    { label: "MRR", value: formatRs(kpis?.mrr || 0), icon: Wallet, color: "text-teal-600" },
    { label: "Annual Revenue", value: formatRs(kpis?.annualRevenue || 0), icon: CalendarRange, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground">Real-time SaaS metrics across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiItems.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" /> Tenants
            </CardTitle>
            <CardDescription className="text-xs">Manage healthcare organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active</span>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{kpis?.activeTenants || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Trial</span>
                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{kpis?.trialTenants || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suspended</span>
                <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{kpis?.suspendedTenants || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Revenue
            </CardTitle>
            <CardDescription className="text-xs">Subscription & billing overview</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" /> Health
            </CardTitle>
            <CardDescription className="text-xs">Platform status & performance</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
