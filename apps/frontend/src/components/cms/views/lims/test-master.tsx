"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { usePagination, useSort } from "@/lib/use-pagination";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, FlaskConical, Pencil, Trash2, Download, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, Boxes, Timer, Tag,
} from "lucide-react";
import { formatRs, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LabDepartment {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface ReferenceRange {
  id: string;
  gender: string;
  ageMin: number;
  ageMax: number;
  lowNormal: string | null;
  highNormal: string | null;
  criticalLow: string | null;
  criticalHigh: string | null;
  textNormal: string | null;
}

interface TestParameter {
  id: string;
  name: string;
  unit: string | null;
  resultType: string;
  displayOrder: number;
  options: string | null;
  referenceRanges: ReferenceRange[];
}

interface TestMaster {
  id: string;
  name: string;
  code: string;
  category: string;
  departmentId: string | null;
  sampleType: string;
  containerType: string;
  volumeRequired: string | null;
  processingMethod: string | null;
  turnaroundTime: string;
  price: number;
  taxRate: number;
  discountAllowed: boolean;
  status: string;
  isPackage: boolean;
  department: LabDepartment | null;
  parameters: TestParameter[];
}

type TestFormState = {
  name: string;
  code: string;
  category: string;
  departmentId: string;
  sampleType: string;
  containerType: string;
  volumeRequired: string;
  turnaroundTime: string;
  price: string;
  status: string;
};

const EMPTY_FORM: TestFormState = {
  name: "",
  code: "",
  category: "Hematology",
  departmentId: "",
  sampleType: "Blood",
  containerType: "EDTA Tube",
  volumeRequired: "3 ml",
  turnaroundTime: "4 hours",
  price: "",
  status: "active",
};

const CATEGORIES = [
  "Hematology", "Biochemistry", "Microbiology", "Serology",
  "Pathology", "Endocrinology", "Immunology", "Coagulation",
];

const SAMPLE_TYPES = ["Blood", "Urine", "Stool", "Sputum", "Tissue", "CSF", "Swab"];
const CONTAINERS = ["EDTA Tube", "Citrate Tube", "Heparin Tube", "Plain Tube", "Fluoride Tube", "Container"];

type SortableCol = keyof Pick<
  TestMaster,
  "name" | "code" | "category" | "sampleType" | "containerType" | "price" | "turnaroundTime" | "status"
>;

const GENDER_LABEL: Record<string, string> = {
  all: "All",
  male: "Male",
  female: "Female",
  child: "Child",
};

export function LimsTestMaster() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<TestMaster[]>(`/api/lab-tests-master?_r=${refresh}`);
  const { data: deptsData } = useFetch<LabDepartment[]>("/api/lab-departments");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editTest, setEditTest] = useState<TestMaster | null>(null);
  const [deleteTest, setDeleteTest] = useState<TestMaster | null>(null);
  const [viewTest, setViewTest] = useState<TestMaster | null>(null);

  const tests = data ?? [];
  const depts = deptsData ?? [];

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return tests.filter((t) => {
      const matchesQ =
        !ql ||
        t.name.toLowerCase().includes(ql) ||
        t.code.toLowerCase().includes(ql);
      const matchesCat = cat === "all" || t.category === cat;
      const matchesDept = deptFilter === "all" || t.departmentId === deptFilter;
      return matchesQ && matchesCat && matchesDept;
    });
  }, [tests, q, cat, deptFilter]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<TestMaster>(filtered, "name");
  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<TestMaster>(sorted, 10);

  useEffect(() => {
    setPage(1);
  }, [q, cat, deptFilter, setPage]);

  const handleExport = () => {
    if (tests.length === 0) {
      toast.error("No tests to export");
      return;
    }
    const headers = [
      "Name", "Code", "Category", "Department", "Sample Type", "Container",
      "Price", "TAT", "Status",
    ];
    const rows = sorted.map((t) => [
      t.name,
      t.code,
      t.category,
      t.department?.name || "",
      t.sampleType,
      t.containerType,
      t.price,
      t.turnaroundTime,
      t.status,
    ]);
    exportToCSV("lab-tests-master.csv", headers, rows);
    toast.success(`Exported ${rows.length} test(s) to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            Test Master Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {tests.length} test{tests.length === 1 ? "" : "s"} configured
            {total !== tests.length && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={tests.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Test
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("name")} />
                  <SortHeader label="Code" colKey="code" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("code")} className="hidden md:table-cell" />
                  <SortHeader label="Category" colKey="category" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("category")} className="hidden lg:table-cell" />
                  <TableHead className="hidden sm:table-cell">Department</TableHead>
                  <SortHeader label="Sample Type" colKey="sampleType" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("sampleType")} className="hidden md:table-cell" />
                  <SortHeader label="Container" colKey="containerType" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("containerType")} className="hidden lg:table-cell" />
                  <SortHeader label="Price" colKey="price" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("price")} />
                  <SortHeader label="TAT" colKey="turnaroundTime" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("turnaroundTime")} className="hidden xl:table-cell" />
                  <TableHead className="hidden sm:table-cell">Params</TableHead>
                  <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("status")} />
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
                      <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      No tests found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{t.name}</div>
                        {t.isPackage && (
                          <Badge variant="outline" className="text-[10px] mt-0.5 text-teal-700 dark:text-teal-300 border-teal-300">
                            Package
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">{t.code}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {t.department ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: t.department.color || "#0d9488" }}
                            />
                            <span className="truncate max-w-[120px]">{t.department.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{t.sampleType}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{t.containerType}</TableCell>
                      <TableCell className="text-sm font-medium text-teal-700 dark:text-teal-300">
                        {formatRs(t.price)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {t.turnaroundTime}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {t.parameters?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {statusLabel(t.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewTest(t)}
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditTest(t)}
                            title="Edit test"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteTest(t)}
                            title="Delete test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && tests.length > 0 && (
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

      <AddTestDialog
        depts={depts}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          setRefresh((r) => r + 1);
        }}
      />

      <EditTestDialog
        depts={depts}
        test={editTest}
        open={!!editTest}
        onOpenChange={(v) => { if (!v) setEditTest(null); }}
        onSaved={() => {
          setEditTest(null);
          setRefresh((r) => r + 1);
        }}
      />

      <DeleteTestDialog
        test={deleteTest}
        open={!!deleteTest}
        onOpenChange={(v) => { if (!v) setDeleteTest(null); }}
        onDeleted={() => {
          setDeleteTest(null);
          setRefresh((r) => r + 1);
        }}
      />

      <ViewTestSheet test={viewTest} open={!!viewTest} onOpenChange={(v) => { if (!v) setViewTest(null); }} />
    </div>
  );
}

function SortHeader({
  label, colKey, sortKey, sortDir, onSort, className,
}: {
  label: string;
  colKey: SortableCol;
  sortKey: keyof TestMaster | "";
  sortDir: "asc" | "desc";
  onSort: () => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}

function TestFormFields({
  form, setForm, depts,
}: {
  form: TestFormState;
  setForm: React.Dispatch<React.SetStateAction<TestFormState>>;
  depts: LabDepartment[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Test Name *</Label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Complete Blood Count"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Code *</Label>
        <Input
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          placeholder="CBC"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2">
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
        <Label>Sample Type</Label>
        <Select value={form.sampleType} onValueChange={(v) => setForm({ ...form, sampleType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SAMPLE_TYPES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Container</Label>
        <Select value={form.containerType} onValueChange={(v) => setForm({ ...form, containerType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTAINERS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Volume Required</Label>
        <Input
          value={form.volumeRequired}
          onChange={(e) => setForm({ ...form, volumeRequired: e.target.value })}
          placeholder="3 ml"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Turnaround Time</Label>
        <Input
          value={form.turnaroundTime}
          onChange={(e) => setForm({ ...form, turnaroundTime: e.target.value })}
          placeholder="4 hours"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Price (Rs) *</Label>
        <Input
          required
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="500"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function buildPayload(form: TestFormState) {
  return {
    name: form.name,
    code: form.code,
    category: form.category,
    departmentId: form.departmentId || null,
    sampleType: form.sampleType,
    containerType: form.containerType,
    volumeRequired: form.volumeRequired || null,
    turnaroundTime: form.turnaroundTime,
    price: Number(form.price) || 0,
    status: form.status,
  };
}

function AddTestDialog({
  depts, open, onOpenChange, onCreated,
}: {
  depts: LabDepartment[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<TestFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reset = () => setForm(EMPTY_FORM);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.price) {
      toast.error("Name, code, and price are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-tests-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to add test");
      }
      toast.success(`Test "${form.name}" added`);
      onCreated();
      reset();
    } catch {
      toast.error("Failed to add test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Test</DialogTitle>
          <DialogDescription>
            Configure a new lab test master entry. Parameters and reference ranges can be added after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <TestFormFields form={form} setForm={setForm} depts={depts} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving…" : "Add Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTestDialog({
  depts, test, open, onOpenChange, onSaved,
}: {
  depts: LabDepartment[];
  test: TestMaster | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TestFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (test && open) {
      setForm({
        name: test.name,
        code: test.code,
        category: test.category,
        departmentId: test.departmentId || "",
        sampleType: test.sampleType,
        containerType: test.containerType,
        volumeRequired: test.volumeRequired || "",
        turnaroundTime: test.turnaroundTime,
        price: String(test.price),
        status: test.status,
      });
    }
  }, [test, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test) return;
    if (!form.name || !form.code || !form.price) {
      toast.error("Name, code, and price are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-tests-master/${test.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) throw new Error("Failed to update test");
      toast.success("Test updated");
      onSaved();
    } catch {
      toast.error("Failed to update test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test</DialogTitle>
          <DialogDescription>
            Update the master entry for{" "}
            <span className="font-medium text-foreground">{test?.name}</span>{" "}
            (<span className="font-mono text-xs">{test?.code}</span>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <TestFormFields form={form} setForm={setForm} depts={depts} />
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

function DeleteTestDialog({
  test, open, onOpenChange, onDeleted,
}: {
  test: TestMaster | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!test) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/lab-tests-master/${test.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete test");
      toast.success(`Test "${test.name}" deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete test");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete test?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong className="text-foreground">{test?.name}</strong>{" "}
            (<span className="font-mono">{test?.code}</span>) and all its parameters and reference ranges.
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
            {deleting ? "Deleting…" : "Delete Test"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ViewTestSheet({
  test, open, onOpenChange,
}: {
  test: TestMaster | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!test) return null;

  const groupedByGender = (param: TestParameter) => {
    const groups: Record<string, ReferenceRange[]> = {};
    for (const r of param.referenceRanges) {
      const g = r.gender || "all";
      if (!groups[g]) groups[g] = [];
      groups[g].push(r);
    }
    return groups;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <SheetTitle className="text-xl flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-600" />
            {test.name}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="font-mono text-xs text-foreground">{test.code}</span>
            <Badge variant="outline" className="text-[10px]">{test.category}</Badge>
            {test.department && (
              <span className="flex items-center gap-1 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: test.department.color || "#0d9488" }}
                />
                {test.department.name}
              </span>
            )}
            <Badge
              className={`text-[10px] ${statusColors[test.status] || "bg-gray-100 text-gray-600"}`}
            >
              {statusLabel(test.status)}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <InfoTile icon={Tag} label="Sample Type" value={test.sampleType} />
            <InfoTile icon={Boxes} label="Container" value={test.containerType} />
            <InfoTile icon={Boxes} label="Volume Required" value={test.volumeRequired || "—"} />
            <InfoTile icon={Timer} label="Turnaround Time" value={test.turnaroundTime} />
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Price</p>
              <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatRs(test.price)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Tax Rate</p>
              <p className="text-lg font-bold">{test.taxRate}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">Discount</p>
              <p className="text-lg font-bold">{test.discountAllowed ? "Allowed" : "Not allowed"}</p>
            </div>
          </div>

          {test.processingMethod && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-[11px] text-muted-foreground mb-1">Processing Method</p>
              <p>{test.processingMethod}</p>
            </div>
          )}

          {/* Parameters & Reference Ranges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-teal-600" />
                Parameters &amp; Reference Ranges
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {test.parameters?.length || 0} parameter{(test.parameters?.length || 0) === 1 ? "" : "s"}
              </Badge>
            </div>

            {(!test.parameters || test.parameters.length === 0) ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No parameters configured for this test.
              </div>
            ) : (
              <div className="space-y-3">
                {test.parameters.map((p) => {
                  const groups = groupedByGender(p);
                  return (
                    <div key={p.id} className="rounded-lg border p-3 bg-muted/20">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">{p.name}</span>
                          {p.unit && (
                            <span className="ml-2 text-xs text-muted-foreground">({p.unit})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{p.resultType}</Badge>
                          {p.options && (
                            <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300">
                              {p.options.split(",").length} options
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-[11px] h-8">Gender</TableHead>
                              <TableHead className="text-[11px] h-8">Age</TableHead>
                              <TableHead className="text-[11px] h-8">Normal Range</TableHead>
                              <TableHead className="text-[11px] h-8">Critical</TableHead>
                              <TableHead className="text-[11px] h-8">Text / Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(groups).map(([gender, ranges]) =>
                              ranges.map((r, idx) => (
                                <TableRow key={`${gender}-${r.id}-${idx}`}>
                                  <TableCell className="text-xs">
                                    {idx === 0 ? (
                                      <Badge variant="outline" className="text-[10px] capitalize">
                                        {GENDER_LABEL[gender] || gender}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">"</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {r.ageMin}–{r.ageMax} yrs
                                  </TableCell>
                                  <TableCell className="text-xs font-mono">
                                    {r.lowNormal && r.highNormal
                                      ? `${r.lowNormal} – ${r.highNormal}`
                                      : r.lowNormal || r.highNormal || "—"}
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-rose-600">
                                    {r.criticalLow || r.criticalHigh
                                      ? `${r.criticalLow || "—"} / ${r.criticalHigh || "—"}`
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {r.textNormal || "—"}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoTile({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-teal-600" />
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
