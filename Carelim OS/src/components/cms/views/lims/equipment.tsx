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
  Search, Plus, Microscope, Pencil, Trash2, Download,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LabDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  departmentId: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  lastCalibration: string | null;
  nextCalibration: string | null;
  maintenanceSchedule: string | null;
  status: string;
  department: LabDepartment | null;
}

const EQ_STATUS_BADGE: Record<string, string> = {
  operational: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  maintenance: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  breakdown: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const EQ_TYPE_BADGE: Record<string, string> = {
  analyzer: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  microscope: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  centrifuge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  imaging: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "operational", label: "Operational" },
  { key: "maintenance", label: "Maintenance" },
  { key: "breakdown", label: "Breakdown" },
];

const TYPES = ["all", "analyzer", "microscope", "centrifuge", "imaging", "other"];

type EqFormState = {
  name: string;
  serialNumber: string;
  type: string;
  manufacturer: string;
  model: string;
  departmentId: string;
  purchaseDate: string;
  warrantyExpiry: string;
  lastCalibration: string;
  nextCalibration: string;
  maintenanceSchedule: string;
  status: string;
};

const EMPTY_FORM: EqFormState = {
  name: "",
  serialNumber: "",
  type: "analyzer",
  manufacturer: "",
  model: "",
  departmentId: "",
  purchaseDate: "",
  warrantyExpiry: "",
  lastCalibration: "",
  nextCalibration: "",
  maintenanceSchedule: "",
  status: "operational",
};

