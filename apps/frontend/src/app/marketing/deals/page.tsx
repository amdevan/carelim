"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Handshake,
  DollarSign,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

interface Deal {
  id: string;
  dealNo: string;
  title: string;
  contactId: string;
  contact?: { name: string; phone: string; email?: string | null };
  stage: string;
  value: number;
  currency: string;
  probability: number;
  source: string;
  interest: string | null;
  assignedTo: string | null;
  priority: string;
  expectedClose: string | null;
  createdAt: string;
}

const STAGE_COLORS: Record<string, string> = {
  qualification: "bg-blue-100 text-blue-700",
  needs_analysis: "bg-indigo-100 text-indigo-700",
  proposal: "bg-purple-100 text-purple-700",
  negotiation: "bg-yellow-100 text-yellow-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

const STAGE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  needs_analysis: "Needs Analysis",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const PRIORITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  low: Clock,
  medium: TrendingUp,
  high: AlertTriangle,
  urgent: AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"cards" | "list">("cards");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/crm-deals");
        if (res.ok) setDeals(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        d.title.toLowerCase().includes(q) ||
        d.dealNo.toLowerCase().includes(q) ||
        (d.contact?.name && d.contact.name.toLowerCase().includes(q));
      const matchesStage =
        stageFilter === "all" || d.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, search, stageFilter]);

  const totalValue = filtered.reduce((s, d) => s + d.value, 0);
  const wonDeals = filtered.filter((d) => d.stage === "closed_won");
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deals Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track deals through your sales pipeline.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Deals",
            value: filtered.length,
            color: "text-purple-600",
          },
          {
            label: "Pipeline Value",
            value: `Rs. ${totalValue.toLocaleString()}`,
            color: "text-violet-600",
          },
          {
            label: "Won Deals",
            value: wonDeals.length,
            color: "text-green-600",
          },
          {
            label: "Won Value",
            value: `Rs. ${wonValue.toLocaleString()}`,
            color: "text-emerald-600",
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Stages</option>
            <option value="qualification">Qualification</option>
            <option value="needs_analysis">Needs Analysis</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>
        <div className="flex items-center bg-white border border-purple-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              view === "cards"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-purple-50"
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              view === "list"
                ? "bg-purple-600 text-white"
                : "text-gray-600 hover:bg-purple-50"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl border border-purple-100 p-8 flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading deals...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-purple-100 p-8 text-center">
          <Handshake className="w-12 h-12 text-purple-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No deals found</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deal) => {
            const PriorityIcon = PRIORITY_ICONS[deal.priority] || Clock;
            return (
              <div
                key={deal.id}
                className="bg-white rounded-xl border border-purple-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STAGE_COLORS[deal.stage] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STAGE_LABELS[deal.stage] || deal.stage}
                  </span>
                  <PriorityIcon
                    className={`w-4 h-4 ${PRIORITY_COLORS[deal.priority] || "text-gray-400"}`}
                  />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {deal.title}
                </h3>
                <p className="text-xs text-gray-400 mb-3">{deal.dealNo}</p>
                {deal.contact && (
                  <p className="text-xs text-gray-500 mb-3">
                    {deal.contact.name}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-bold text-gray-900">
                      Rs. {deal.value.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {deal.probability}% prob.
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {deal.interest && (
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                      {deal.interest}
                    </span>
                  )}
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {deal.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Deal
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Assigned
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {deal.title}
                      </p>
                      <p className="text-xs text-gray-400">{deal.dealNo}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {deal.contact?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      Rs. {deal.value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STAGE_COLORS[deal.stage] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STAGE_LABELS[deal.stage] || deal.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {deal.probability}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {deal.assignedTo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
