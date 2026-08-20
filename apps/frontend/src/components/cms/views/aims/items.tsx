"use client";

import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Download, Package, DollarSign, AlertTriangle, CalendarClock, Snowflake, Pill,
  Pencil, Trash2,
} from "lucide-react";
import { formatRs, formatDate } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination, useSort } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface InventoryStock { id: string; quantity: number; reservedQty: number; damagedQty: number; location: { id: string; name: string; code: string } }
interface InventoryBatch { id: string; batchNo: string; expiryDate: string | null; quantity: number; purchasePrice: number; sellingPrice: number; supplierName: string | null; status: string }
interface InventoryItem {
  id: string; name: string; genericName: string | null; brandName: string | null;
  category: string; subCategory: string | null; type: string; dosage: string | null;
  form: string | null; unit: string; barcode: string | null; hsCode: string | null;
  drugClass: string | null; composition: string | null; route: string | null;
  schedule: string | null; controlledDrug: boolean; storageCondition: string | null;
  purchasePrice: number; sellingPrice: number; mrp: number; taxRate: number;
  reorderLevel: number; minStock: number; maxStock: number;
  rackNumber: string | null; shelfNumber: string | null; status: string;
  stocks: InventoryStock[]; batches: InventoryBatch[];
}

type ItemForm = {
  name: string; sku: string; category: string; unit: string;
  currentStock: string; minStock: string; maxStock: string;
  costPrice: string; sellingPrice: string;
  location: string; supplier: string; status: string; notes: string;
};

const EMPTY_FORM: ItemForm = {
  name: "", sku: "", category: "", unit: "",
  currentStock: "0", minStock: "0", maxStock: "500",
  costPrice: "0", sellingPrice: "0",
  location: "", supplier: "", status: "active", notes: "",
};

