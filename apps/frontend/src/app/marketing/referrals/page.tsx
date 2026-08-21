"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  GitBranch,
  DollarSign,
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface Referral {
  id: string;
  referralNo: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  referralSource: string;
  commissionRate: number;
  commissionAmount: number;
  billAmount: number;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
  earned: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  settled: { color: "bg-purple-100 text-purple-700", icon: DollarSign },
  cancelled: { color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cms-referrals");
        if (res.ok) setReferrals(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return referrals.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.referralNo.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.doctorName.toLowerCase().includes(q) ||
        r.clinicName.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [referrals, search, statusFilter]);

  const totalRevenue = filtered.reduce((s, r) => s + r.billAmount, 0);
  const totalCommission = filtered.reduce((s, r) => s + r.commissionAmount, 0);
  const settledCount = filtered.filter((r) => r.status === "settled").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track referral sources, commissions, and settlements.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Referrals",
            value: filtered.length,
            color: "text-purple-600",
          },
          {
            label: "Total Revenue",
            value: `Rs. ${totalRevenue.toLocaleString()}`,
            color: "text-violet-600",
          },
          {
            label: "Total Commission",
            value: `Rs. ${totalCommission.toLocaleString()}`,
            color: "text-indigo-600",
          },
          {
            label: "Settled",
            value: settledCount,
            color: "text-green-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-lg border border-purple-100 p-3"
          >
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by referral no, patient, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="earned">Earned</option>
            <option value="settled">Settled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading referrals...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <GitBranch className="w-12 h-12 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No referrals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Referral
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ref) => {
                  const config = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={ref.id}
                      className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                            <GitBranch className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {ref.referralNo}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ref.patientName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ref.doctorName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                          {ref.referralSource}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        Rs. {ref.billAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-purple-600">
                            Rs. {ref.commissionAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({ref.commissionRate}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
