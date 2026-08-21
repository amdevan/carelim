"use client";

import { useEffect, useState } from "react";
import { Search, Headphones, Clock, AlertTriangle } from "lucide-react";

interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  tenant?: { name: string };
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/support-tickets")
      .then((res) => res.json())
      .then((json) => setTickets(Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
      (t.tenant?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-amber-50 text-amber-700 border-amber-200",
      assigned: "bg-teal-50 text-teal-700 border-teal-200",
      in_progress: "bg-blue-50 text-blue-700 border-blue-200",
      resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      closed: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return styles[status] || styles.open;
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: "bg-rose-100 text-rose-700 border-rose-200",
      high: "bg-orange-50 text-orange-700 border-orange-200",
      medium: "bg-amber-50 text-amber-700 border-amber-200",
      low: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return styles[priority] || styles.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">Manage tenant support requests and track resolution</p>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Open",
              count: tickets.filter((t) => t.status === "open").length,
              color: "bg-amber-50 border-amber-200 text-amber-700",
            },
            {
              label: "Assigned",
              count: tickets.filter((t) => t.status === "assigned").length,
              color: "bg-teal-50 border-teal-200 text-teal-700",
            },
            {
              label: "Resolved",
              count: tickets.filter((t) => t.status === "resolved").length,
              color: "bg-emerald-50 border-emerald-200 text-emerald-700",
            },
            {
              label: "Urgent",
              count: tickets.filter((t) => t.priority === "urgent").length,
              color: "bg-rose-50 border-rose-200 text-rose-700",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-3 ${stat.color}`}
            >
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
              <p className="text-2xl font-bold mt-0.5">{stat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by subject, number, or tenant..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} tickets</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Ticket</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden sm:table-cell">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden md:table-cell">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filtered.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-xs text-gray-400 font-mono">{ticket.ticketNo}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {ticket.tenant?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusBadge(
                            ticket.status
                          )}`}
                        >
                          {ticket.status === "open" && <Clock className="w-3 h-3" />}
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${priorityBadge(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority === "urgent" && <AlertTriangle className="w-3 h-3" />}
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell capitalize">
                        {ticket.category || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Headphones className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No support tickets found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
