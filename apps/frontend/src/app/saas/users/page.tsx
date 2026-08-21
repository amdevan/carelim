"use client";

import { useEffect, useState } from "react";
import { Search, Users as UsersIcon, Shield, Mail } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin-users")
      .then((res) => res.json())
      .then((json) => setUsers(Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform administrator accounts and roles</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-teal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>
        <span className="text-sm text-gray-500">{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-teal-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-100 bg-teal-50/50">
                <th className="text-left px-4 py-3 font-semibold text-teal-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 hidden lg:table-cell">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filtered.map((user) => {
                    const initials = user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-white">{initials}</span>
                            </div>
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Shield className="w-3 h-3 text-teal-500" />
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              user.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </td>
                      </tr>
                    );
                  })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No admin users found</p>
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
