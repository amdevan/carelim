"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { Pagination } from "@/components/cms/pagination";
import { usePagination } from "@/lib/use-pagination";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, HeartPulse, Baby, TrendingUp, Search, Filter, Download,
  Plus, MoreVertical, Eye, Trash2, Stethoscope, Microscope, Syringe,
  FlaskConical, Calendar, ChevronRight, ClipboardList, CheckCircle2,
  XCircle, Clock, Egg, Snowflake, ArrowRight, FileText, User, UserCog,
} from "lucide-react";

// =====================================================================
// Types
// =====================================================================
interface FollicularRecord {
  id: string;
  monitoringDate: string;
  day: number;
  endometrium: number | null;
  e2: number | null;
  lh: number | null;
  p4: number | null;
  leftFollicles: unknown;
  rightFollicles: unknown;
  notes: string | null;
}

interface EmbryoRecord {
  id: string;
  embryoNo: number;
  day: number;
  cellCount: number | null;
  grade: string | null;
  quality: string | null;
  status: string;
  frozenDate: string | null;
  notes: string | null;
}

interface TransferRecord {
  id: string;
  transferDate: string;
  transferType: string;
  embryosTransferred: number;
  catheter: string | null;
  difficulty: string | null;
  notes: string | null;
}

interface PregnancyFollowup {
  id: string;
  testDate: string;
  betaHcg: number | null;
  result: string;
  sacVisible: boolean;
  heartbeat: boolean;
  fetalCount: number;
  gestationalAge: number;
  edd: string | null;
  status: string;
  notes: string | null;
}

interface IVFCycle {
  id: string;
  cycleNo: string;
  patientId: string;
  partnerId: string | null;
  doctorId: string | null;
  cycleNumber: number;
  status: string;
  startDate: string;
  endDate: string | null;
  protocolId: string | null;
  stimulationStart: string | null;
  stimulationEnd: string | null;
  opuDate: string | null;
  transferDate: string | null;
  pregnancyTestDate: string | null;
  pregnancyResult: string | null;
  notes: string | null;
  totalCost: number;
  paidAmount: number;
  createdAt: string;
  updatedAt: string;
  follicularRecords: FollicularRecord[];
  embryoRecords: EmbryoRecord[];
  transfers: TransferRecord[];
  pregnancy: PregnancyFollowup | null;
}

interface Patient {
  id: string; patientCode: string; name: string; phone: string; gender: string;
}

interface Doctor {
  id: string; name: string; specialization: string | null;
}

// =====================================================================
// Status helpers
// =====================================================================
const STATUS_FLOW: { key: string; label: string }[] = [
  { key: "planned", label: "Planned" },
  { key: "stimulation", label: "Stimulation" },
  { key: "monitoring", label: "Monitoring" },
  { key: "opu", label: "OPU" },
  { key: "transfer", label: "Transfer" },
  { key: "wait", label: "Waiting" },
  { key: "pregnant", label: "Pregnant" },
  { key: "failed", label: "Failed" },
];

const STATUS_BADGE: Record<string, string> = {
  planned: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  stimulation: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  monitoring: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  opu: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  transfer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  wait: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  pregnant: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_FLOW.map((s) => [s.key, s.label]),
);

const FILTER_CHIPS = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "stimulation", label: "Stimulation" },
  { value: "monitoring", label: "Monitoring" },
  { value: "opu", label: "OPU" },
  { value: "transfer", label: "Transfer" },
  { value: "wait", label: "Waiting" },
  { value: "pregnant", label: "Pregnant" },
  { value: "failed", label: "Failed" },
];