function toDateInputValue(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export function LimsEquipment() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<Equipment[]>(`/api/lab-equipment?_r=${refresh}`);
  const { data: deptsData } = useFetch<LabDepartment[]>("/api/lab-departments");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEq, setEditEq] = useState<Equipment | null>(null);
  const [deleteEq, setDeleteEq] = useState<Equipment | null>(null);

  const items = data ?? [];
  const depts = deptsData ?? [];

  const stats = useMemo(() => {
    const operational = items.filter((e) => e.status === "operational").length;
    const maintenance = items.filter((e) => e.status === "maintenance").length;
    const breakdown = items.filter((e) => e.status === "breakdown").length;
    return { total: items.length, operational, maintenance, breakdown };
  }, [items]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return items.filter((e) => {
      const matchesQ =
        !ql ||
        e.name.toLowerCase().includes(ql) ||
        e.serialNumber.toLowerCase().includes(ql) ||
        (e.manufacturer || "").toLowerCase().includes(ql) ||
        (e.model || "").toLowerCase().includes(ql);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      return matchesQ && matchesStatus && matchesType;
    });
  }, [items, q, statusFilter, typeFilter]);

  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<Equipment>(filtered, 10);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, typeFilter, setPage]);

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No equipment to export");
      return;
    }
    const headers = [
      "Name", "Serial", "Type", "Manufacturer", "Model", "Department",
      "Status", "Last Cal", "Next Cal",
    ];
    const rows = filtered.map((e) => [
      e.name,
      e.serialNumber,
      e.type,
      e.manufacturer || "",
      e.model || "",
      e.department?.name || "",
      e.status,
      e.lastCalibration ? formatDate(e.lastCalibration) : "",
      e.nextCalibration ? formatDate(e.nextCalibration) : "",
    ]);
    exportToCSV("lab-equipment.csv", headers, rows);
    toast.success(`Exported ${rows.length} equipment(s) to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Microscope className="w-5 h-5 text-teal-600" />
            Equipment Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} equipment item{stats.total === 1 ? "" : "s"}
            {total !== stats.total && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={items.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Equipment
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Equipment" value={stats.total} icon={Microscope} accent="from-teal-500 to-teal-600" />
        <StatCard label="Operational" value={stats.operational} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" />
        <StatCard label="Maintenance" value={stats.maintenance} icon={AlertTriangle} accent="from-amber-500 to-orange-500" />
        <StatCard label="Breakdown" value={stats.breakdown} icon={XCircle} accent="from-rose-500 to-rose-600" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial, manufacturer, or model…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setStatusFilter(c.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    statusFilter === c.key
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                  <span className="ml-1 opacity-70">
                    ({c.key === "all" ? items.length : items.filter((e) => e.status === c.key).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Serial</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Manufacturer</TableHead>
                  <TableHead className="hidden xl:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Cal</TableHead>
                  <TableHead className="hidden sm:table-cell">Next Cal</TableHead>
                  <TableHead className="hidden xl:table-cell">Warranty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                      <Microscope className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      No equipment found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((e) => {
                    const nextOverdue = isPast(e.nextCalibration);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{e.name}</div>
                          {e.model && (
                            <div className="text-[11px] text-muted-foreground">{e.model}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">{e.serialNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`text-[10px] capitalize ${EQ_TYPE_BADGE[e.type] || ""}`}>
                            {e.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {e.manufacturer || "—"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {e.department ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: e.department.color || "#0d9488" }}
                              />
                              <span className="truncate max-w-[120px]">{e.department.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${EQ_STATUS_BADGE[e.status] || "bg-gray-100 text-gray-600"}`}>
                            {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {e.lastCalibration ? formatDate(e.lastCalibration) : "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {e.nextCalibration ? (
                            <span className={nextOverdue ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                              {formatDate(e.nextCalibration)}
                              {nextOverdue && (
                                <span className="block text-[10px] text-rose-500">overdue</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {e.warrantyExpiry ? formatDate(e.warrantyExpiry) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditEq(e)}
                              title="Edit equipment"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteEq(e)}
                              title="Delete equipment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && items.length > 0 && (
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

      <AddEquipmentDialog
        depts={depts}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          setRefresh((r) => r + 1);
        }}
      />

      <EditEquipmentDialog
        depts={depts}
        equipment={editEq}
        open={!!editEq}
        onOpenChange={(v) => { if (!v) setEditEq(null); }}
        onSaved={() => {
          setEditEq(null);
          setRefresh((r) => r + 1);
        }}
      />

      <DeleteEquipmentDialog
        equipment={deleteEq}
        open={!!deleteEq}
        onOpenChange={(v) => { if (!v) setDeleteEq(null); }}
        onDeleted={() => {
          setDeleteEq(null);
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

const EQ_TYPES = ["analyzer", "microscope", "centrifuge", "imaging", "other"];
const EQ_STATUSES = ["operational", "maintenance", "breakdown"];

function EquipmentFormFields({
  form, setForm, depts,
}: {
  form: EqFormState;
  setForm: React.Dispatch<React.SetStateAction<EqFormState>>;
  depts: LabDepartment[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Name *</Label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Sysmex XN-1000"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Serial Number *</Label>
        <Input
          required
          value={form.serialNumber}
          onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          placeholder="SN-2024-001"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EQ_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Manufacturer</Label>
        <Input
          value={form.manufacturer}
          onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
          placeholder="Sysmex"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Input
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          placeholder="XN-1000"
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Department</Label>
        <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            {depts.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Purchase Date</Label>
        <Input
          type="date"
          value={form.purchaseDate}
          onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Warranty Expiry</Label>
        <Input
          type="date"
          value={form.warrantyExpiry}
          onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Last Calibration</Label>
        <Input
          type="date"
          value={form.lastCalibration}
          onChange={(e) => setForm({ ...form, lastCalibration: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Next Calibration</Label>
        <Input
          type="date"
          value={form.nextCalibration}
          onChange={(e) => setForm({ ...form, nextCalibration: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Maintenance Schedule</Label>
        <Input
          value={form.maintenanceSchedule}
          onChange={(e) => setForm({ ...form, maintenanceSchedule: e.target.value })}
          placeholder="Monthly"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EQ_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function buildPayload(form: EqFormState) {
  return {
    name: form.name,
    serialNumber: form.serialNumber,
    type: form.type,
    manufacturer: form.manufacturer || null,
    model: form.model || null,
    departmentId: form.departmentId || null,
    purchaseDate: form.purchaseDate || null,
    warrantyExpiry: form.warrantyExpiry || null,
    lastCalibration: form.lastCalibration || null,
    nextCalibration: form.nextCalibration || null,
    maintenanceSchedule: form.maintenanceSchedule || null,
    status: form.status,
  };
}

function AddEquipmentDialog({
  depts, open, onOpenChange, onCreated,
}: {
  depts: LabDepartment[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<EqFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reset = () => setForm(EMPTY_FORM);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.serialNumber) {
      toast.error("Name and serial number are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to add equipment");
      }
      toast.success(`Equipment "${form.name}" added`);
      onCreated();
      reset();
    } catch {
      toast.error("Failed to add equipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
          <DialogDescription>
            Register a new lab equipment or machine.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <EquipmentFormFields form={form} setForm={setForm} depts={depts} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving…" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEquipmentDialog({
  depts, equipment, open, onOpenChange, onSaved,
}: {
  depts: LabDepartment[];
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EqFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (equipment && open) {
      setForm({
        name: equipment.name,
        serialNumber: equipment.serialNumber,
        type: equipment.type,
        manufacturer: equipment.manufacturer || "",
        model: equipment.model || "",
        departmentId: equipment.departmentId || "",
        purchaseDate: toDateInputValue(equipment.purchaseDate),
        warrantyExpiry: toDateInputValue(equipment.warrantyExpiry),
        lastCalibration: toDateInputValue(equipment.lastCalibration),
        nextCalibration: toDateInputValue(equipment.nextCalibration),
        maintenanceSchedule: equipment.maintenanceSchedule || "",
        status: equipment.status,
      });
    }
  }, [equipment, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;
    if (!form.name || !form.serialNumber) {
      toast.error("Name and serial number are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-equipment/${equipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) throw new Error("Failed to update equipment");
      toast.success("Equipment updated");
      onSaved();
    } catch {
      toast.error("Failed to update equipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>
            Update details for{" "}
            <span className="font-medium text-foreground">{equipment?.name}</span>{" "}
            (S/N <span className="font-mono text-xs">{equipment?.serialNumber}</span>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <EquipmentFormFields form={form} setForm={setForm} depts={depts} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEquipmentDialog({
  equipment, open, onOpenChange, onDeleted,
}: {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!equipment) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/lab-equipment/${equipment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete equipment");
      toast.success(`Equipment "${equipment.name}" deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete equipment");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete equipment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong className="text-foreground">{equipment?.name}</strong>{" "}
            (S/N <span className="font-mono">{equipment?.serialNumber}</span>) from the equipment register.
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
            {deleting ? "Deleting…" : "Delete Equipment"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
