"use client";

import { useFetch } from "@/lib/use-fetch";
import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Search, ScrollText, ChevronUp, ChevronDown } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination, useSort } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: string;
  detail: string | null;
  ip: string;
  createdAt: string;
}

const actionFilters = ["All", "LOGIN", "CREATE", "UPDATE", "DELETE", "PAYMENT", "APPROVE"];
const moduleFilters = ["All", "Auth", "Patient", "Doctor", "Appointment", "Invoice", "Prescription", "Medicine", "Settings", "LabTest", "Billing", "Staff", "Payroll", "Radiology", "Expense"];

const actionColors: Record<string, string> = {
  CREATE: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  LOGIN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  PAYMENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  APPROVE: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

const moduleColors: Record<string, string> = {
  Auth: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Patient: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Doctor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Appointment: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Invoice: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Prescription: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Medicine: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Settings: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  LabTest: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Billing: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Staff: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Payroll: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Radiology: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Expense: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Role: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

const formatTimestamp = (d: string | Date) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const formatTimestampFull = (d: string | Date) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

function initialsOf(name: string) {
  const base = name.split("@")[0];
  return base
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// Sortable column header (defined outside the view to satisfy static-components rule)
function SortHeader({
  k, sortKey, sortDir, onToggle, children, className = "",
}: {
  k: keyof AuditLog;
  sortKey: keyof AuditLog | "";
  sortDir: "asc" | "desc";
  onToggle: (k: keyof AuditLog) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        {sortKey === k ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : null}
      </button>
    </TableHead>
  );
}

export function AuditView() {
  const { data, loading } = useFetch<AuditLog[]>("/api/audit-logs");
  const [action, setAction] = useState("All");
  const [module, setModule] = useState("All");
  const [q, setQ] = useState("");

  const logs = data ?? [];

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return logs.filter((l) => {
      if (action !== "All" && l.action !== action) return false;
      if (module !== "All" && l.module !== module) return false;
      if (ql) {
        const detail = (l.detail ?? "").toLowerCase();
        if (!l.user.toLowerCase().includes(ql) && !detail.includes(ql)) return false;
      }
      return true;
    });
  }, [logs, action, module, q]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<AuditLog>(filtered, "createdAt");
  // useSort default sortDir is "asc" — flip initial to desc for createdAt
  const descendingSorted = sortKey === "createdAt" && sortDir === "asc"
    ? [...sorted].reverse()
    : sorted;
  const page = usePagination<AuditLog>(descendingSorted, 20);

  const exportCSV = () => {
    exportToCSV(
      "audit-log",
      ["Timestamp", "User", "Action", "Module", "Detail", "IP"],
      filtered.map((l) => [
        formatTimestampFull(l.createdAt),
        l.user, l.action, l.module, l.detail ?? "", l.ip ?? "",
      ]),
    );
    toast.success(`Exported ${filtered.length} audit entries to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-teal-600" /> Audit Log
          </h2>
          <p className="text-sm text-muted-foreground">Tracks every action across the system · {logs.length} entries</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start"
          onClick={exportCSV}
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </motion.div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-44">
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  {actionFilters.map((a) => <SelectItem key={a} value={a}>{a === "All" ? "All Actions" : a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-44">
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  {moduleFilters.map((m) => <SelectItem key={m} value={m}>{m === "All" ? "All Modules" : m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or detail…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of {logs.length} entries
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Entries</CardTitle>
          <CardDescription className="text-xs">Sorted by timestamp · newest first · paginated 20 per page</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden mx-6 mb-6">
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-muted/50">
                    <SortHeader k="createdAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="min-w-[140px]">Timestamp</SortHeader>
                    <SortHeader k="user" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="min-w-[160px]">User</SortHeader>
                    <SortHeader k="action" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Action</SortHeader>
                    <SortHeader k="module" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Module</SortHeader>
                    <TableHead className="min-w-[260px]">Detail</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : page.paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                        <ScrollText className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                        No audit entries match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    page.paged.map((l) => (
                      <TableRow key={l.id} className="hover:bg-accent/40">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {formatTimestamp(l.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-[10px] font-semibold">
                                {initialsOf(l.user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate max-w-[160px]">{l.user}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${actionColors[l.action] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                            {l.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${moduleColors[l.module] || ""}`}>
                            {l.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[320px]">
                          <span className="truncate block">{l.detail || "—"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">
                          {l.ip || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              setPage={page.setPage}
              size={page.size}
              setSize={page.setSize}
              range={page.range}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
