"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Search, Plus, RotateCcw, AlertCircle, Download, Trash2,
  Package, ShoppingCart,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";

/* ---------------- Types ---------------- */
interface Supplier {
  id: string;
  name: string;
}

interface MedicineLite {
  id: string;
  name: string;
  strength?: string | null;
  purchasePrice: number;
  salePrice: number;
  stockQty: number;
  supplierId?: string | null;
}

interface PurchaseReturn {
  id: string; returnNo: string; orderId: string | null; supplierId: string | null;
  medicineId: string; quantity: number; unitPrice: number; totalAmount: number;
  reason: string | null; status: string; date: string;
  medicine?: { name: string; strength?: string | null };
}

interface SalesReturn {
  id: string; returnNo: string; saleId: string | null; medicineId: string;
  quantity: number; unitPrice: number; totalAmount: number;
  reason: string | null; status: string; date: string;
  medicine?: { name: string; strength?: string | null };
}

interface PurchaseDraftItem {
  medicineId: string;
  quantity: number;
  reason: string;
  batch: string;
}

interface SalesDraftItem {
  medicineId: string;
  quantity: number;
  reason: string;
}

/* ---------------- Main View ---------------- */
export function PmsReturns() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="purchase">
        <TabsList>
          <TabsTrigger value="purchase">Purchase Returns</TabsTrigger>
          <TabsTrigger value="sales">Sales Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase">
          <PurchaseReturnsTab />
        </TabsContent>
        <TabsContent value="sales">
          <SalesReturnsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================== PURCHASE RETURNS TAB ==================== */
function PurchaseReturnsTab() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: returns, loading, error } = useFetch<PurchaseReturn[]>(
    refresh ? `/api/purchase-returns?_r=${refresh}` : "/api/purchase-returns",
  );

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseReturn | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!returns) return [];
    const ql = q.toLowerCase();
    return returns.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchSearch = !ql ||
        r.returnNo.toLowerCase().includes(ql) ||
        (r.medicine?.name || "").toLowerCase().includes(ql) ||
        (r.reason || "").toLowerCase().includes(ql);
      return matchStatus && matchSearch;
    });
  }, [returns, q, statusFilter]);

  const { paged, page, totalPages, setPage, size, setSize, range } = usePagination(filtered, 10);

  const totalValue = (returns || []).reduce((s, r) => s + r.totalAmount, 0);
  const pending = (returns || []).filter((r) => r.status === "pending").length;

  const handleExport = () => {
    if (!filtered.length) { toast.info("No purchase returns to export"); return; }
    exportToCSV("purchase-returns", ["Return No", "Medicine", "Qty", "Unit Price", "Total", "Reason", "Status", "Date"],
      filtered.map((r) => [r.returnNo, r.medicine?.name || "", r.quantity, r.unitPrice, r.totalAmount, r.reason || "", r.status, formatDate(r.date)]));
    toast.success(`Exported ${filtered.length} purchase returns`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/purchase-returns/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Return ${deleteTarget.returnNo} deleted`);
      setDeleteTarget(null);
      refreshFn();
    } catch {
      toast.error("Failed to delete return");
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-rose-600">
          Failed to load purchase returns: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" /> Purchase Returns
          </h2>
          <p className="text-sm text-muted-foreground">
            {returns?.length ?? 0} returns · {formatRs(totalValue)} total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" /> Create Purchase Return
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Returns" value={returns?.length || 0} icon={RotateCcw} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={AlertCircle} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Total Value" value={formatRs(totalValue)} icon={RotateCcw} accent="from-rose-500 to-rose-600" index={2} />
      </div>

      {/* Filter bar + table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search return no, medicine, or reason…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "approved", "completed", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {s === "all" ? "All" : statusLabel(s)}
                  {s !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({returns?.filter((r) => r.status === s).length ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase">Return No</TableHead>
                  <TableHead className="text-[11px] uppercase">Medicine</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Qty</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Unit Price</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Total</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Reason</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-2">
                      <EmptyState
                        icon={RotateCcw}
                        title="No purchase returns found"
                        description="Adjust your filters or create a new return."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : paged.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                    <TableCell className="text-sm font-medium">{r.medicine?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.quantity}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatRs(r.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(r.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.reason || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[r.status] || "bg-gray-100"}`}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDate(r.date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setDeleteTarget(r)}
                          title="Delete return"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </CardContent>
      </Card>

      {/* Create Purchase Return Dialog */}
      <CreatePurchaseReturnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); refreshFn(); toast.success("Purchase return created"); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete Purchase Return?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete return{" "}
              <span className="font-mono font-semibold text-foreground">{deleteTarget?.returnNo}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ==================== SALES RETURNS TAB ==================== */
