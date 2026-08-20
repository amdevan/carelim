"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carelim/ui";
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
      .then((r) => r.ok ? r.json() : [])
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
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by admin, module, or detail..."
                className="pl-9"
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Admin</TableHead>
                  <TableHead className="text-[11px] uppercase">Action</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Module</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Detail</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">IP</TableHead>
                  <TableHead className="text-[11px] uppercase">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id} className="table-row-hover">
                    <TableCell>
                      <p className="text-sm font-medium">{log.adminEmail}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {log.module}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate max-w-[250px]">
                      {log.detail || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {log.ipAddress || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
