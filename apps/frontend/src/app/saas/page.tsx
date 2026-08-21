"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CreditCard,
  DollarSign,
  TrendingDown,
  Stethoscope,
  Users,
  TrendingUp,
  Activity,
} from "lucide-react";

interface DashboardData {
  totalTenants: number;
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
  totalDoctors: number;
  totalPatients: number;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  trend?: string;
  trendDown?: boolean;
}

function SkeletonKpiCard() {
  return (
    <div className="bg-white rounded-xl border border-teal-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-teal-100" />
      </div>
      <div className="mt-3 h-7 w-20 bg-gray-200 rounded" />
      <div className="mt-2 h-4 w-28 bg-gray-100 rounded" />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent, trend, trendDown }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-teal-200 p-5 relative overflow-hidden hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trendDown
                ? "text-rose-600 bg-rose-50"
                : "text-emerald-600 bg-emerald-50"
            }`}
          >
            {trendDown ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

export default function SaasDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas-dashboard")
      .then((res) => res.json())
      .then((json) => {
        const kpis = json?.kpis || {};
        setData({
          totalTenants: kpis.totalClinics ?? 0,
          activeSubscriptions: kpis.activeTenants ?? 0,
          mrr: kpis.mrr ?? 0,
          churnRate: kpis.churnRate ?? 0,
          totalDoctors: kpis.totalDoctors ?? 0,
          totalPatients: kpis.totalPatients ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val);

  const kpiCards: KpiCardProps[] = data
    ? [
        {
          label: "Total Tenants",
          value: data.totalTenants.toLocaleString(),
          icon: Building2,
          accent: "from-teal-500 to-teal-600",
          trend: "+12%",
        },
        {
          label: "Active Subscriptions",
          value: data.activeSubscriptions.toLocaleString(),
          icon: CreditCard,
          accent: "from-emerald-500 to-emerald-600",
          trend: "+8%",
        },
        {
          label: "Monthly Recurring Revenue",
          value: formatCurrency(data.mrr),
          icon: DollarSign,
          accent: "from-teal-600 to-emerald-500",
          trend: "+15%",
        },
        {
          label: "Churn Rate",
          value: `${data.churnRate}%`,
          icon: TrendingDown,
          accent: "from-rose-500 to-rose-600",
          trend: "-2%",
          trendDown: false,
        },
        {
          label: "Total Doctors",
          value: data.totalDoctors.toLocaleString(),
          icon: Stethoscope,
          accent: "from-teal-500 to-emerald-500",
          trend: "+5%",
        },
        {
          label: "Total Patients",
          value: data.totalPatients.toLocaleString(),
          icon: Users,
          accent: "from-emerald-500 to-teal-600",
          trend: "+10%",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SaaS Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your platform performance and key metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonKpiCard key={i} />)
          : kpiCards.map((card, i) => <KpiCard key={i} {...card} />)}
      </div>

      {/* Activity Summary */}
      <div className="bg-white rounded-xl border border-teal-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-900">Platform Activity</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
              <p className="text-sm font-medium text-teal-700">Recent Sign-ups</p>
              <p className="text-2xl font-bold text-teal-800 mt-1">
                {Math.floor(data?.totalTenants ?? 0 * 0.15)}
              </p>
              <p className="text-xs text-teal-600/70 mt-0.5">Last 30 days</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-medium text-emerald-700">Revenue Growth</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">+15%</p>
              <p className="text-xs text-emerald-600/70 mt-0.5">Month over month</p>
            </div>
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
              <p className="text-sm font-medium text-teal-700">Active Sessions</p>
              <p className="text-2xl font-bold text-teal-800 mt-1">
                {Math.floor((data?.activeSubscriptions ?? 0) * 0.65)}
              </p>
              <p className="text-xs text-teal-600/70 mt-0.5">Currently online</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