function SalesReturnsTab() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: returns, loading, error } = useFetch<SalesReturn[]>(
    refresh ? `/api/sales-returns?_r=${refresh}` : "/api/sales-returns",
  );

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesReturn | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!returns) return [];
    const ql = q.toLowerCase();
    return returns.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchSearch = !ql ||
        r.returnNo.toLowerCase().includes(ql) ||
        (r.medicine?.name || "").toLowerCase().includes(ql) ||
        (r.reason || "").toLowerCase().includes(ql);
      return matchStatus && matchSearch;
    });
  }, [returns, q, statusFilter]);

  const { paged, page, totalPages, setPage, size, setSize, range } = usePagination(filtered, 10);

  const totalValue = (returns || []).reduce((s, r) => s + r.totalAmount, 0);
  const pending = (returns || []).filter((r) => r.status === "pending").length;

  const handleExport = () => {
    if (!filtered.length) { toast.info("No sales returns to export"); return; }
    exportToCSV("sales-returns", ["Return No", "Medicine", "Qty", "Unit Price", "Total", "Reason", "Status", "Date"],
      filtered.map((r) => [r.returnNo, r.medicine?.name || "", r.quantity, r.unitPrice, r.totalAmount, r.reason || "", r.status, formatDate(r.date)]));
    toast.success(`Exported ${filtered.length} sales returns`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/sales-returns/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Return ${deleteTarget.returnNo} deleted`);
      setDeleteTarget(null);
      refreshFn();
    } catch {
      toast.error("Failed to delete return");
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-rose-600">
          Failed to load sales returns: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-600" /> Sales Returns
          </h2>
          <p className="text-sm text-muted-foreground">
            {returns?.length ?? 0} returns · {formatRs(totalValue)} total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" /> Create Sales Return
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Returns" value={returns?.length || 0} icon={RotateCcw} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={AlertCircle} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Total Value" value={formatRs(totalValue)} icon={RotateCcw} accent="from-rose-500 to-rose-600" index={2} />
      </div>

      {/* Filter bar + table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search return no, medicine, or reason…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "approved", "completed", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors capitalize ${
                    statusFilter === s
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {s === "all" ? "All" : statusLabel(s)}
                  {s !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({returns?.filter((r) => r.status === s).length ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase">Return No</TableHead>
                  <TableHead className="text-[11px] uppercase">Medicine</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Qty</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Unit Price</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Total</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Reason</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-2">
                      <EmptyState
                        icon={RotateCcw}
                        title="No sales returns found"
                        description="Adjust your filters or create a new return."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : paged.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{r.returnNo}</TableCell>
                    <TableCell className="text-sm font-medium">{r.medicine?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.quantity}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatRs(r.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(r.totalAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.reason || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[r.status] || "bg-gray-100"}`}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{formatDate(r.date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setDeleteTarget(r)}
                          title="Delete return"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </CardContent>
      </Card>

      {/* Create Sales Return Dialog */}
      <CreateSalesReturnDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); refreshFn(); toast.success("Sales return created"); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete Sales Return?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete return{" "}
              <span className="font-mono font-semibold text-foreground">{deleteTarget?.returnNo}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ==================== CREATE PURCHASE RETURN DIALOG ==================== */
function CreatePurchaseReturnDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: suppliers } = useFetch<Supplier[]>("/api/suppliers");
  const { data: medicines } = useFetch<MedicineLite[]>("/api/medicines");

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseDraftItem[]>([
    { medicineId: "", quantity: 1, reason: "", batch: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const medById = useMemo(() => {
    const m = new Map<string, MedicineLite>();
    (medicines || []).forEach((med) => m.set(med.id, med));
    return m;
  }, [medicines]);

  const filteredMeds = useMemo(() => {
    if (!medicines) return [] as MedicineLite[];
    if (!supplierId) return medicines;
    return medicines.filter((m) => m.supplierId === supplierId);
  }, [medicines, supplierId]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const med = medById.get(it.medicineId);
      return sum + (Number(it.quantity) || 0) * (med?.purchasePrice || 0);
    }, 0);
  }, [items, medById]);

  const updateItem = (idx: number, patch: Partial<PurchaseDraftItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addItem = () =>
    setItems((p) => [...p, { medicineId: "", quantity: 1, reason: "", batch: "" }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const reset = () => {
    setSupplierId("");
    setNotes("");
    setItems([{ medicineId: "", quantity: 1, reason: "", batch: "" }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { toast.error("Please select a supplier"); return; }
    const valid = items.filter((i) => i.medicineId && Number(i.quantity) > 0);
    if (valid.length === 0) { toast.error("Add at least one item with quantity"); return; }
    setSaving(true);
    try {
      const body = {
        supplierId,
        notes,
        items: valid.map((i) => {
          const med = medById.get(i.medicineId);
          return {
            medicineId: i.medicineId,
            quantity: Number(i.quantity),
            unitPrice: med?.purchasePrice || 0,
            reason: i.reason || null,
            batch: i.batch || null,
          };
        }),
      };
      const res = await fetchAPI("/api/purchase-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create purchase return");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create purchase return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" /> Create Purchase Return
          </DialogTitle>
          <DialogDescription>
            Return purchased medicine to a supplier. Add multiple items with reasons and batch info.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {(suppliers || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Return Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-2 bg-muted/30 max-h-72 overflow-y-auto scrollbar-thin">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-4">
                    <Select
                      value={it.medicineId}
                      onValueChange={(v) => updateItem(idx, { medicineId: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredMeds.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}{m.strength ? ` · ${m.strength}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    className="col-span-3 sm:col-span-2 h-8 text-sm"
                    placeholder="Qty"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-5 sm:col-span-3 h-8 text-sm"
                    placeholder="Reason"
                    value={it.reason}
                    onChange={(e) => updateItem(idx, { reason: e.target.value })}
                  />
                  <Input
                    className="col-span-3 sm:col-span-2 h-8 text-sm"
                    placeholder="Batch no."
                    value={it.batch}
                    onChange={(e) => updateItem(idx, { batch: e.target.value })}
                  />
                  <div className="col-span-1 text-right text-sm font-medium tabular-nums">
                    {formatRs((Number(it.quantity) || 0) * (medById.get(it.medicineId)?.purchasePrice || 0))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 h-8 w-8 p-0 text-rose-500"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional notes for this return…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
              <span>Total Return Value</span>
              <span className="text-teal-700 dark:text-teal-400">{formatRs(totalAmount)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Creating…" : "Create Purchase Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ==================== CREATE SALES RETURN DIALOG ==================== */
function CreateSalesReturnDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: medicines } = useFetch<MedicineLite[]>("/api/medicines");

  const [patientRef, setPatientRef] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SalesDraftItem[]>([
    { medicineId: "", quantity: 1, reason: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const medById = useMemo(() => {
    const m = new Map<string, MedicineLite>();
    (medicines || []).forEach((med) => m.set(med.id, med));
    return m;
  }, [medicines]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const med = medById.get(it.medicineId);
      return sum + (Number(it.quantity) || 0) * (med?.salePrice || 0);
    }, 0);
  }, [items, medById]);

  const updateItem = (idx: number, patch: Partial<SalesDraftItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addItem = () =>
    setItems((p) => [...p, { medicineId: "", quantity: 1, reason: "" }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const reset = () => {
    setPatientRef("");
    setInvoiceRef("");
    setNotes("");
    setItems([{ medicineId: "", quantity: 1, reason: "" }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceRef.trim()) { toast.error("Please enter an invoice reference"); return; }
    const valid = items.filter((i) => i.medicineId && Number(i.quantity) > 0);
    if (valid.length === 0) { toast.error("Add at least one item with quantity"); return; }
    setSaving(true);
    try {
      const body = {
        patientRef: patientRef || null,
        invoiceRef,
        notes,
        items: valid.map((i) => {
          const med = medById.get(i.medicineId);
          return {
            medicineId: i.medicineId,
            quantity: Number(i.quantity),
            unitPrice: med?.salePrice || 0,
            reason: i.reason || null,
          };
        }),
      };
      const res = await fetchAPI("/api/sales-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create sales return");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create sales return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" /> Create Sales Return
          </DialogTitle>
          <DialogDescription>
            Record a return from a customer sale. Reference the original invoice and add returned medicines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Patient / Invoice reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient / Customer</Label>
              <Input
                value={patientRef}
                onChange={(e) => setPatientRef(e.target.value)}
                placeholder="Patient or customer name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Reference *</Label>
              <Input
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-20240101-001"
                required
              />
            </div>
          </div>

          {/* Items builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Return Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
                <Plus className="w-3 h-3" /> Add Item
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-2 bg-muted/30 max-h-72 overflow-y-auto scrollbar-thin">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-5">
                    <Select
                      value={it.medicineId}
                      onValueChange={(v) => updateItem(idx, { medicineId: v })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {(medicines || []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}{m.strength ? ` · ${m.strength}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    className="col-span-3 sm:col-span-2 h-8 text-sm"
                    placeholder="Qty"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-6 sm:col-span-4 h-8 text-sm"
                    placeholder="Reason for return"
                    value={it.reason}
                    onChange={(e) => updateItem(idx, { reason: e.target.value })}
                  />
                  <div className="col-span-2 sm:col-span-0 text-right text-sm font-medium tabular-nums hidden sm:block">
                    {formatRs((Number(it.quantity) || 0) * (medById.get(it.medicineId)?.salePrice || 0))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 h-8 w-8 p-0 text-rose-500"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional notes for this return…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
              <span>Total Return Value</span>
              <span className="text-teal-700 dark:text-teal-400">{formatRs(totalAmount)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Creating…" : "Create Sales Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
