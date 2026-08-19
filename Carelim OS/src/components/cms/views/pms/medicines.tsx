"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { usePagination, useSort } from "@/lib/use-pagination";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { Pagination } from "@/components/cms/pagination";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Pill, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Pencil, Trash2, Eye, Barcode, Boxes, Snowflake, ShieldAlert,
  Wallet, AlertTriangle, CalendarClock, Printer, SlidersHorizontal,
  Package, History, ShoppingCart, Truck,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ---------- Types ---------- */

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
}

interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  category: string;
  therapeuticClass: string | null;
  manufacturer: string | null;
  supplierId: string | null;
  hsn: string | null;
  barcode: string | null;
  batchNo: string;
  expiryDate: string;
  manufactureDate: string | null;
  storageCondition: string | null;
  rackNumber: string | null;
  shelfNumber: string | null;
  location: string | null;
  purchasePrice: number;
  unitPrice: number;
  mrp: number;
  salePrice: number;
  wholesalePrice: number;
  discountPct: number;
  taxRate: number;
  stockQty: number;
  reorderLevel: number;
  minStock: number;
  maxStock: number;
  reservedStock: number;
  openingStock: number;
  status: string;
  prescriptionRequired: boolean;
  controlledDrug: boolean;
  narcotic: boolean;
  coldChain: boolean;
  imageUrl: string | null;
  supplier: Supplier | null;
}

interface MedicineBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  manufactureDate: string | null;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  receivedDate: string;
  status: string;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: string;
}

/* ---------- Constants ---------- */

const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Inhaler", "Powder", "Cream", "Gel", "Suspension"];
const CATEGORIES = ["General", "Antibiotic", "Analgesic", "Antacid", "Antihistamine", "Cardiac", "Diabetic", "Vitamin", "Dermatology", "Respiratory", "Gastrointestinal"];
const STORAGE_CONDITIONS = ["Room Temperature", "Cold Chain", "Refrigerated", "Frozen", "Cool Dry"];
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "out-of-stock", label: "Out of Stock" },
];
const STORAGE_OPTIONS = [
  { value: "all", label: "All Storage" },
  { value: "Room Temperature", label: "Room Temperature" },
  { value: "Cold Chain", label: "Cold Chain" },
];

/* ---------- Helpers ---------- */

