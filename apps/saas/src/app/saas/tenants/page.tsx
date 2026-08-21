"use client";

import { useState, useEffect } from "react";
import { Search, Building2, Plus, Filter, MoreVertical } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string | null;
  status: string;
  plan: { name: string } | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  trial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch("/api/tenants");
        if (res.ok) {
          const data = await res.json();
          setTenants(data);
        }
      } catch {
        setTenants([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTenants();
  }, []);

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.ownerEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {tenants.length} clinics</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Tenant
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
              placeholder="Search by name, owner, or email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {["all", "active", "trial", "suspended"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === f
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
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
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tenants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Clinic</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Owner</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden md:table-cell">City</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3 hidden lg:table-cell">Plan</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => (
                  <tr key={t.id} className="table-row-hover cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50 flex items-center justify-center">
                          <span className="text-teal-700 dark:text-teal-300 text-xs font-semibold">{t.name.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{t.ownerName}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{t.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{t.city || "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.plan ? (
                        <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 px-2 py-0.5 text-xs font-medium">{t.plan.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600"}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
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
