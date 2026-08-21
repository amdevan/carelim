"use client";

import { useState, useEffect } from "react";
import { Search, Headphones, Plus, Filter, MoreVertical } from "lucide-react";

interface SupportTicket {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  category: string;
  tenant?: { name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  assigned: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/support-tickets")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTickets(d))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.ticketNo.toLowerCase().includes(q) ||
        t.tenant?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {tickets.length} tickets</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket, subject, or clinic..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {["all", "open", "assigned", "in_progress", "resolved", "closed"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === f
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Ticket</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Clinic</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Priority</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="table-row-hover cursor-pointer">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{t.ticketNo}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{t.subject}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {t.tenant?.name || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] || STATUS_COLORS.open}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4" />
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
