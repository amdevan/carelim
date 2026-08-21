"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Megaphone,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Loader2,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  google: "bg-red-100 text-red-700",
  instagram: "bg-pink-100 text-pink-700",
  whatsapp: "bg-green-100 text-green-700",
  website: "bg-purple-100 text-purple-700",
  call_center: "bg-orange-100 text-orange-700",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cms-campaigns");
        if (res.ok) setCampaigns(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.platform.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your marketing campaigns.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
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
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading campaigns...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Megaphone className="w-12 h-12 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No campaigns found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Leads
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Date Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Megaphone className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          PLATFORM_COLORS[campaign.platform] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {campaign.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rs. {campaign.budget.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      Rs. {campaign.spent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {campaign.leads}
                    </td>
                    <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                      {campaign.conversions}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[campaign.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {campaign.startDate
                        ? new Date(campaign.startDate).toLocaleDateString()
                        : "—"}
                      {" — "}
                      {campaign.endDate
                        ? new Date(campaign.endDate).toLocaleDateString()
                        : "—"}
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