function toDateInputValue(d: string | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function daysUntil(d: string | Date) {
  const ms = new Date(d).getTime() - Date.now();
  return Math.floor(ms / 86400000);
}

function escapeHTML(s: unknown) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/* ---------- Skeleton ---------- */

function MedicinesSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Card className="border-border/60">
        <CardContent className="p-0">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 m-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function PmsMedicines() {
  const [refresh, setRefresh] = useState(0);
  const url = refresh ? `/api/medicines?_r=${refresh}` : "/api/medicines";
  const { data: medicines, loading } = useFetch<Medicine[]>(url);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");

  const [selected, setSelected] = useState<Medicine | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteMed, setDeleteMed] = useState<Medicine | null>(null);
  const [adjustMed, setAdjustMed] = useState<Medicine | null>(null);

  /* ---- Filtering ---- */
  const filtered = useMemo(() => {
    if (!medicines) return [];
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (q) {
        const hay = [m.name, m.genericName, m.barcode, m.batchNo, m.hsn, m.id].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "out-of-stock") {
          if (m.stockQty !== 0) return false;
        } else if (m.status !== statusFilter) return false;
      }
      if (storageFilter !== "all") {
        if (storageFilter === "Cold Chain" && !m.coldChain) return false;
        if (storageFilter === "Room Temperature" && m.coldChain) return false;
      }
      return true;
    });
  }, [medicines, search, categoryFilter, statusFilter, storageFilter]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<Medicine>(filtered, "name");
  const pagination = usePagination<Medicine>(sorted, 10);

  /* Reset page when filters change */
  useEffect(() => {
    pagination.setPage(1);
  }, [search, categoryFilter, statusFilter, storageFilter]);

  /* ---- Stats ---- */
  const stats = useMemo(() => {
    if (!medicines) return { total: 0, value: 0, low: 0, expiring: 0 };
    const today = Date.now();
    return medicines.reduce(
      (acc, m) => {
        acc.total += 1;
        acc.value += m.purchasePrice * m.stockQty;
        if (m.stockQty <= m.reorderLevel) acc.low += 1;
        const days = Math.floor((new Date(m.expiryDate).getTime() - today) / 86400000);
        if (days >= 0 && days <= 30) acc.expiring += 1;
        return acc;
      },
      { total: 0, value: 0, low: 0, expiring: 0 }
    );
  }, [medicines]);

  /* ---- Actions ---- */
  const doRefresh = () => setRefresh((r) => r + 1);

  const handleExport = () => {
    if (!sorted || sorted.length === 0) {
      toast.info("No medicines to export");
      return;
    }
    const headers = ["Name", "Generic", "Strength", "Category", "Manufacturer", "Batch", "Expiry", "Stock", "Purchase Price", "Sale Price", "MRP", "Supplier", "Status"];
    const rows = sorted.map((m) => [
      m.name, m.genericName || "", m.strength || "", m.category, m.manufacturer || "",
      m.batchNo, formatDate(m.expiryDate), m.stockQty,
      m.purchasePrice, m.salePrice, m.mrp, m.supplier?.name || "", m.status,
    ]);
    exportToCSV("medicines.csv", headers, rows);
    toast.success(`Exported ${rows.length} medicines`);
  };

  const openSheet = (m: Medicine) => {
    setSelected(m);
    setSheetOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteMed) return;
    try {
      const res = await fetchAPI(`/api/medicines/${deleteMed.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Medicine "${deleteMed.name}" deleted`);
      setDeleteMed(null);
      doRefresh();
    } catch {
      toast.error("Failed to delete medicine");
    }
  };

  /* ---- Loading ---- */
  if (loading) return <MedicinesSkeleton />;

  /* ---------- Render ---------- */
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
              <Pill className="w-4.5 h-4.5" />
            </span>
            Medicine Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {medicines?.length ?? 0} medicines in catalog · {sorted.length} matching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Medicines" value={stats.total} icon={Pill} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Inventory Value" value={formatRs(stats.value)} icon={Wallet} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Low Stock" value={stats.low} icon={AlertTriangle} accent="from-amber-500 to-amber-600" index={2} />
        <KpiCard label="Near Expiry 30d" value={stats.expiring} icon={CalendarClock} accent="from-rose-500 to-rose-600" index={3} />
      </div>

      {/* Advanced search bar */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative lg:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name/generic/barcode/batch/HSN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full"><SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Storage" /></SelectTrigger>
              <SelectContent>
                {STORAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHeader label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("name")} className="min-w-[200px]" />
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Manufacturer</TableHead>
                  <SortableHeader label="Batch" k="batchNo" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("batchNo")} />
                  <SortableHeader label="Expiry" k="expiryDate" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("expiryDate")} />
                  <SortableHeader label="Stock" k="stockQty" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("stockQty")} className="min-w-[120px]" />
                  <SortableHeader label="Sale" k="salePrice" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("salePrice")} className="hidden lg:table-cell" />
                  <TableHead className="hidden lg:table-cell">Margin</TableHead>
                  <TableHead className="hidden xl:table-cell">Badges</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <EmptyState icon={Pill} title="No medicines found" description="Try adjusting your search or filters." />
                    </TableCell>
                  </TableRow>
                )}
                {pagination.paged.map((m) => {
                  const days = daysUntil(m.expiryDate);
                  const isExpired = days < 0;
                  const is7 = days >= 0 && days <= 7;
                  const is30 = days > 7 && days <= 30;
                  const isLow = m.stockQty <= m.reorderLevel;
                  const isOut = m.stockQty === 0;
                  const margin = m.purchasePrice > 0
                    ? ((m.salePrice - m.purchasePrice) / m.purchasePrice) * 100
                    : 0;
                  const stockPct = m.maxStock > 0 ? Math.min(100, (m.stockQty / m.maxStock) * 100) : 0;
                  return (
                    <TableRow
                      key={m.id}
                      onClick={() => openSheet(m)}
                      className={`cursor-pointer ${isOut ? "bg-rose-50/60 dark:bg-rose-950/20" : isLow ? "bg-rose-50/40 dark:bg-rose-950/10" : ""}`}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{m.name}</div>
                        {m.genericName && (
                          <div className="text-[11px] text-muted-foreground">{m.genericName}{m.strength ? ` · ${m.strength}` : ""}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{m.manufacturer || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{m.batchNo}</TableCell>
                      <TableCell>
                        <div className={`text-xs font-medium ${isExpired ? "text-red-600 dark:text-red-400" : is7 ? "text-rose-600 dark:text-rose-400" : is30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {formatDate(m.expiryDate)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {isExpired ? `${Math.abs(days)}d expired` : `${days}d left`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[80px]">
                            <Progress
                              value={stockPct}
                              className={`h-1.5 ${isLow ? "[&>[data-slot=progress-indicator]]:bg-rose-500" : ""}`}
                            />
                          </div>
                          <div className="text-xs tabular-nums shrink-0">
                            <span className="font-semibold">{m.stockQty}</span>
                            <span className="text-muted-foreground">/{m.reorderLevel}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell tabular-nums text-sm">{formatRs(m.salePrice)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className={`text-xs font-semibold ${margin >= 30 ? "text-emerald-600 dark:text-emerald-400" : margin >= 10 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {m.prescriptionRequired && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-violet-300 text-violet-700 dark:text-violet-300">Rx</Badge>}
                          {m.coldChain && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-cyan-300 text-cyan-700 dark:text-cyan-300">Cold</Badge>}
                          {m.controlledDrug && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-rose-300 text-rose-700 dark:text-rose-300">Ctrl</Badge>}
                          {m.narcotic && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-300 text-amber-700 dark:text-amber-300">Narc</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[m.status] || ""}`}>{statusLabel(m.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSheet(m)} title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMed(m)} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => setDeleteMed(m)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <MedicineDetailSheet
        medicine={selected}
        open={sheetOpen}
        onOpenChange={(o) => { setSheetOpen(o); if (!o) setSelected(null); }}
        onEdit={(m) => { setSheetOpen(false); setSelected(null); setEditMed(m); }}
        onAdjust={(m) => { setSheetOpen(false); setSelected(null); setAdjustMed(m); }}
        onDelete={(m) => { setSheetOpen(false); setSelected(null); setDeleteMed(m); }}
        onChanged={doRefresh}
      />

      {/* Add dialog */}
      <MedicineFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onChanged={doRefresh}
      />

      {/* Edit dialog */}
      <MedicineFormDialog
        medicine={editMed}
        open={!!editMed}
        onOpenChange={(o) => { if (!o) setEditMed(null); }}
        onChanged={doRefresh}
      />

      {/* Adjust stock dialog */}
      <AdjustStockDialog
        medicine={adjustMed}
        open={!!adjustMed}
        onOpenChange={(o) => { if (!o) setAdjustMed(null); }}
        onChanged={doRefresh}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteMed} onOpenChange={(o) => { if (!o) setDeleteMed(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteMed?.name}</strong> (batch {deleteMed?.batchNo}) from the catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
            >
              Delete Medicine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Sortable Header ---------- */

interface SortHeaderProps {
  label: string;
  k: keyof Medicine;
  sortKey: keyof Medicine | "";
  sortDir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}

function SortableHeader({ label, k, sortKey, sortDir, onClick, className }: SortHeaderProps) {
  const active = sortKey === k;
  return (
    <TableHead className={className}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-teal-700 dark:hover:text-teal-300 ${active ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"}`}
      >
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
      </button>
    </TableHead>
  );
}

/* ---------- Detail Sheet ---------- */

interface DetailSheetProps {
  medicine: Medicine | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (m: Medicine) => void;
  onAdjust: (m: Medicine) => void;
  onDelete: (m: Medicine) => void;
  onChanged: () => void;
}

function MedicineDetailSheet({ medicine, open, onOpenChange, onEdit, onAdjust, onDelete, onChanged }: DetailSheetProps) {
  const [tab, setTab] = useState("overview");

  // Lazy-fetches only when sheet opens
  const { data: batches, loading: batchesLoading } = useFetch<MedicineBatch[]>(
    open && medicine ? `/api/medicine-batches?medicineId=${medicine.id}` : null
  );
  const { data: movements, loading: movementsLoading } = useFetch<StockMovement[]>(
    open && medicine ? `/api/stock-movements?medicineId=${medicine.id}` : null
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setTab("overview");
  }, [open, medicine?.id]);

  if (!medicine) return null;

  const margin = medicine.purchasePrice > 0
    ? ((medicine.salePrice - medicine.purchasePrice) / medicine.purchasePrice) * 100
    : 0;
  const available = medicine.stockQty - medicine.reservedStock;
  const days = daysUntil(medicine.expiryDate);

  const handlePrintBarcode = () => {
    const body = `${docHeader(medicine.batchNo, "BARCODE LABEL", formatDate(medicine.expiryDate))}
      <div style="text-align:center; margin-top: 24px;">
        <h2 style="color:#0d9488; font-size:20px; margin-bottom:6px;">${escapeHTML(medicine.name)}</h2>
        <p style="color:#475569; font-size:13px;">${escapeHTML(medicine.genericName || "")} · ${escapeHTML(medicine.strength || "")}</p>
        <div style="display:inline-block; margin: 18px auto; padding: 14px 24px; border: 2px dashed #0d9488; border-radius: 10px; background:#f0fdfa;">
          <div style="font-family: 'Courier New', monospace; font-size: 32px; letter-spacing: 4px; color:#1a2e35;">${escapeHTML(medicine.barcode || medicine.hsn || medicine.batchNo)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px;">${escapeHTML(medicine.barcode || "No barcode assigned")}</div>
        </div>
        <table style="margin: 18px auto; width: 80%; font-size: 13px;">
          <tr><td style="text-align:left; padding: 4px 8px; color:#64748b;">Batch No:</td><td style="text-align:left; padding: 4px 8px; font-weight:bold;">${escapeHTML(medicine.batchNo)}</td></tr>
          <tr><td style="text-align:left; padding: 4px 8px; color:#64748b;">Expiry Date:</td><td style="text-align:left; padding: 4px 8px; font-weight:bold;">${escapeHTML(formatDate(medicine.expiryDate))}</td></tr>
          <tr><td style="text-align:left; padding: 4px 8px; color:#64748b;">MRP:</td><td style="text-align:left; padding: 4px 8px; font-weight:bold; color:#0d9488;">Rs. ${escapeHTML(medicine.mrp.toFixed(2))}</td></tr>
          <tr><td style="text-align:left; padding: 4px 8px; color:#64748b;">HSN:</td><td style="text-align:left; padding: 4px 8px;">${escapeHTML(medicine.hsn || "—")}</td></tr>
        </table>
      </div>`;
    printHTML(`Barcode — ${medicine.name}`, body);
    toast.success("Barcode label sent to print");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">{medicine.name}</SheetTitle>
              <SheetDescription className="text-sm">
                {medicine.genericName}{medicine.strength ? ` · ${medicine.strength}` : ""} · {medicine.dosageForm || "—"}
              </SheetDescription>
            </div>
            <Badge variant="outline" className={`text-[10px] ${statusColors[medicine.status] || ""}`}>{statusLabel(medicine.status)}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {medicine.prescriptionRequired && <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-700 dark:text-violet-300 gap-1"><ShieldAlert className="w-3 h-3" /> Rx Required</Badge>}
            {medicine.coldChain && <Badge variant="outline" className="text-[10px] border-cyan-300 text-cyan-700 dark:text-cyan-300 gap-1"><Snowflake className="w-3 h-3" /> Cold Chain</Badge>}
            {medicine.controlledDrug && <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 dark:text-rose-300">Controlled</Badge>}
            {medicine.narcotic && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300">Narcotic</Badge>}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(medicine)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onAdjust(medicine)}><SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Stock</Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintBarcode}><Printer className="w-3.5 h-3.5" /> Barcode</Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300" onClick={() => onDelete(medicine)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete Medicine
          </Button>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full mb-2">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
            <TabsTrigger value="batches" className="text-xs">Batches</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="movements" className="text-xs">Stock Movement</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Sales / Purchase</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-2">
            <DetailGrid medicine={medicine} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <InfoTile label="Current Stock" value={medicine.stockQty} icon={Boxes} accent="text-teal-600" />
              <InfoTile label="Reserved" value={medicine.reservedStock} icon={ShieldAlert} accent="text-amber-600" />
              <InfoTile label="Available" value={available} icon={Package} accent="text-emerald-600" />
              <InfoTile label="Reorder Level" value={medicine.reorderLevel} icon={AlertTriangle} accent="text-amber-600" />
              <InfoTile label="Min Stock" value={medicine.minStock} icon={Package} accent="text-rose-600" />
              <InfoTile label="Max Stock" value={medicine.maxStock} icon={Package} accent="text-emerald-600" />
              <InfoTile label="Opening Stock" value={medicine.openingStock} icon={History} accent="text-muted-foreground" />
              <InfoTile label="Stock Value" value={formatRs(medicine.purchasePrice * medicine.stockQty)} icon={Wallet} accent="text-emerald-600" />
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stock Health</p>
              <Progress value={medicine.maxStock > 0 ? Math.min(100, (medicine.stockQty / medicine.maxStock) * 100) : 0} className={`h-2 ${medicine.stockQty <= medicine.reorderLevel ? "[&>[data-slot=progress-indicator]]:bg-rose-500" : ""}`} />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>0</span>
                <span>Reorder: {medicine.reorderLevel}</span>
                <span>Max: {medicine.maxStock}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Storage Location</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Storage:</span><span>{medicine.storageCondition || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rack:</span><span>{medicine.rackNumber || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shelf:</span><span>{medicine.shelfNumber || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location:</span><span>{medicine.location || "—"}</span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batches" className="space-y-2 mt-2">
            {batchesLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : batches && batches.length > 0 ? (
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-teal-700 dark:text-teal-300">{b.batchNo}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[b.status] || ""}`}>{statusLabel(b.status)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <div>Expiry: <span className={`font-medium ${daysUntil(b.expiryDate) < 0 ? "text-red-600" : daysUntil(b.expiryDate) <= 30 ? "text-amber-600" : "text-foreground"}`}>{formatDate(b.expiryDate)}</span></div>
                      <div>Qty: <span className="font-medium text-foreground">{b.quantity}</span></div>
                      <div>MRP: <span className="font-medium text-foreground">{formatRs(b.mrp)}</span></div>
                      <div>Sale: <span className="font-medium text-foreground">{formatRs(b.salePrice)}</span></div>
                      <div className="col-span-2">Received: {formatDate(b.receivedDate)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Boxes} title="No batches" description="This medicine has no batch records." className="py-6" />
            )}
          </TabsContent>

          <TabsContent value="movements" className="space-y-2 mt-2">
            {movementsLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : movements && movements.length > 0 ? (
              <div className="space-y-1.5">
                {movements.slice(0, 30).map((mv) => (
                  <div key={mv.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/60 text-xs">
                    <div className={`w-1 h-8 rounded-full ${mv.quantity >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium capitalize">{mv.type}</span>
                        <span className={`tabular-nums font-semibold ${mv.quantity >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {mv.quantity >= 0 ? "+" : ""}{mv.quantity}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {mv.reference || "—"} · {mv.notes || "no notes"} · by {mv.performedBy || "system"} · {formatDate(mv.createdAt)}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground shrink-0">
                      Bal<br /><span className="font-semibold text-foreground tabular-nums">{mv.balanceAfter}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={History} title="No stock movements" description="No stock adjustments recorded for this medicine." className="py-6" />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-2">
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-cyan-600" /> Sales History</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>Sales records are derived from <code className="font-mono">PharmacySaleItem</code>. Use the Billing view for the complete invoice trail. This medicine has been sold <strong>{0}</strong> times this month.</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-violet-600" /> Purchase History</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>Purchase records are derived from <code className="font-mono">PurchaseOrderItem</code>. Use the Inventory view for the full PO trail. Last received: <strong>{medicine.manufactureDate ? formatDate(medicine.manufactureDate) : "—"}</strong>.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function DetailGrid({ medicine }: { medicine: Medicine }) {
  const margin = medicine.purchasePrice > 0
    ? ((medicine.salePrice - medicine.purchasePrice) / medicine.purchasePrice) * 100
    : 0;
  const days = daysUntil(medicine.expiryDate);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoTile label="Generic Name" value={medicine.genericName || "—"} />
        <InfoTile label="Strength" value={medicine.strength || "—"} />
        <InfoTile label="Dosage Form" value={medicine.dosageForm || "—"} />
        <InfoTile label="Category" value={medicine.category} />
        <InfoTile label="Therapeutic Class" value={medicine.therapeuticClass || "—"} />
        <InfoTile label="Manufacturer" value={medicine.manufacturer || "—"} />
        <InfoTile label="Supplier" value={medicine.supplier?.name || "—"} />
        <InfoTile label="HSN / SKU" value={medicine.hsn || "—"} />
        <InfoTile label="Barcode" value={medicine.barcode || "—"} mono />
        <InfoTile label="Batch No" value={medicine.batchNo} mono />
        <InfoTile label="Expiry Date" value={formatDate(medicine.expiryDate)} accent={days < 0 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-emerald-600"} />
        <InfoTile label="Manufactured" value={medicine.manufactureDate ? formatDate(medicine.manufactureDate) : "—"} />
      </div>

      <div className="rounded-lg border border-border/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pricing</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <PriceRow label="Purchase" value={formatRs(medicine.purchasePrice)} />
          <PriceRow label="MRP" value={formatRs(medicine.mrp)} />
          <PriceRow label="Sale" value={formatRs(medicine.salePrice)} accent="text-teal-600" />
          <PriceRow label="Wholesale" value={formatRs(medicine.wholesalePrice)} />
          <PriceRow label="Discount %" value={`${medicine.discountPct}%`} />
          <PriceRow label="Tax Rate" value={`${medicine.taxRate}%`} />
          <PriceRow label="Margin" value={`${margin.toFixed(1)}%`} accent={margin >= 30 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-rose-600"} />
          <PriceRow label="Unit Price" value={formatRs(medicine.unitPrice)} />
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, icon: Icon, accent = "text-foreground", mono }: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={`text-sm font-semibold mt-0.5 ${accent} ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function PriceRow({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}

/* ---------- Form Dialog (Add / Edit) ---------- */

interface FormDialogProps {
  medicine?: Medicine | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

const EMPTY_FORM = {
  name: "", genericName: "", strength: "", dosageForm: "Tablet", category: "General",
  therapeuticClass: "", manufacturer: "", supplierId: "", hsn: "", barcode: "", batchNo: "",
  expiryDate: "", manufactureDate: "", storageCondition: "Room Temperature",
  rackNumber: "", shelfNumber: "",
  purchasePrice: "0", mrp: "0", salePrice: "0", wholesalePrice: "0",
  discountPct: "0", taxRate: "0",
  stockQty: "0", reorderLevel: "20", minStock: "10", maxStock: "500",
  prescriptionRequired: false, controlledDrug: false, narcotic: false, coldChain: false,
};

function MedicineFormDialog({ medicine, open, onOpenChange, onChanged }: FormDialogProps) {
  const { data: suppliers } = useFetch<Supplier[]>("/api/suppliers");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicine) {
      setForm({
        name: medicine.name || "",
        genericName: medicine.genericName || "",
        strength: medicine.strength || "",
        dosageForm: medicine.dosageForm || "Tablet",
        category: medicine.category || "General",
        therapeuticClass: medicine.therapeuticClass || "",
        manufacturer: medicine.manufacturer || "",
        supplierId: medicine.supplierId || "",
        hsn: medicine.hsn || "",
        barcode: medicine.barcode || "",
        batchNo: medicine.batchNo || "",
        expiryDate: toDateInputValue(medicine.expiryDate),
        manufactureDate: toDateInputValue(medicine.manufactureDate),
        storageCondition: medicine.storageCondition || "Room Temperature",
        rackNumber: medicine.rackNumber || "",
        shelfNumber: medicine.shelfNumber || "",
        purchasePrice: String(medicine.purchasePrice ?? 0),
        mrp: String(medicine.mrp ?? 0),
        salePrice: String(medicine.salePrice ?? 0),
        wholesalePrice: String(medicine.wholesalePrice ?? 0),
        discountPct: String(medicine.discountPct ?? 0),
        taxRate: String(medicine.taxRate ?? 0),
        stockQty: String(medicine.stockQty ?? 0),
        reorderLevel: String(medicine.reorderLevel ?? 20),
        minStock: String(medicine.minStock ?? 10),
        maxStock: String(medicine.maxStock ?? 500),
        prescriptionRequired: !!medicine.prescriptionRequired,
        controlledDrug: !!medicine.controlledDrug,
        narcotic: !!medicine.narcotic,
        coldChain: !!medicine.coldChain,
      });
    } else if (open) {
      setForm(EMPTY_FORM);
    }
  }, [medicine, open]);

  const update = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.batchNo || !form.expiryDate) {
      toast.error("Name, batch number, and expiry date are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      genericName: form.genericName || null,
      strength: form.strength || null,
      dosageForm: form.dosageForm,
      category: form.category,
      therapeuticClass: form.therapeuticClass || null,
      manufacturer: form.manufacturer || null,
      supplierId: form.supplierId || null,
      hsn: form.hsn || null,
      barcode: form.barcode || null,
      batchNo: form.batchNo,
      expiryDate: form.expiryDate,
      manufactureDate: form.manufactureDate || null,
      storageCondition: form.storageCondition,
      rackNumber: form.rackNumber || null,
      shelfNumber: form.shelfNumber || null,
      purchasePrice: Number(form.purchasePrice) || 0,
      mrp: Number(form.mrp) || 0,
      salePrice: Number(form.salePrice) || 0,
      wholesalePrice: Number(form.wholesalePrice) || 0,
      discountPct: Number(form.discountPct) || 0,
      taxRate: Number(form.taxRate) || 0,
      stockQty: Number(form.stockQty) || 0,
      reorderLevel: Number(form.reorderLevel) || 20,
      minStock: Number(form.minStock) || 10,
      maxStock: Number(form.maxStock) || 500,
      prescriptionRequired: form.prescriptionRequired,
      controlledDrug: form.controlledDrug,
      narcotic: form.narcotic,
      coldChain: form.coldChain,
    };
    try {
      const res = medicine
        ? await fetchAPI(`/api/medicines/${medicine.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetchAPI("/api/medicines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(medicine ? "Medicine updated" : "Medicine added");
      onOpenChange(false);
      onChanged();
    } catch {
      toast.error("Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" /> {medicine ? "Edit Medicine" : "Add Medicine"}
          </DialogTitle>
          <DialogDescription>
            {medicine ? `Editing ${medicine.name}` : "Fill in the medicine details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic */}
          <FormSection title="Basic Information">
            <FormField label="Name *" className="md:col-span-2">
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Paracetamol" required />
            </FormField>
            <FormField label="Generic Name">
              <Input value={form.genericName} onChange={(e) => update("genericName", e.target.value)} placeholder="e.g. Acetaminophen" />
            </FormField>
            <FormField label="Strength">
              <Input value={form.strength} onChange={(e) => update("strength", e.target.value)} placeholder="e.g. 500mg" />
            </FormField>
            <FormField label="Dosage Form">
              <Select value={form.dosageForm} onValueChange={(v) => update("dosageForm", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOSAGE_FORMS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Category">
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Therapeutic Class">
              <Input value={form.therapeuticClass} onChange={(e) => update("therapeuticClass", e.target.value)} placeholder="e.g. Antibiotic" />
            </FormField>
            <FormField label="Manufacturer">
              <Input value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} placeholder="e.g. Cipla Ltd" />
            </FormField>
            <FormField label="Supplier">
              <Select value={form.supplierId} onValueChange={(v) => update("supplierId", v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— No supplier —</SelectItem>
                  {(suppliers || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </FormSection>

          {/* Identification */}
          <FormSection title="Identification & Batch">
            <FormField label="HSN / SKU">
              <Input value={form.hsn} onChange={(e) => update("hsn", e.target.value)} placeholder="HSN code" />
            </FormField>
            <FormField label="Barcode">
              <Input value={form.barcode} onChange={(e) => update("barcode", e.target.value)} placeholder="EAN/UPC" />
            </FormField>
            <FormField label="Batch No *">
              <Input value={form.batchNo} onChange={(e) => update("batchNo", e.target.value)} placeholder="e.g. BT2024-001" required />
            </FormField>
            <FormField label="Expiry Date *">
              <Input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} required />
            </FormField>
            <FormField label="Manufacture Date">
              <Input type="date" value={form.manufactureDate} onChange={(e) => update("manufactureDate", e.target.value)} />
            </FormField>
            <FormField label="Storage Condition">
              <Select value={form.storageCondition} onValueChange={(v) => update("storageCondition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORAGE_CONDITIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Rack Number">
              <Input value={form.rackNumber} onChange={(e) => update("rackNumber", e.target.value)} placeholder="e.g. A1" />
            </FormField>
            <FormField label="Shelf Number">
              <Input value={form.shelfNumber} onChange={(e) => update("shelfNumber", e.target.value)} placeholder="e.g. 3" />
            </FormField>
          </FormSection>

          {/* Pricing */}
          <FormSection title="Pricing">
            <FormField label="Purchase Price">
              <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(e) => update("purchasePrice", e.target.value)} />
            </FormField>
            <FormField label="MRP">
              <Input type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => update("mrp", e.target.value)} />
            </FormField>
            <FormField label="Sale Price">
              <Input type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => update("salePrice", e.target.value)} />
            </FormField>
            <FormField label="Wholesale Price">
              <Input type="number" min="0" step="0.01" value={form.wholesalePrice} onChange={(e) => update("wholesalePrice", e.target.value)} />
            </FormField>
            <FormField label="Discount %">
              <Input type="number" min="0" step="0.01" value={form.discountPct} onChange={(e) => update("discountPct", e.target.value)} />
            </FormField>
            <FormField label="Tax Rate %">
              <Input type="number" min="0" step="0.01" value={form.taxRate} onChange={(e) => update("taxRate", e.target.value)} />
            </FormField>
          </FormSection>

          {/* Stock */}
          <FormSection title="Stock Levels">
            <FormField label="Stock Qty">
              <Input type="number" min="0" value={form.stockQty} onChange={(e) => update("stockQty", e.target.value)} />
            </FormField>
            <FormField label="Reorder Level">
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => update("reorderLevel", e.target.value)} />
            </FormField>
            <FormField label="Min Stock">
              <Input type="number" min="0" value={form.minStock} onChange={(e) => update("minStock", e.target.value)} />
            </FormField>
            <FormField label="Max Stock">
              <Input type="number" min="0" value={form.maxStock} onChange={(e) => update("maxStock", e.target.value)} />
            </FormField>
          </FormSection>

          {/* Flags */}
          <FormSection title="Flags">
            <SwitchRow label="Prescription Required" checked={form.prescriptionRequired} onCheckedChange={(v) => update("prescriptionRequired", v)} />
            <SwitchRow label="Cold Chain" checked={form.coldChain} onCheckedChange={(v) => update("coldChain", v)} />
            <SwitchRow label="Controlled Drug" checked={form.controlledDrug} onCheckedChange={(v) => update("controlledDrug", v)} />
            <SwitchRow label="Narcotic" checked={form.narcotic} onCheckedChange={(v) => update("narcotic", v)} />
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : medicine ? "Update Medicine" : "Add Medicine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function FormField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ---------- Adjust Stock Dialog ---------- */

interface AdjustStockProps {
  medicine: Medicine | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}

const MOVEMENT_TYPES = [
  { value: "purchase", label: "Purchase (In)" },
  { value: "sale", label: "Sale (Out)" },
  { value: "adjustment", label: "Adjustment" },
  { value: "damage", label: "Damage / Wastage" },
  { value: "expiry", label: "Expired Stock" },
  { value: "return", label: "Return" },
  { value: "transfer", label: "Transfer" },
  { value: "consumption", label: "Consumption" },
];

function AdjustStockDialog({ medicine, open, onOpenChange, onChanged }: AdjustStockProps) {
  const [type, setType] = useState("adjustment");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("adjustment");
      setQuantity("");
      setReference("");
      setNotes("");
      setPerformedBy("");
    }
  }, [open, medicine?.id]);

  if (!medicine) return null;

  // Auto-determine sign by type
  const isOutgoing = ["sale", "damage", "expiry", "consumption"].includes(type);
  const qtyNum = Number(quantity) || 0;
  const signedQty = isOutgoing ? -Math.abs(qtyNum) : Math.abs(qtyNum);
  const newBalance = Math.max(0, medicine.stockQty + signedQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyNum === 0) {
      toast.error("Quantity must be non-zero");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: medicine.id,
          type,
          quantity: signedQty,
          reference: reference || null,
          notes: notes || null,
          performedBy: performedBy || "pharmacist",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Stock adjusted · New balance: ${newBalance}`);
      onOpenChange(false);
      onChanged();
    } catch {
      toast.error("Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-600" /> Adjust Stock
          </DialogTitle>
          <DialogDescription>
            {medicine.name} · Current stock: <strong className="tabular-nums">{medicine.stockQty}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Stock:</span><span className="font-semibold tabular-nums">{medicine.stockQty}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reserved:</span><span className="font-semibold tabular-nums">{medicine.reservedStock}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reorder Level:</span><span className="font-semibold tabular-nums">{medicine.reorderLevel}</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-border/60"><span className="text-muted-foreground">New Balance:</span><span className="font-bold tabular-nums text-teal-600">{newBalance}</span></div>
          </div>
          <FormField label="Movement Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={`Quantity ${isOutgoing ? "(out, will be negated)" : "(in)"}`}>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required placeholder="Enter quantity" />
          </FormField>
          <FormField label="Reference (PO / Invoice / Reason)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-00123" />
          </FormField>
          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
          </FormField>
          <FormField label="Performed By">
            <Input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Pharmacist name" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
