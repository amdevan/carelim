"use client";

import { useState, useEffect } from "react";
import {
  UsersRound,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Gift,
  Calendar,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface Referral {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
  status: string;
  reward: number;
  referredAt: string;
  convertedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  converted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  rewarded: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const res = await fetch("/api/cms-referrals");
        if (res.ok) {
          const data = await res.json();
          setReferrals(Array.isArray(data) ? data : data.referrals || []);
        }
      } catch {
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
  }, []);

  const filtered = referrals.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.referrerName && r.referrerName.toLowerCase().includes(q)) ||
        (r.referredName && r.referredName.toLowerCase().includes(q)) ||
        (r.referrerEmail && r.referrerEmail.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalRewards = filtered.reduce((sum, r) => sum + (r.reward || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Referrals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} referrals &middot; NPR {totalRewards.toLocaleString("en-NP")} total rewards
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all">
          <Plus className="w-4 h-4" /> New Referral
        </button>
      </div>

      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Referrals",
              value: referrals.length.toString(),
              icon: UsersRound,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-50 dark:bg-purple-950/30",
            },
            {
              label: "Converted",
              value: referrals.filter((r) => r.status === "converted" || r.status === "rewarded").length.toString(),
              icon: TrendingUp,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50 dark:bg-emerald-950/30",
            },
            {
              label: "Pending",
              value: referrals.filter((r) => r.status === "pending").length.toString(),
              icon: Gift,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/30",
            },
            {
              label: "Rewards Paid",
              value: `NPR ${totalRewards.toLocaleString("en-NP")}`,
              icon: Gift,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-950/30",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-3.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1 rounded-md ${stat.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Search + Filters */}
      <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by referrer or referred name..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {["all", "pending", "converted", "rewarded", "expired"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === f
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UsersRound className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Referrer
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 hidden md:table-cell">
                    Referred
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 hidden lg:table-cell">
                    Reward
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                          {r.referrerName ? r.referrerName.slice(0, 2).toUpperCase() : "??"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {r.referrerName || "Unknown"}
                          </p>
                          {r.referrerEmail && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                              {r.referrerEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {r.referredName || "—"}
                        </p>
                        {r.referredEmail && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                            {r.referredEmail}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                        NPR {(r.reward || 0).toLocaleString("en-NP")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {r.referredAt ? (
                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {new Date(r.referredAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
