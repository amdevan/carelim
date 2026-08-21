"use client";

import { useEffect, useState } from "react";
import { Search, Building2, ExternalLink, MoreVertical } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
  ownerEmail: string;
  city: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((json) => setTenants(Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      (t.plan || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      trial: "bg-teal-50 text-teal-700 border-teal-200",
      suspended: "bg-rose-50 text-rose-700 border-rose-200",
      inactive: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return styles[status] || styles.inactive;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all tenant organizations on the platform</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants by name, email, or plan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} tenants</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden sm:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden lg:table-cell">City</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden lg:table-cell">Created</th>
                <th className="text-right px-4 py-3 font-semibold text-teal-700 w-12"></th>
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
                        <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-4 bg-gray-100 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{tenant.name}</p>
                            <p className="text-xs text-gray-500">{tenant.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(
                            tenant.status
                          )}`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {tenant.plan || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {tenant.ownerEmail}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                        {tenant.city || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1 rounded hover:bg-teal-100 text-gray-400 hover:text-teal-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No tenants found</p>
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
