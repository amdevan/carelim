"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Megaphone,
  TrendingUp,
  UsersRound,
  Contact,
  Handshake,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

interface DashboardKPIs {
  leads: number;
  campaigns: number;
  conversion: number;
  referrals: number;
  contacts: number;
  deals: number;
}

const KPI_DEFS = [
  {
    key: "leads" as const,
    label: "Leads",
    icon: UserPlus,
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "campaigns" as const,
    label: "Campaigns",
    icon: Megaphone,
    color: "from-violet-500 to-indigo-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "conversion" as const,
    label: "Conversion %",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    suffix: "%",
  },
  {
    key: "referrals" as const,
    label: "Referrals",
    icon: UsersRound,
    color: "from-fuchsia-500 to-pink-600",
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    key: "contacts" as const,
    label: "Contacts",
    icon: Contact,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "deals" as const,
    label: "Deals",
    icon: Handshake,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export default function MarketingDashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        const res = await fetch("/api/cms-dashboard");
        if (res.ok) {
          const data = await res.json();
          setKpis(data.kpis || data);
        }
      } catch {
        setKpis({ leads: 0, campaigns: 0, conversion: 0, referrals: 0, contacts: 0, deals: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchKPIs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            Marketing Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overview of your marketing & CRM performance
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/40 px-2.5 py-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-5 animate-pulse"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-purple-200 dark:bg-purple-800" />
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {KPI_DEFS.map((kpi) => {
            const Icon = kpi.icon;
            const value = kpis?.[kpi.key] ?? 0;
            return (
              <div
                key={kpi.key}
                className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 cursor-default"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}>
                      <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {kpi.label}
                    </span>
                  </div>
                  {kpi.key === "conversion" ? (
                    value > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-rose-500" />
                    )
                  ) : null}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {value.toLocaleString()}
                  {kpi.suffix || ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Pipeline Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Leads</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {kpis?.leads?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Campaigns</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {kpis?.campaigns?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Open Deals</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {kpis?.deals?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Engagement Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Contacts</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {kpis?.contacts?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Referrals</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {kpis?.referrals?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {kpis?.conversion || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
