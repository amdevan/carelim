"use client";

import { useState, useEffect } from "react";
import { Search, ShieldCheck, Filter } from "lucide-react";

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  module: string;
  detail: string | null;
  ipAddress: string | null;
  tenant?: { name: string } | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  LOGIN: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  LOGOUT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function SecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    fetch("/api/saas-audit")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setLogs(d))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const actions = ["all", ...new Set(logs.map((l) => l.action))];

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.adminEmail.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.detail?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Security & Audit Log</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {logs.length} audit entries</p>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin, module, or detail..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {actions.map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  actionFilter === a
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {a === "all" ? "All" : a}
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
            <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Admin</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Action</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden md:table-cell">Module</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden lg:table-cell">Detail</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden lg:table-cell">IP</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => (
                  <tr key={log.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{log.adminEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">
                      {log.module}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[250px]">
                      {log.detail || "\u2014"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                      {log.ipAddress || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
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
