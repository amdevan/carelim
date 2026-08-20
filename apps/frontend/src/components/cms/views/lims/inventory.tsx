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
import { Progress } from "@/components/ui/progress";
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
  Search, Plus, Beaker, Pencil, Trash2, Download,
  AlertTriangle, CalendarClock, Wallet,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  category: string | null;
  batchNo: string | null;
  expiryDate: string | null;
  stockQty: number;
  reorderLevel: number;
  unit: string;
  unitPrice: number;
  supplierId: string | null;
  location: string | null;
  status: string;
  supplier: { id: string; name: string } | null;
}

const TYPE_BADGE: Record<string, string> = {
  reagent: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  chemical: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  kit: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  consumable: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  tube: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  slide: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const TYPE_CHIPS = [
  { key: "all", label: "All" },
  { key: "reagent", label: "Reagent" },
  { key: "chemical", label: "Chemical" },
  { key: "kit", label: "Kit" },
  { key: "consumable", label: "Consumable" },
  { key: "tube", label: "Tube" },
  { key: "slide", label: "Slide" },
];

const TYPES = ["reagent", "chemical", "kit", "consumable", "tube", "slide"];

type InvFormState = {
  name: string;
  type: string;
  category: string;
  batchNo: string;
  expiryDate: string;
  stockQty: string;
  reorderLevel: string;
  unit: string;
  unitPrice: string;
  location: string;
  status: string;
};

const EMPTY_FORM: InvFormState = {
  name: "",
  type: "reagent",
  category: "",
  batchNo: "",
  expiryDate: "",
  stockQty: "",
  reorderLevel: "20",
  unit: "unit",
  unitPrice: "",
  location: "",
  status: "active",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function toDateInputValue(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export function LimsInventory() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<InventoryItem[]>(`/api/lab-inventory?_r=${refresh}`);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const items = data ?? [];

  const stats = useMemo(() => {
    const stockValue = items.reduce((sum, i) => sum + i.stockQty * i.unitPrice, 0);
    const lowStock = items.filter((i) => i.stockQty <= i.reorderLevel).length;
    const expiringSoon = items.filter((i) => {
      const d = daysUntil(i.expiryDate);
      return d != null && d >= 0 && d <= 60;
    }).length;
    return { total: items.length, stockValue, lowStock, expiringSoon };
  }, [items]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return items.filter((i) => {
      const matchesQ =
        !ql ||
        i.name.toLowerCase().includes(ql) ||
        (i.batchNo || "").toLowerCase().includes(ql) ||
        (i.category || "").toLowerCase().includes(ql) ||
        (i.location || "").toLowerCase().includes(ql);
      const matchesType = typeFilter === "all" || i.type === typeFilter;
      return matchesQ && matchesType;
    });
  }, [items, q, typeFilter]);

  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<InventoryItem>(filtered, 10);

  useEffect(() => {
    setPage(1);
  }, [q, typeFilter, setPage]);

  const handleExport = () => {
    if (items.length === 0) {
      toast.error("No inventory items to export");
      return;
    }
    const headers = [
      "Name", "Type", "Category", "Batch", "Expiry", "Stock", "Reorder",
      "Unit", "Price", "Supplier", "Location", "Status",
    ];
    const rows = filtered.map((i) => [
      i.name,
      i.type,
      i.category || "",
      i.batchNo || "",
      i.expiryDate ? formatDate(i.expiryDate) : "",
      i.stockQty,
      i.reorderLevel,
      i.unit,
      i.unitPrice,
      i.supplier?.name || "",
      i.location || "",
      i.status,
    ]);
    exportToCSV("lab-inventory.csv", headers, rows);
    toast.success(`Exported ${rows.length} item(s) to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Beaker className="w-5 h-5 text-teal-600" />
            Lab Inventory
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} item{stats.total === 1 ? "" : "s"} in stock · Stock value{" "}
            <span className="font-semibold text-teal-700 dark:text-teal-300">{formatRs(stats.stockValue)}</span>
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
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Items" value={stats.total} icon={Beaker} accent="from-teal-500 to-teal-600" />
        <StatCard label="Stock Value" value={stats.stockValue} icon={Wallet} accent="from-emerald-500 to-emerald-600" isCurrency />
        <StatCard label="Low Stock" value={stats.lowStock} icon={AlertTriangle} accent="from-amber-500 to-orange-500" />
        <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={CalendarClock} accent="from-rose-500 to-rose-600" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, batch, category, or location…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_CHIPS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setTypeFilter(c.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    typeFilter === c.key
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                  <span className="ml-1 opacity-70">
                    ({c.key === "all" ? items.length : items.filter((i) => i.type === c.key).length})
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
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Batch</TableHead>
                  <TableHead className="hidden sm:table-cell">Expiry</TableHead>
                  <TableHead className="min-w-[120px]">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit Price</TableHead>
                  <TableHead className="hidden xl:table-cell">Supplier</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
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
                      <Beaker className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((i) => {
                    const days = daysUntil(i.expiryDate);
                    const isExpired = days != null && days < 0;
                    const isExpiring60 = days != null && days >= 0 && days <= 60;
                    const isExpiring90 = days != null && days > 60 && days <= 90;
                    const isLowStock = i.stockQty <= i.reorderLevel;
                    const stockPct = Math.min(
                      100,
                      Math.round((i.stockQty / Math.max(1, i.reorderLevel * 2)) * 100),
                    );
                    return (
                      <TableRow
                        key={i.id}
                        className={isLowStock ? "bg-rose-50/40 dark:bg-rose-950/10" : ""}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{i.name}</div>
                          <div className="text-[11px] text-muted-foreground">{i.unit}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={`text-[10px] capitalize ${TYPE_BADGE[i.type] || ""}`}>
                            {i.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {i.category || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {i.batchNo || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {i.expiryDate ? (
                            <div>
                              <div
                                className={`text-xs font-medium ${
                                  isExpired || isExpiring60
                                    ? "text-rose-600"
                                    : isExpiring90
                                    ? "text-amber-600"
                                    : ""
                                }`}
                              >
                                {formatDate(i.expiryDate)}
                              </div>
                              {(isExpiring60 || isExpiring90) && (
                                <div
                                  className={`text-[10px] ${
                                    isExpiring60 ? "text-rose-500" : "text-amber-500"
                                  }`}
                                >
                                  {days}d left
                                </div>
                              )}
                              {isExpired && (
                                <div className="text-[10px] text-rose-500">expired</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[100px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className={isLowStock ? "text-rose-600 font-semibold" : ""}>
                                {i.stockQty}
                              </span>
                              <span className="text-muted-foreground">/ {i.reorderLevel}</span>
                            </div>
                            <Progress
                              value={stockPct}
                              className={`h-1.5 ${
                                isLowStock
                                  ? "[&>[data-slot=progress-indicator]]:bg-rose-500"
                                  : "[&>[data-slot=progress-indicator]]:bg-teal-500"
                              }`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {formatRs(i.unitPrice)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {i.supplier?.name || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {i.location || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            className={`text-[10px] ${statusColors[i.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {statusLabel(i.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditItem(i)}
                              title="Edit item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteItem(i)}
                              title="Delete item"
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

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => {
          setAddOpen(false);
          setRefresh((r) => r + 1);
        }}
      />

      <EditItemDialog
        item={editItem}
        open={!!editItem}
        onOpenChange={(v) => { if (!v) setEditItem(null); }}
        onSaved={() => {
          setEditItem(null);
          setRefresh((r) => r + 1);
        }}
      />

      <DeleteItemDialog
        item={deleteItem}
        open={!!deleteItem}
        onOpenChange={(v) => { if (!v) setDeleteItem(null); }}
        onDeleted={() => {
          setDeleteItem(null);
          setRefresh((r) => r + 1);
        }}
      />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent, isCurrency,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  isCurrency?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {isCurrency ? formatRs(value) : value}
              </p>
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

function InventoryFormFields({
  form, setForm,
}: {
  form: InvFormState;
  setForm: React.Dispatch<React.SetStateAction<InvFormState>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Name *</Label>
        <Input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Hemoglobin Reagent"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Chemistry"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Batch No</Label>
        <Input
          value={form.batchNo}
          onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
          placeholder="BT-2024-01"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Expiry Date</Label>
        <Input
          type="date"
          value={form.expiryDate}
          onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Stock Qty</Label>
        <Input
          type="number"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
          placeholder="100"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Reorder Level</Label>
        <Input
          type="number"
          value={form.reorderLevel}
          onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
          placeholder="20"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Unit</Label>
        <Input
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          placeholder="ml / vial / box"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Unit Price (Rs)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.unitPrice}
          onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
          placeholder="250.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Location</Label>
        <Input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Shelf A-3"
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

function buildPayload(form: InvFormState) {
  return {
    name: form.name,
    type: form.type,
    category: form.category || null,
    batchNo: form.batchNo || null,
    expiryDate: form.expiryDate || null,
    stockQty: Number(form.stockQty) || 0,
    reorderLevel: Number(form.reorderLevel) || 0,
    unit: form.unit || "unit",
    unitPrice: Number(form.unitPrice) || 0,
    location: form.location || null,
    status: form.status,
  };
}

function AddItemDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<InvFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reset = () => setForm(EMPTY_FORM);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) throw new Error("Failed to add item");
      toast.success(`Item "${form.name}" added`);
      onCreated();
      reset();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Register a new reagent, kit, chemical, or consumable in the lab inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <InventoryFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? "Saving…" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({
  item, open, onOpenChange, onSaved,
}: {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<InvFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      setForm({
        name: item.name,
        type: item.type,
        category: item.category || "",
        batchNo: item.batchNo || "",
        expiryDate: toDateInputValue(item.expiryDate),
        stockQty: String(item.stockQty),
        reorderLevel: String(item.reorderLevel),
        unit: item.unit,
        unitPrice: String(item.unitPrice),
        location: item.location || "",
        status: item.status,
      });
    }
  }, [item, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) throw new Error("Failed to update item");
      toast.success("Item updated");
      onSaved();
    } catch {
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update details for{" "}
            <span className="font-medium text-foreground">{item?.name}</span>
            {item?.batchNo && (
              <> (batch <span className="font-mono text-xs">{item.batchNo}</span>)</>
            )}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <InventoryFormFields form={form} setForm={setForm} />
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

function DeleteItemDialog({
  item, open, onOpenChange, onDeleted,
}: {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!item) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/lab-inventory/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success(`Item "${item.name}" deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong className="text-foreground">{item?.name}</strong>
            {item?.batchNo && (
              <> (batch <span className="font-mono">{item.batchNo}</span>)</>
            )}{" "}
            from the lab inventory. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {deleting ? "Deleting…" : "Delete Item"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