const RESULT_BADGE: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  negative: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const EMBRYO_STATUS_BADGE: Record<string, string> = {
  cultured: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  frozen: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  transferred: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  discarded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const formatDateOrNull = (d: string | null) => (d ? formatDate(d) : "—");

// =====================================================================
// Component
// =====================================================================
export function IvfCycles() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: cycles, loading } = useFetch<IVFCycle[]>(
    refresh ? `/api/ivf-cycles?_r=${refresh}` : "/api/ivf-cycles",
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteCycle, setDeleteCycle] = useState<IVFCycle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const all = cycles || [];

  const filtered = useMemo(() => {
    return all.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.cycleNo.toLowerCase().includes(q) ||
          c.patientId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [all, search, statusFilter]);

  const pagination = usePagination<IVFCycle>(filtered, 10);

  // Stats
  const totalCycles = all.length;
  const activeCount = all.filter((c) =>
    ["stimulation", "monitoring", "opu", "transfer", "wait"].includes(c.status),
  ).length;
  const pregnantCount = all.filter((c) => c.status === "pregnant").length;
  const successRate = totalCycles > 0 ? Math.round((pregnantCount / totalCycles) * 100) : 0;

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV(
      "ivf-cycles",
      ["Cycle No", "Patient ID", "Cycle #", "Status", "Stimulation Start", "OPU Date", "Transfer Date", "Result", "Total Cost", "Paid"],
      filtered.map((c) => [
        c.cycleNo, c.patientId, c.cycleNumber, STATUS_LABEL[c.status] || c.status,
        formatDateOrNull(c.stimulationStart), formatDateOrNull(c.opuDate),
        formatDateOrNull(c.transferDate),
        c.pregnancyResult || "pending",
        c.totalCost, c.paidAmount,
      ]),
    );
    toast.success("Cycles exported");
  };

  const patchStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/ivf-cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Cycle marked as ${STATUS_LABEL[status] || status}`);
      refreshFn();
    } else {
      toast.error("Failed to update cycle");
    }
  };

  const handleDelete = async () => {
    if (!deleteCycle) return;
    const res = await fetchAPI(`/api/ivf-cycles/${deleteCycle.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`Cycle ${deleteCycle.cycleNo} deleted`);
      setDeleteCycle(null);
      refreshFn();
    } else {
      toast.error("Failed to delete cycle");
    }
  };

  const selected = all.find((c) => c.id === selectedId) || null;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">IVF Cycles</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {totalCycles} cycles · {activeCount} active · {pregnantCount} pregnant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Cycle
          </Button>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Total Cycles" value={totalCycles} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active" value={activeCount} icon={HeartPulse} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Pregnant" value={pregnantCount} icon={Baby} accent="from-pink-500 to-rose-500" index={2} />
        <KpiCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} accent="from-teal-500 to-emerald-600" index={3} />
      </div>

      {/* Search + filter chips */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by cycle no or patient ID…"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {FILTER_CHIPS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    statusFilter === f.value
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                  {f.value !== "all" && (
                    <span className="text-[10px] opacity-70">
                      ({all.filter((c) => c.status === f.value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No IVF cycles found"
              description="Create a new cycle or adjust your filters to see results"
              action={
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" /> New Cycle
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Cycle No</TableHead>
                      <TableHead className="min-w-[120px]">Patient ID</TableHead>
                      <TableHead>Cycle #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[110px]">Stimulation</TableHead>
                      <TableHead className="min-w-[110px]">OPU Date</TableHead>
                      <TableHead className="min-w-[110px]">Transfer Date</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="w-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paged.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setSelectedId(c.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                              <AvatarFallback className="bg-transparent text-teal-700 dark:text-teal-300 text-[10px] font-semibold">
                                {c.cycleNo.replace("IVF-", "").slice(-3)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium text-sm">{c.cycleNo}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono text-[11px]">
                          {c.patientId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">#{c.cycleNumber}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABEL[c.status] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateOrNull(c.stimulationStart)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateOrNull(c.opuDate)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateOrNull(c.transferDate)}
                        </TableCell>
                        <TableCell>
                          {c.pregnancyResult ? (
                            <Badge className={`text-[10px] ${RESULT_BADGE[c.pregnancyResult] || "bg-gray-100 text-gray-600"}`}>
                              {c.pregnancyResult}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatRs(c.totalCost)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-[10px] uppercase">Cycle actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setSelectedId(c.id)}>
                                <Eye className="w-4 h-4" /> View timeline
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] uppercase">Advance status</DropdownMenuLabel>
                              {STATUS_FLOW.filter((s) => s.key !== c.status && s.key !== "failed").map((s) => (
                                <DropdownMenuItem key={s.key} onClick={() => patchStatus(c.id, s.key)}>
                                  <ArrowRight className="w-3.5 h-3.5" /> Mark as {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem onClick={() => patchStatus(c.id, "failed")}>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Mark as Failed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteCycle(c)}>
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                setPage={pagination.setPage}
                size={pagination.size}
                setSize={pagination.setSize}
                range={pagination.range}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* New Cycle dialog */}
      <NewCycleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); refreshFn(); }}
      />

      {/* Cycle detail Sheet */}
      <CycleDetailSheet cycle={selected} onClose={() => setSelectedId(null)} onRefresh={refreshFn} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteCycle} onOpenChange={(o) => !o && setDeleteCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cycle {deleteCycle?.cycleNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the cycle along with its follicular monitoring, embryo records, transfers and pregnancy follow-up. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Delete cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =====================================================================
// New Cycle Dialog
// =====================================================================
function NewCycleDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const { data: protocols } = useFetch<Array<{ id: string; name: string; code: string }>>("/api/ivf-protocols");

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [cycleNumber, setCycleNumber] = useState("1");
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPatientId(""); setDoctorId(""); setProtocolId("");
    setCycleNumber("1"); setTotalCost(""); setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) { toast.error("Please select a patient"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        cycleNumber: Number(cycleNumber) || 1,
        notes: notes || undefined,
        totalCost: totalCost ? Number(totalCost) : 0,
      };
      if (doctorId) body.doctorId = doctorId;
      if (protocolId) body.protocolId = protocolId;
      const res = await fetchAPI("/api/ivf-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("IVF cycle created", { description: "Cycle added with status Planned" });
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create cycle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-teal-600" /> New IVF Cycle
          </DialogTitle>
          <DialogDescription>
            Register a new IVF treatment cycle. The cycle starts in <span className="font-medium">Planned</span> status.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
              <SelectContent>
                {(patients || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.patientCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Doctor + Protocol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {(doctors || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}{d.specialization ? ` · ${d.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Protocol</Label>
              <Select value={protocolId} onValueChange={setProtocolId}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {(protocols || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cycle # + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ivf-cycle-no">Cycle Number</Label>
              <Input
                id="ivf-cycle-no" type="number" min={1}
                value={cycleNumber}
                onChange={(e) => setCycleNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ivf-cost">Total Cost (Rs.)</Label>
              <Input
                id="ivf-cost" type="number" min={0}
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ivf-notes" className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Notes</Label>
            <Textarea
              id="ivf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Clinical notes, indications, partner info…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Creating…" : <><Plus className="w-4 h-4" /> Create Cycle</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// Cycle Detail Sheet — full timeline
// =====================================================================
function CycleDetailSheet({
  cycle, onClose, onRefresh,
}: {
  cycle: IVFCycle | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const open = !!cycle;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin">
        {cycle && (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <SheetTitle className="flex items-center gap-2 text-lg">
                    <FlaskConical className="w-4 h-4 text-teal-600" /> {cycle.cycleNo}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    Patient ID: <span className="font-mono">{cycle.patientId}</span> · Cycle #{cycle.cycleNumber}
                  </SheetDescription>
                </div>
                <Badge className={`text-[10px] ${STATUS_BADGE[cycle.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABEL[cycle.status] || cycle.status}
                </Badge>
              </div>
            </SheetHeader>

            <div className="px-4 pb-6 space-y-5">
              {/* Status workflow */}
              <CycleWorkflow status={cycle.status} />

              {/* Key dates */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" /> Key Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-0">
                  <InfoRow label="Start Date" value={formatDate(cycle.startDate)} />
                  <InfoRow label="Stimulation Start" value={formatDateOrNull(cycle.stimulationStart)} />
                  <InfoRow label="Stimulation End" value={formatDateOrNull(cycle.stimulationEnd)} />
                  <InfoRow label="OPU Date" value={formatDateOrNull(cycle.opuDate)} />
                  <InfoRow label="Transfer Date" value={formatDateOrNull(cycle.transferDate)} />
                  <InfoRow label="Pregnancy Test" value={formatDateOrNull(cycle.pregnancyTestDate)} />
                </CardContent>
              </Card>

              {/* Cost summary */}
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-semibold tabular-nums">{formatRs(cycle.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid Amount</span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatRs(cycle.paidAmount)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className={`font-semibold tabular-nums ${cycle.totalCost - cycle.paidAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatRs(Math.max(cycle.totalCost - cycle.paidAmount, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Follicular Monitoring */}
              <TimelineSection
                icon={Microscope}
                title="Follicular Monitoring"
                count={cycle.follicularRecords.length}
                accent="text-cyan-600"
              >
                {cycle.follicularRecords.length === 0 ? (
                  <EmptyMessage message="No monitoring records yet" />
                ) : (
                  <div className="space-y-2">
                    {cycle.follicularRecords.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border bg-card/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold">Day {r.day}</span>
                          <span className="text-muted-foreground">{formatDate(r.monitoringDate)}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <StatCell label="Endo" value={r.endometrium != null ? `${r.endometrium}mm` : "—"} />
                          <StatCell label="E2" value={r.e2 != null ? `${r.e2}` : "—"} />
                          <StatCell label="LH" value={r.lh != null ? `${r.lh}` : "—"} />
                          <StatCell label="P4" value={r.p4 != null ? `${r.p4}` : "—"} />
                        </div>
                        {r.notes && <p className="mt-1.5 text-muted-foreground">{r.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </TimelineSection>

              {/* Egg Retrieval (derived from opuDate) */}
              <TimelineSection
                icon={Egg}
                title="Egg Retrieval (OPU)"
                count={cycle.opuDate ? 1 : 0}
                accent="text-teal-600"
              >
                {cycle.opuDate ? (
                  <div className="rounded-lg border border-border bg-card/50 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">OPU performed</span>
                      <span className="text-muted-foreground">{formatDate(cycle.opuDate)}</span>
                    </div>
                    <p className="text-muted-foreground">
                      Follicular monitoring captured {cycle.follicularRecords.length} sessions prior to retrieval.
                    </p>
                  </div>
                ) : (
                  <EmptyMessage message="OPU not yet scheduled" />
                )}
              </TimelineSection>

              {/* Embryos */}
              <TimelineSection
                icon={FlaskConical}
                title="Embryology Lab"
                count={cycle.embryoRecords.length}
                accent="text-emerald-600"
              >
                {cycle.embryoRecords.length === 0 ? (
                  <EmptyMessage message="No embryo records yet" />
                ) : (
                  <div className="space-y-1.5">
                    {cycle.embryoRecords.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="font-semibold">Embryo #{e.embryoNo}</span>
                          <span className="text-muted-foreground">· Day {e.day}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.grade && <Badge variant="outline" className="text-[9px]">{e.grade}</Badge>}
                          {e.cellCount != null && (
                            <span className="text-muted-foreground">{e.cellCount} cells</span>
                          )}
                          <Badge className={`text-[9px] ${EMBRYO_STATUS_BADGE[e.status] || "bg-gray-100 text-gray-600"}`}>
                            {e.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TimelineSection>

              {/* Embryo Transfer */}
              <TimelineSection
                icon={Syringe}
                title="Embryo Transfer"
                count={cycle.transfers.length}
                accent="text-teal-600"
              >
                {cycle.transfers.length === 0 ? (
                  <EmptyMessage message="No transfers recorded" />
                ) : (
                  <div className="space-y-2">
                    {cycle.transfers.map((t) => (
                      <div key={t.id} className="rounded-lg border border-border bg-card/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge className="text-[9px] bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 capitalize">
                            {t.transferType}
                          </Badge>
                          <span className="text-muted-foreground">{formatDate(t.transferDate)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <StatCell label="Embryos" value={`${t.embryosTransferred}`} />
                          <StatCell label="Catheter" value={t.catheter || "—"} />
                          <StatCell label="Difficulty" value={t.difficulty || "—"} />
                        </div>
                        {t.notes && <p className="mt-1.5 text-muted-foreground">{t.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </TimelineSection>

              {/* Pregnancy */}
              <TimelineSection
                icon={Baby}
                title="Pregnancy Tracking"
                count={cycle.pregnancy ? 1 : 0}
                accent="text-pink-600"
              >
                {cycle.pregnancy ? (
                  <div className="rounded-lg border border-border bg-card/50 p-2.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {cycle.pregnancy.result === "positive" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : cycle.pregnancy.result === "negative" ? (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <Badge className={`text-[9px] ${RESULT_BADGE[cycle.pregnancy.result] || "bg-gray-100 text-gray-600"}`}>
                          {cycle.pregnancy.result}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">{formatDate(cycle.pregnancy.testDate)}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <StatCell label="β-hCG" value={cycle.pregnancy.betaHcg != null ? `${cycle.pregnancy.betaHcg}` : "—"} />
                      <StatCell label="Sac" value={cycle.pregnancy.sacVisible ? "Yes" : "No"} />
                      <StatCell label="Heartbeat" value={cycle.pregnancy.heartbeat ? "Yes" : "No"} />
                      <StatCell label="Fetal #" value={`${cycle.pregnancy.fetalCount}`} />
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Gestational age: {cycle.pregnancy.gestationalAge} wks</span>
                      <span>Status: <span className="capitalize text-foreground">{cycle.pregnancy.status}</span></span>
                    </div>
                    {cycle.pregnancy.edd && (
                      <p className="text-muted-foreground">EDD: {formatDate(cycle.pregnancy.edd)}</p>
                    )}
                  </div>
                ) : (
                  <EmptyMessage message="Pregnancy follow-up not yet recorded" />
                )}
              </TimelineSection>

              {/* Notes */}
              {cycle.notes && (
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" /> Clinical Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {cycle.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Advance status quick actions */}
              <div className="rounded-lg border border-teal-100 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300 mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Advance Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FLOW.filter((s) => s.key !== cycle.status).map((s) => (
                    <StatusAdvanceButton key={s.key} cycleId={cycle.id} status={s.key} label={s.label} onDone={onRefresh} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatusAdvanceButton({
  cycleId, status, label, onDone,
}: {
  cycleId: string; status: string; label: string; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const res = await fetchAPI(`/api/ivf-cycles/${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(`Marked as ${label}`);
      onDone();
    } else {
      toast.error("Failed to update");
    }
  };
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={onClick}
      className="h-7 text-[11px] gap-1"
    >
      {busy ? "…" : <><ArrowRight className="w-3 h-3" /> {label}</>}
    </Button>
  );
}

// =====================================================================
// Status workflow strip
// =====================================================================
function CycleWorkflow({ status }: { status: string }) {
  const activeIdx = STATUS_FLOW.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
      {STATUS_FLOW.map((s, i) => {
        const isActive = s.key === status;
        const isDone = activeIdx > i;
        const isTerminal = status === "failed" && s.key === "failed";
        const colorClass = isActive
          ? "bg-teal-600 text-white"
          : isDone
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : isTerminal
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              : "bg-muted text-muted-foreground";
        return (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${colorClass}`}>
              {s.label}
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Small helpers
// =====================================================================
function TimelineSection({
  icon: Icon, title, count, accent, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} /> {title}
          <Badge variant="outline" className="text-[9px] ml-auto">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
      <Clock className="w-3.5 h-3.5" />
      {message}
    </div>
  );
}