const TYPE_COLORS: Record<string, string> = {
  medicine: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  consumable: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  equipment: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

export function AimsItems() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const { data: items, loading } = useFetch<InventoryItem[]>(refreshKey ? `/api/inventory-items?_r=${refreshKey}` : "/api/inventory-items");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.toLowerCase();
    return items.filter(i => {
      if (q && !i.name.toLowerCase().includes(q) && !(i.genericName || "").toLowerCase().includes(q) && !(i.barcode || "").includes(q) && !(i.brandName || "").toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      return true;
    });
  }, [items, search, categoryFilter, typeFilter]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<InventoryItem>(filtered, "name");
  const pagination = usePagination<InventoryItem>(sorted, 10);

  const categories = useMemo(() => [...new Set(items?.map(i => i.category) || [])], [items]);

  const totalValue = (items || []).reduce((s, i) => s + i.purchasePrice * i.stocks.reduce((ss, st) => ss + st.quantity, 0), 0);
  const lowStockCount = (items || []).filter(i => {
    const qty = i.stocks.reduce((s, st) => s + st.quantity, 0);
    return qty <= i.reorderLevel && qty > 0;
  }).length;
  const nearExpiryCount = (items || []).reduce((s, i) => {
    const today = new Date();
    return s + i.batches.filter(b => b.expiryDate && new Date(b.expiryDate) > today && Math.floor((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000) <= 30).length;
  }, 0);

  const handleExport = () => {
    if (!sorted || sorted.length === 0) { toast.info("Nothing to export"); return; }
    exportToCSV("inventory-items", ["Name", "Generic", "Category", "Type", "Form", "Unit", "Barcode", "Stock", "Purchase Price", "Sale Price", "MRP", "Rack", "Shelf", "Status"],
      sorted.map(i => [i.name, i.genericName || "", i.category, i.type, i.form || "", i.unit, i.barcode || "", i.stocks.reduce((s, st) => s + st.quantity, 0), i.purchasePrice, i.sellingPrice, i.mrp, i.rackNumber || "", i.shelfNumber || "", i.status]));
    toast.success("Exported");
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const res = await fetchAPI(`/api/inventory-items/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`"${deleteItem.name}" deleted`);
      setDeleteItem(null);
      if (selected?.id === deleteItem.id) setSelected(null);
      refresh();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Item Master</h3>
          <p className="text-sm text-muted-foreground">{items?.length || 0} items · {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Items" value={items?.length || 0} icon={Package} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Inventory Value" value={formatRs(totalValue)} icon={DollarSign} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Low Stock" value={lowStockCount} icon={AlertTriangle} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Near Expiry" value={nearExpiryCount} icon={CalendarClock} accent="from-rose-500 to-rose-600" index={3} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name, generic, barcode, brand…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <SortHead label="Name" col="name" sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} />
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Location Stock</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Stock</TableHead>
                  <TableHead className="text-[11px] uppercase text-right hidden md:table-cell">Value</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Rack/Shelf</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paged.map((item) => {
                  const totalQty = item.stocks.reduce((s, st) => s + st.quantity, 0);
                  const stockPct = Math.min(100, (totalQty / item.maxStock) * 100);
                  const isLow = totalQty <= item.reorderLevel;
                  return (
                    <TableRow key={item.id} className="table-row-hover cursor-pointer" onClick={() => setSelected(item)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            {item.type === "medicine" ? <Pill className="w-4 h-4 text-teal-600" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.genericName || item.brandName || item.form}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={`text-[10px] ${TYPE_COLORS[item.type] || ""}`}>{item.type}</Badge></TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{item.category}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {item.stocks.slice(0, 3).map(s => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {s.location.code}: {s.quantity}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-sm font-semibold tabular-nums ${isLow ? "text-rose-600" : ""}`}>{totalQty}</span>
                          <Progress value={stockPct} className="w-16 h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums hidden md:table-cell">{formatRs(item.purchasePrice * totalQty)}</TableCell>
                      <TableCell className="text-xs font-mono hidden lg:table-cell">{item.rackNumber}/{item.shelfNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={`text-[10px] ${item.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                            {item.status}
                          </Badge>
                          {item.controlledDrug && <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">Ctrl</Badge>}
                          {item.storageCondition && item.storageCondition.includes("Cold") && <Snowflake className="w-3 h-3 text-cyan-500" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {pagination.total > 0 && <Pagination {...pagination} />}
          {pagination.total === 0 && <EmptyState icon={Package} title="No items found" description="Try adjusting your search or filters" />}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && (
            <ItemDetail
              item={selected}
              onEdit={(item) => { setSelected(null); setEditItem(item); }}
              onDelete={(item) => { setSelected(null); setDeleteItem(item); }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Item Dialog */}
      <ItemFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { setCreateOpen(false); refresh(); }} />

      {/* Edit Item Dialog */}
      {editItem && (
        <ItemFormDialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)} item={editItem} onSaved={() => { setEditItem(null); refresh(); }} />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteItem?.name}</strong> and all its stock/batch data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Item Form Dialog (Add / Edit) ---------- */

function ItemFormDialog({ open, onOpenChange, item, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: InventoryItem | null;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<ItemForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Reset form when target item changes
  const itemId = item?.id;
  const [lastItemId, setLastItemId] = useState<string | undefined>(itemId);
  if (itemId !== lastItemId) {
    setLastItemId(itemId);
    if (item) {
      const totalQty = item.stocks.reduce((s, st) => s + st.quantity, 0);
      setForm({
        name: item.name,
        sku: item.barcode || "",
        category: item.category,
        unit: item.unit,
        currentStock: String(totalQty),
        minStock: String(item.minStock),
        maxStock: String(item.maxStock),
        costPrice: String(item.purchasePrice),
        sellingPrice: String(item.sellingPrice),
        location: [item.rackNumber, item.shelfNumber].filter(Boolean).join("/"),
        supplier: item.batches[0]?.supplierName || "",
        status: item.status,
        notes: "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }

  const set = (k: keyof ItemForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, currentStock: Number(form.currentStock) || 0, minStock: Number(form.minStock) || 0, maxStock: Number(form.maxStock) || 0, costPrice: Number(form.costPrice) || 0, sellingPrice: Number(form.sellingPrice) || 0 };
      const res = isEdit
        ? await fetchAPI(`/api/inventory-items/${item!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetchAPI("/api/inventory-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      toast.success(isEdit ? "Item updated" : "Item created");
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update item" : "Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update inventory item details" : "Add a new item to inventory"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Paracetamol 500mg" />
          </div>
          <div className="space-y-1.5">
            <Label>SKU / Barcode</Label>
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="BAR-001234" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Analgesics" />
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Tablet" />
          </div>
          <div className="space-y-1.5">
            <Label>Current Stock</Label>
            <Input type="number" min="0" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Min Stock</Label>
            <Input type="number" min="0" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Max Stock</Label>
            <Input type="number" min="0" value={form.maxStock} onChange={(e) => set("maxStock", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cost Price</Label>
            <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Selling Price</Label>
            <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Location (Rack/Shelf)</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="A-03/02" />
          </div>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Supplier name" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional notes…" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? "Saving…" : isEdit ? "Update Item" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Detail Sheet ---------- */

function ItemDetail({ item, onEdit, onDelete }: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  const totalQty = item.stocks.reduce((s, st) => s + st.quantity, 0);
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shrink-0">
            {item.type === "medicine" ? <Pill className="w-6 h-6" /> : <Package className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg">{item.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{item.genericName || item.brandName} · {item.form} · {item.unit}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(item)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30" onClick={() => onDelete(item)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>
      </SheetHeader>
      <div className="p-6 space-y-4">
        {/* Stock by location */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Stock by Location</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {item.stocks.map(s => (
              <div key={s.id} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{s.location.name}</p>
                <p className="text-lg font-bold tabular-nums">{s.quantity}</p>
                <p className="text-[10px] text-muted-foreground">Reserved: {s.reservedQty} · Damaged: {s.damagedQty}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Total Stock</span>
              <span className="text-xl font-bold tabular-nums text-teal-700 dark:text-teal-400">{totalQty} {item.unit}</span>
            </div>
          </div>
        </div>

        {/* Batches */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Batches & Expiry</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {item.batches.map(b => {
              const today = new Date();
              const days = b.expiryDate ? Math.floor((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000) : null;
              return (
                <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs">{b.batchNo}</span>
                    <span className="text-xs text-muted-foreground ml-2">Qty: {b.quantity}</span>
                  </div>
                  <div className="text-right">
                    {b.expiryDate && <span className={`text-xs ${days !== null && days < 0 ? "text-red-600" : days !== null && days <= 30 ? "text-rose-600" : days !== null && days <= 60 ? "text-orange-600" : "text-emerald-600"}`}>
                      {formatDate(b.expiryDate)} ({days}d)
                    </span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {item.drugClass && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Drug Class</p><p className="font-medium">{item.drugClass}</p></div>}
          {item.composition && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Composition</p><p className="font-medium">{item.composition}</p></div>}
          {item.route && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Route</p><p className="font-medium">{item.route}</p></div>}
          {item.schedule && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Schedule</p><p className="font-medium">{item.schedule}</p></div>}
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Purchase Price</p><p className="font-medium">{formatRs(item.purchasePrice)}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Selling Price</p><p className="font-medium">{formatRs(item.sellingPrice)}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">MRP</p><p className="font-medium">{formatRs(item.mrp)}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Reorder Level</p><p className="font-medium">{item.reorderLevel}</p></div>
          {item.barcode && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Barcode</p><p className="font-mono text-xs">{item.barcode}</p></div>}
          {item.rackNumber && <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Location</p><p className="font-mono text-xs">{item.rackNumber}/{item.shelfNumber}</p></div>}
        </div>
      </div>
    </div>
  );
}

function SortHead({ label, col, sortKey, sortDir, toggleSort }: {
  label: string;
  col: keyof InventoryItem;
  sortKey: keyof InventoryItem | "";
  sortDir: "asc" | "desc";
  toggleSort: (k: keyof InventoryItem) => void;
}) {
  return (
    <TableHead className="text-[11px] uppercase">
      <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label} {sortKey === col && (sortDir === "asc" ? "↑" : "↓")}
      </button>
    </TableHead>
  );
}
