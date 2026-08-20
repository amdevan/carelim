"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carelim/ui";
import { Search, Headphones, Plus, Filter, MoreVertical } from "lucide-react";

interface SupportTicket {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  category: string;
  tenant?: { name: string } | null;
  createdAt: string;
  resolvedAt: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  assigned: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/support-tickets")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setTickets(d))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.ticketNo.toLowerCase().includes(q) ||
        t.tenant?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {tickets.length} tickets</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
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
                placeholder="Search by ticket, subject, or clinic..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {["all", "open", "assigned", "in_progress", "resolved", "closed"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    statusFilter === f
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
              <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Ticket</TableHead>
                  <TableHead className="text-[11px] uppercase">Clinic</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="table-row-hover cursor-pointer">
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold">{t.ticketNo}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{t.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.tenant?.name || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className="text-[10px] bg-muted text-muted-foreground">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium}`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[t.status] || STATUS_COLORS.open}`}>
                        {t.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
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
