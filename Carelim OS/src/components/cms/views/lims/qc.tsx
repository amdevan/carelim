"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { usePagination } from "@/lib/use-pagination";
import { exportToCSV } from "@/lib/export-utils";
import { Pagination } from "@/components/cms/pagination";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, ShieldCheck, Trash2, Download, CheckCircle2,
  AlertTriangle, XCircle, ClipboardCheck,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface QCRecord {
  id: string;
  code: string;
  testId: string | null;
  equipmentId: string | null;
  controlName: string;
  controlLevel: string;
  expectedValue: string | null;
  observedValue: string | null;
  deviation: string | null;
  status: string;
  performedBy: string | null;
  performedAt: string;
  comments: string | null;
  test: { id: string; name: string; code: string } | null;
}

interface TestMaster {
  id: string;
  name: string;
  code: string;
}

const QC_STATUS_BADGE: Record<string, string> = {
  pass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  fail: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const QC_LEVEL_BADGE: Record<string, string> = {
  normal: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
};

const STATUS_CHIPS = [
  { key: "all", label: "All", className: "" },
  { key: "pass", label: "Pass", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { key: "warning", label: "Warning", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  { key: "fail", label: "Fail", className: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
];

type QCFormState = {
  testId: string;
  controlName: string;
  controlLevel: string;
  expectedValue: string;
  observedValue: string;
  deviation: string;
  status: string;
  performedBy: string;
  comments: string;
};

const EMPTY_FORM: QCFormState = {
  testId: "",
  controlName: "",
  controlLevel: "normal",
  expectedValue: "",
  observedValue: "",
  deviation: "",
  status: "pass",
  performedBy: "",
  comments: "",
};

export function LimsQC() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<QCRecord[]>(`/api/lab-qc?_r=${refresh}`);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteRec, setDeleteRec] = useState<QCRecord | null>(null);

  const records = data ?? [];

  const stats = useMemo(() => {
    const pass = records.filter((r) => r.status === "pass").length;
    const warning = records.filter((r) => r.status === "warning").length;
    const fail = records.filter((r) => r.status === "fail").length;
    return { total: records.length, pass, warning, fail };
  }, [records]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return records.filter((r) => {
      const matchesQ =
        !ql ||
        r.code.toLowerCase().includes(ql) ||
        r.controlName.toLowerCase().includes(ql) ||
        (r.test?.name || "").toLowerCase().includes(ql) ||
        (r.performedBy || "").toLowerCase().includes(ql);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [records, q, statusFilter]);

  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<QCRecord>(filtered, 10);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, setPage]);

  const handleExport = () => {
    if (records.length === 0) {
      toast.error("No QC records to export");
      return;
    }
    const headers = [
      "Code", "Test", "Control", "Level", "Expected", "Observed",
      "Deviation", "Status", "Performed By", "Date",
    ];
    const rows = filtered.map((r) => [
      r.code,
      r.test?.name || "",
      r.controlName,
      r.controlLevel,
      r.expectedValue || "",
      r.observedValue || "",
      r.deviation || "",
      r.status,
      r.performedBy || "",
      formatDate(r.performedAt),
    ]);
    exportToCSV("lab-qc.csv", headers, rows);
    toast.success(`Exported ${rows.length} QC record(s) to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Quality Control
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} QC record{stats.total === 1 ? "" : "s"}
            {total !== stats.total && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={records.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add QC Record
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total QC" value={stats.total} icon={ClipboardCheck} accent="from-teal-500 to-teal-600" />
        <StatCard label="Pass" value={stats.pass} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" />
        <StatCard label="Warning" value={stats.warning} icon={AlertTriangle} accent="from-amber-500 to-orange-500" />
        <StatCard label="Fail" value={stats.fail} icon={XCircle} accent="from-rose-500 to-rose-600" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, control, test, or performer…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setStatusFilter(c.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    statusFilter === c.key
                      ? "bg-teal-600 text-white border-teal-600"
                      : c.className || "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                  {c.key !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({records.filter((r) => r.status === c.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Code</TableHead>
                  <TableHead className="hidden md:table-cell">Test</TableHead>
                  <TableHead>Control Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Level</TableHead>
                  <TableHead className="hidden lg:table-cell">Expected</TableHead>
                  <TableHead className="hidden lg:table-cell">Observed</TableHead>
                  <TableHead className="hidden xl:table-cell">Deviation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Performed By</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-10">
                      <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      No QC records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {r.test ? (
                          <div>
                            <div className="font-medium text-sm">{r.test.name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{r.test.code}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.controlName}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={`text-[10px] capitalize ${QC_LEVEL_BADGE[r.controlLevel] || ""}`}>
                          {r.controlLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{r.expectedValue || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs font-medium">
                        {r.observedValue || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                        {r.deviation || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] capitalize ${QC_STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {r.performedBy || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDate(r.performedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteRec(r)}
                          title="Delete QC record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && records.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              size={size}
              setSize={setSize}
              range={range}
            />
          )}
        </CardContent>
      </Card>

      <AddQCDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          setRefresh((r) => r + 1);
        }}
      />

      <DeleteQCDialog
        record={deleteRec}
        open={!!deleteRec}
        onOpenChange={(v) => { if (!v) setDeleteRec(null); }}
        onDeleted={() => {
          setDeleteRec(null);
          setRefresh((r) => r + 1);
        }}
      />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center shrink-0`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AddQCDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { data: testsData, loading: testsLoading } = useFetch<TestMaster[]>("/api/lab-tests-master");
  const [form, setForm] = useState<QCFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const tests = testsData ?? [];

  const reset = () => setForm(EMPTY_FORM);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.controlName) {
      toast.error("Control name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: form.testId || null,
          controlName: form.controlName,
          controlLevel: form.controlLevel,
          expectedValue: form.expectedValue || null,
          observedValue: form.observedValue || null,
          deviation: form.deviation || null,
          status: form.status,
          performedBy: form.performedBy || null,
          comments: form.comments || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add QC record");
      toast.success(`QC record for "${form.controlName}" added`);
      onCreated();
      reset();
    } catch {
      toast.error("Failed to add QC record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add QC Record</DialogTitle>
          <DialogDescription>
            Record a new quality control run for a test control.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Test</Label>
              <Select
                value={form.testId}
                onValueChange={(v) => setForm({ ...form, testId: v })}
                disabled={testsLoading}
              >
                <SelectTrigger><SelectValue placeholder="Select test (optional)" /></SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Control Name *</Label>
              <Input
                required
                value={form.controlName}
                onChange={(e) => setForm({ ...form, controlName: e.target.value })}
                placeholder="Bio-Rad Normal Control"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Control Level</Label>
              <Select value={form.controlLevel} onValueChange={(v) => setForm({ ...form, controlLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expected Value</Label>
              <Input
                value={form.expectedValue}
                onChange={(e) => setForm({ ...form, expectedValue: e.target.value })}
                placeholder="120"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observed Value</Label>
              <Input
                value={form.observedValue}
                onChange={(e) => setForm({ ...form, observedValue: e.target.value })}
                placeholder="118"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deviation</Label>
              <Input
                value={form.deviation}
                onChange={(e) => setForm({ ...form, deviation: e.target.value })}
                placeholder="1.7%"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Performed By</Label>
              <Input
                value={form.performedBy}
                onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                placeholder="Dr. Lab Tech"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Comments</Label>
              <Input
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
                placeholder="Any observations or notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving…" : "Add QC Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteQCDialog({
  record, open, onOpenChange, onDeleted,
}: {
  record: QCRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!record) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/lab-qc/${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete QC record");
      toast.success(`QC record ${record.code} deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete QC record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete QC record?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete QC record{" "}
            <strong className="text-foreground">{record?.code}</strong>{" "}
            (control <span className="font-mono">{record?.controlName}</span>).
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {deleting ? "Deleting…" : "Delete Record"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
