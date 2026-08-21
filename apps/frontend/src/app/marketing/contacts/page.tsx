"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Contact,
  Phone,
  Mail,
  Building2,
  Filter,
  Loader2,
  Star,
  Tag,
} from "lucide-react";

interface ContactItem {
  id: string;
  contactNo: string;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  type: string;
  category: string;
  source: string;
  assignedTo: string | null;
  tags: string | null;
  score: number;
  status: string;
  lastContactAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  blocked: "bg-red-100 text-red-700",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-600",
  vip: "bg-yellow-100 text-yellow-700",
  corporate: "bg-blue-100 text-blue-700",
  insurance: "bg-indigo-100 text-indigo-700",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/crm-contacts");
        if (res.ok) setContacts(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.contactNo.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q));
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contacts, search, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM Contacts</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your contact directory and relationships.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Contacts",
            value: contacts.length,
            color: "text-purple-600",
          },
          {
            label: "Active",
            value: contacts.filter((c) => c.status === "active").length,
            color: "text-green-600",
          },
          {
            label: "VIP",
            value: contacts.filter((c) => c.category === "vip").length,
            color: "text-yellow-600",
          },
          {
            label: "Corporate",
            value: contacts.filter((c) => c.type === "corporate").length,
            color: "text-blue-600",
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
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="clinic">Clinic</option>
            <option value="partner">Partner</option>
            <option value="vendor">Vendor</option>
            <option value="corporate">Corporate</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading contacts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Contact className="w-12 h-12 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No contacts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                          {contact.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {contact.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {contact.contactNo}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {contact.phone}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {contact.company || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 capitalize">
                        {contact.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          CATEGORY_COLORS[contact.category] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {contact.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star
                          className={`w-3.5 h-3.5 ${
                            contact.score >= 50
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {contact.score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[contact.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {contact.status}
                      </span>
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
