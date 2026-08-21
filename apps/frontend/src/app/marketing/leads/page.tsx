"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Users,
  Phone,
  Mail,
  Filter,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

interface Lead {
  id: string;
  leadNo: string;
  patientName: string;
  phone: string;
  email: string | null;
  source: string;
  interest: string | null;
  status: string;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  interested: "bg-purple-100 text-purple-700",
  appointment_booked: "bg-green-100 text-green-700",
  treatment_started: "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-600",
  lost: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  appointment_booked: "Appt Booked",
  treatment_started: "In Treatment",
  completed: "Completed",
  lost: "Lost",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/cms-leads");
        if (res.ok) setLeads(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        l.patientName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.leadNo.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and track marketing leads through the conversion funnel.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: leads.length, color: "text-purple-600" },
          {
            label: "New",
            value: leads.filter((l) => l.status === "new").length,
            color: "text-blue-600",
          },
          {
            label: "Contacted",
            value: leads.filter((l) => l.status === "contacted").length,
            color: "text-yellow-600",
          },
          {
            label: "Converted",
            value: leads.filter((l) =>
              ["appointment_booked", "treatment_started", "completed"].includes(
                l.status
              )
            ).length,
            color: "text-green-600",
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
            placeholder="Search by name, phone, email..."
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
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="appointment_booked">Appointment Booked</option>
            <option value="treatment_started">Treatment Started</option>
            <option value="completed">Completed</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading leads...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No leads found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Interest
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {lead.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {lead.patientName}
                          </p>
                          <p className="text-xs text-gray-400">{lead.leadNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {lead.phone}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.interest || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[lead.status] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.assignedTo || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
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
