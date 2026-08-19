"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarOff, Plus, Search, Download, Check, X, Clock, Calendar,
} from "lucide-react";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StaffLite {
  id: string;
  name: string;
  role: string;
}

interface LeaveRequest {
  id: string;
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  createdAt: string;
  staff: StaffLite;
}

interface LeaveData {
  requests: LeaveRequest[];
  staff: StaffLite[];
}

const LEAVE_TYPES = ["sick", "annual", "casual", "maternity", "paternity", "unpaid"];

function computeDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export function LeaveView() {
  const [tick, setTick] = useState(0);
  const { data, loading } = useFetch<LeaveData>(tick ? `/api/leave-requests?_r=${tick}` : "/api/leave-requests");
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const requests = data?.requests ?? [];
  const staffList = data?.staff ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      if (q && !(r.staff?.name || "").toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      return true;
    });
  }, [requests, search, typeFilter]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedThisMonth = requests.filter((r) => r.status === "approved" && r.startDate.startsWith(thisMonth)).length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;
  const totalDaysTaken = requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + (r.days || 0), 0);

  const kpis = [
    { label: "Pending Requests", value: pendingCount, icon: Clock, accent: "from-amber-500 to-orange-500" },
    { label: "Approved This Month", value: approvedThisMonth, icon: Check, accent: "from-emerald-500 to-emerald-600" },
    { label: "Rejected", value: rejectedCount, icon: X, accent: "from-rose-500 to-rose-600" },
    { label: "Total Days Taken", value: totalDaysTaken, icon: CalendarOff, accent: "from-teal-500 to-teal-600" },
  ];

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("leave-requests", ["Staff", "Type", "Start Date", "End Date", "Days", "Status", "Reason"],
      filtered.map((r) => [r.staff?.name || "", r.type, formatDate(r.startDate), formatDate(r.endDate), r.days, r.status, r.reason ?? ""]));
    toast.success("Leave requests exported to CSV");
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
          <h2 className="text-xl font-bold">Leave Management</h2>
          <p className="text-sm text-muted-foreground">
            {requests.length} total requests · {pendingCount} pending review
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> New Request
          </Button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                    <k.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight truncate">{k.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests">
        <TabsList className="w-fit overflow-x-auto">
          <TabsTrigger value="requests" className="gap-1.5"><CalendarOff className="w-3.5 h-3.5" /> Requests</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {/* Filter bar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by staff name or type…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs"><SelectValue placeholder="Leave Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden mx-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Staff</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Start Date</TableHead>
                      <TableHead className="hidden md:table-cell">End Date</TableHead>
                      <TableHead className="text-center">Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyState icon={CalendarOff} title="No leave requests found" description="No leave requests match your search or no requests have been submitted yet." />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((r) => (
                        <TableRow key={r.id} className="hover:bg-accent/40">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(r.staff?.name || "").split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{r.staff?.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground capitalize">{r.staff?.role || ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatDate(r.startDate)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{formatDate(r.endDate)}</TableCell>
                          <TableCell className="text-center text-sm font-medium tabular-nums">{r.days}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusColors[r.status] || "bg-gray-100 text-gray-700"}`}>
                              {statusLabel(r.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.status === "pending" ? (
                              <LeaveActionButtons requestId={r.id} staffName={r.staff?.name || ""} onRefresh={refresh} />
                            ) : (
                              <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <LeaveCalendarView requests={requests} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* Create Leave Request Dialog */}
      <CreateLeaveDialog open={addOpen} onOpenChange={setAddOpen} staffList={staffList} onSaved={() => { setAddOpen(false); refresh(); }} />
    </div>
  );
}

// ============== Leave Action Buttons ==============
function LeaveActionButtons({ requestId, staffName, onRefresh }: { requestId: string; staffName: string; onRefresh: () => void }) {
  const [pending, setPending] = useState(false);

  const updateStatus = async (status: "approved" | "rejected") => {
    setPending(true);
    try {
      const res = await fetchAPI(`/api/leave-requests/${requestId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Leave ${status} for ${staffName}`);
      onRefresh();
    } catch {
      toast.error(`Failed to ${status} leave`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" className="h-7 gap-1 bg-teal-600 hover:bg-teal-700 text-white" disabled={pending} onClick={() => updateStatus("approved")}>
        <Check className="w-3.5 h-3.5" /> Approve
      </Button>
      <Button size="sm" variant="outline" className="h-7 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30" disabled={pending} onClick={() => updateStatus("rejected")}>
        <X className="w-3.5 h-3.5" /> Reject
      </Button>
    </div>
  );
}

// ============== Leave Calendar View ==============
function LeaveCalendarView({ requests, loading }: { requests: LeaveRequest[]; loading: boolean }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const approvedLeaves = useMemo(() => {
    return requests.filter((r) => r.status === "approved");
  }, [requests]);

  const getLeavesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return approvedLeaves.filter((r) => r.startDate <= dateStr && r.endDate >= dateStr);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600" />
          {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const leaves = getLeavesForDay(day);
            const isToday = day === now.getDate();
            return (
              <div
                key={day}
                className={`rounded-lg border p-1.5 min-h-[60px] text-center transition-colors ${
                  isToday ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30" : "border-border/60"
                }`}
              >
                <p className={`text-xs font-medium ${isToday ? "text-teal-600 font-bold" : ""}`}>{day}</p>
                <div className="space-y-0.5 mt-0.5">
                  {leaves.slice(0, 2).map((l) => (
                    <div key={l.id} className="text-[8px] bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded px-0.5 truncate">
                      {(l.staff?.name || "").split(" ")[0]}
                    </div>
                  ))}
                  {leaves.length > 2 && (
                    <p className="text-[8px] text-muted-foreground">+{leaves.length - 2}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== Create Leave Dialog ==============
function CreateLeaveDialog({
  open, onOpenChange, staffList, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staffList: StaffLite[];
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    staffId: "",
    type: "casual",
    startDate: today,
    endDate: today,
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const days = computeDays(form.startDate, form.endDate);

  const submit = async () => {
    if (!form.staffId) { toast.error("Select a staff member"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error("End date must be on or after start date"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, days }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Leave request submitted");
      onSaved();
    } catch {
      toast.error("Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Staff Member *</Label>
            <Select value={form.staffId || "__none__"} onValueChange={(v) => setForm({ ...form, staffId: v === "__none__" ? "" : v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Select staff…</SelectItem>
                {staffList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Total: <span className="font-semibold text-teal-600">{days} day{days !== 1 ? "s" : ""}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Brief reason for leave…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
