"use client";

import { useState, useEffect } from "react";
import {
  Contact,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Loader2,
} from "lucide-react";

interface ContactRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  status: string;
  lastContacted: string;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  patient: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  partner: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  vendor: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  referral: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/crm-contacts");
        if (res.ok) {
          const data = await res.json();
          setContacts(Array.isArray(data) ? data : data.contacts || []);
        }
      } catch {
        setContacts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  const filtered = contacts.filter((c) => {
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} of {contacts.length} contacts
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Search + Filters */}
      <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {["all", "patient", "partner", "vendor", "referral"].map((f) => (
              <button
                key={f}
                onClick={() => setCategoryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  categoryFilter === f
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
            <Contact className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No contacts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 hidden md:table-cell">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 hidden lg:table-cell">
                    Last Contacted
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {c.name ? c.name.slice(0, 2).toUpperCase() : "??"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                            {c.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </span>
                            )}
                            {c.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 shrink-0" />
                                {c.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.company ? (
                        <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          {c.company}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other
                        }`}
                      >
                        {c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : "Other"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {c.lastContacted
                          ? new Date(c.lastContacted).toLocaleDateString()
                          : "—"}
                      </span>
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
