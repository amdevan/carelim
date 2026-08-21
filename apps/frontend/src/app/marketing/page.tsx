"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Megaphone,
  TrendingUp,
  DollarSign,
  Contact,
  Handshake,
  Loader2,
} from "lucide-react";

interface DashboardKPIs {
  totalLeads: number;
  activeCampaigns: number;
  conversionRate: number;
  referralRevenue: number;
  totalContacts: number;
  pendingDeals: number;
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-purple-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {suffix && (
          <span className="text-sm font-normal text-gray-500 ml-1">
            {suffix}
          </span>
        )}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-purple-100 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100" />
      </div>
      <div className="h-8 w-20 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-28 bg-gray-100 rounded" />
    </div>
  );
}

export default function MarketingDashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cms-dashboard");
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const data = await res.json();
        const k = data.kpis || {};
        setKpis({
          totalLeads: k.newLeads ?? k.activeLeads ?? 0,
          activeCampaigns: k.activeCampaigns ?? 0,
          conversionRate: k.conversionRate ?? 0,
          referralRevenue: k.monthRevenue ?? k.revenueMonth ?? 0,
          totalContacts: k.totalPatients ?? 0,
          pendingDeals: k.followupDue ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Marketing Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your marketing performance and CRM metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : error
          ? (
            <div className="col-span-full bg-white rounded-xl border border-red-200 p-8 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )
          : kpis && (
            <>
              <KPICard
                label="Total Leads"
                value={kpis.totalLeads}
                icon={Users}
                color="bg-purple-600"
              />
              <KPICard
                label="Active Campaigns"
                value={kpis.activeCampaigns}
                icon={Megaphone}
                color="bg-violet-600"
              />
              <KPICard
                label="Conversion Rate"
                value={kpis.conversionRate}
                icon={TrendingUp}
                color="bg-indigo-600"
                suffix="%"
              />
              <KPICard
                label="Referral Revenue"
                value={`Rs. ${kpis.referralRevenue.toLocaleString()}`}
                icon={DollarSign}
                color="bg-purple-700"
              />
              <KPICard
                label="Total Contacts"
                value={kpis.totalContacts}
                icon={Contact}
                color="bg-violet-700"
              />
              <KPICard
                label="Pending Deals"
                value={kpis.pendingDeals}
                icon={Handshake}
                color="bg-indigo-700"
              />
            </>
          )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-purple-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href="/marketing/campaigns"
            className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Megaphone className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">
              View Campaigns
            </span>
          </a>
          <a
            href="/marketing/leads"
            className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Users className="w-5 h-5 text-violet-600" />
            <span className="text-sm font-medium text-gray-700">
              Manage Leads
            </span>
          </a>
          <a
            href="/marketing/contacts"
            className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Contact className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              CRM Contacts
            </span>
          </a>
          <a
            href="/marketing/deals"
            className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Handshake className="w-5 h-5 text-purple-700" />
            <span className="text-sm font-medium text-gray-700">
              Deal Pipeline
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
