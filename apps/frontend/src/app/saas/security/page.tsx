"use client";

import { useEffect, useState } from "react";
import { Search, ShieldCheck, Lock, Eye, Trash2, PenLine } from "lucide-react";

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  module: string;
  detail: string | null;
  createdAt: string;
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/saas-audit")
      .then((res) => res.json())
      .then((json) => setLogs(Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.module.toLowerCase().includes(search.toLowerCase())
  );

  const actionBadge = (action: string) => {
    const styles: Record<string, string> = {
      CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
      DELETE: "bg-rose-50 text-rose-700 border-rose-200",
      LOGIN: "bg-teal-50 text-teal-700 border-teal-200",
      APPROVE: "bg-violet-50 text-violet-700 border-violet-200",
      SUSPEND: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return styles[action] || "bg-gray-50 text-gray-600 border-gray-200";
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Lock className="w-3 h-3" />;
      case "UPDATE":
        return <PenLine className="w-3 h-3" />;
      case "DELETE":
        return <Trash2 className="w-3 h-3" />;
      case "LOGIN":
        return <Eye className="w-3 h-3" />;
      default:
        return <ShieldCheck className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all administrative actions and security events
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, action, or module..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden sm:table-cell">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden md:table-cell">Detail</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filtered.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{log.adminEmail}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${actionBadge(
                            log.action
                          )}`}
                        >
                          {actionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {log.module}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[240px] truncate">
                        {log.detail || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No audit logs found</p>
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
