"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Search, Plus, PackageCheck, Wallet, ClipboardList, CheckCircle2,
  Eye, Printer, Download, X, Trash2, ArrowUpDown, Package,
  CalendarClock, FileText, ArrowDownRight,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination, useSort } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ---------------- Types ---------------- */
interface Supplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
}

interface MedicineLite {
  id: string;
  name: string;
  strength?: string | null;
  category?: string | null;
  purchasePrice: number;
  salePrice: number;
  stockQty: number;
  supplierId?: string | null;
}

interface PurchaseOrderItem {
  id: string;
  medicineId: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  taxPct: number;
  discountPct: number;
  total: number;
  medicine: { name: string; strength?: string | null };
}

interface GRN {
  id: string;
  grnNumber: string;
  receivedDate: string;
  totalAmount: number;
  notes?: string | null;
  receivedBy?: string | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string | null;
  createdBy?: string | null;
  supplier: { name: string; phone?: string | null; paymentTerms?: string | null };
  items: PurchaseOrderItem[];
  grns: GRN[];
}

/* ---------------- Constants ---------------- */
const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const STATUS_FILTERS = ["all", "draft", "sent", "partial", "received", "cancelled"] as const;

type SortKey = "poNumber" | "supplier" | "orderDate" | "expectedDate" | "totalAmount" | "paidAmount" | "balance";

interface DraftItem {
  medicineId: string;
  quantity: number;
  unitPrice: number;
  taxPct: number;
  discountPct: number;
}

/* ---------------- Helpers ---------------- */
function escapeHTML(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function poBalance(po: PurchaseOrder): number {
  return Math.max(0, (po.totalAmount || 0) - (po.paidAmount || 0));
}

function buildPOPrintHTML(po: PurchaseOrder): string {
  const statusBadge = `<span class="badge ${po.status === "received" ? "emerald" : po.status === "cancelled" ? "rose" : "teal"}">${statusLabel(po.status)}</span>`;
  const supplierGrid = `
    <div class="info-grid">
      <div><div class="label">Supplier</div><div><strong>${escapeHTML(po.supplier.name)}</strong></div>
        <div>Phone: ${escapeHTML(po.supplier.phone || "—")}</div>
        <div>Terms: ${escapeHTML(po.supplier.paymentTerms || "—")}</div></div>
      <div><div class="label">Order Date</div><div>${formatDate(po.orderDate)}</div>
        <div class="label" style="margin-top:6px">Expected Date</div>
        <div>${po.expectedDate ? formatDate(po.expectedDate) : "—"}</div>
        ${po.receivedDate ? `<div class="label" style="margin-top:6px">Received</div><div>${formatDate(po.receivedDate)}</div>` : ""}</div>
    </div>`;

  const itemRows = (po.items?.length ? po.items : []).map((it) => `
    <tr>
      <td>${escapeHTML(it.medicine.name)}${it.medicine.strength ? ` <span style="color:#94a3b8">(${escapeHTML(it.medicine.strength)})</span>` : ""}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td style="text-align:right">${formatRs(it.unitPrice)}</td>
      <td style="text-align:right">${it.discountPct}%</td>
      <td style="text-align:right">${it.taxPct}%</td>
      <td style="text-align:right">${formatRs(it.total)}</td>
    </tr>`).join("");

  const itemsTable = `
    <h2>Items (${po.items.length})</h2>
    <table>
      <thead><tr><th>Medicine</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Disc%</th><th style="text-align:right">Tax%</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows || `<tr><td colspan="6" style="text-align:center;color:#94a3b8">No items</td></tr>`}</tbody>
    </table>`;

  const totals = `
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatRs(po.subtotal)}</span></div>
      <div class="row"><span>Discount</span><span>- ${formatRs(po.discountAmount)}</span></div>
      <div class="row"><span>Tax</span><span>+ ${formatRs(po.taxAmount)}</span></div>
      <div class="row grand"><span>Total</span><span>${formatRs(po.totalAmount)}</span></div>
      <div class="row"><span>Paid</span><span>${formatRs(po.paidAmount)}</span></div>
      <div class="row"><span>Balance</span><span>${formatRs(poBalance(po))}</span></div>
    </div>`;

  return `${docHeader(po.poNumber, "PURCHASE ORDER", formatDate(po.orderDate), statusBadge)}
    ${supplierGrid}
    ${itemsTable}
    ${totals}
    ${po.notes ? `<h2>Notes</h2><p style="font-size:13px;color:#475569">${escapeHTML(po.notes)}</p>` : ""}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Store Manager</div><div class="role">Carelim OS Pharmacy</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">Supplier Authorized Signatory</div><div class="role">${escapeHTML(po.supplier.name)}</div></div>
    </div>`;
}

function printPO(po: PurchaseOrder) {
  printHTML(`Purchase Order ${po.poNumber}`, buildPOPrintHTML(po));
}

/* ---------------- Main View ---------------- */
export function PmsPurchases() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: orders, loading, error } = useFetch<PurchaseOrder[]>(
    refresh ? `/api/purchase-orders?_r=${refresh}` : "/api/purchase-orders",
  );

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const ql = q.toLowerCase();
    return orders.filter((po) => {
      const matchStatus = statusFilter === "all" || po.status === statusFilter;
      const matchSearch = !ql ||
        po.poNumber.toLowerCase().includes(ql) ||
        (po.supplier?.name || "").toLowerCase().includes(ql);
      return matchStatus && matchSearch;
    });
  }, [orders, q, statusFilter]);

  // Sort the filtered list
  const sortKey: SortKey = "orderDate" as SortKey;
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = -1; // newest first
      if (sortKey === "supplier") return a.supplier.name.localeCompare(b.supplier.name) * -dir;
      if (sortKey === "poNumber") return a.poNumber.localeCompare(b.poNumber) * -dir;
      if (sortKey === "orderDate") return (new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()) * dir;
      if (sortKey === "expectedDate") {
        const av = a.expectedDate ? new Date(a.expectedDate).getTime() : 0;
        const bv = b.expectedDate ? new Date(b.expectedDate).getTime() : 0;
        return (av - bv) * dir;
      }
      if (sortKey === "totalAmount") return ((a.totalAmount || 0) - (b.totalAmount || 0)) * dir;
      if (sortKey === "paidAmount") return ((a.paidAmount || 0) - (b.paidAmount || 0)) * dir;
      if (sortKey === "balance") return (poBalance(a) - poBalance(b)) * dir;
      return 0;
    });
  }, [filtered, sortKey]);

  const { paged, page, totalPages, setPage, size, setSize, range } = usePagination<PurchaseOrder>(sorted, 10);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, received: 0, value: 0 };
    let pending = 0;
    let received = 0;
    let value = 0;
    orders.forEach((po) => {
      if (po.status === "draft" || po.status === "sent" || po.status === "partial") pending++;
      if (po.status === "received") received++;
      value += po.totalAmount || 0;
    });
    return { total: orders.length, pending, received, value };
  }, [orders]);

  const selected = orders?.find((po) => po.id === viewId) || null;

  const handleExport = () => {
    if (!sorted.length) { toast.info("No purchase orders to export"); return; }
    exportToCSV("purchase-orders", [
      "PO Number", "Supplier", "Order Date", "Expected Date", "Status",
      "Subtotal", "Tax", "Total", "Paid", "Balance",
    ], sorted.map((po) => [
      po.poNumber, po.supplier.name, formatDate(po.orderDate),
      po.expectedDate ? formatDate(po.expectedDate) : "",
      statusLabel(po.status),
      po.subtotal, po.taxAmount, po.totalAmount, po.paidAmount, poBalance(po),
    ]));
    toast.success(`Exported ${sorted.length} purchase orders to CSV`);
  };

  const handleReceive = async (po: PurchaseOrder) => {
    setReceivePO(null);
    try {
      const res = await fetchAPI(`/api/purchase-orders/${po.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "received" }),
      });
      if (!res.ok) throw new Error("Failed to receive PO");
      toast.success(`${po.poNumber} marked as received — stock updated`);
      refreshFn();
    } catch {
      toast.error("Failed to mark PO as received");
    }
  };

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-10 text-center text-sm text-rose-600">
            Failed to load purchase orders: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-teal-600" /> Purchase Orders
          </h2>
          <p className="text-sm text-muted-foreground">
            {orders?.length ?? 0} orders · {formatRs(stats.value)} total value
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
            <Plus className="w-4 h-4" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Total POs" value={stats.total} icon={ClipboardList} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending (draft/sent)" value={stats.pending} icon={CalendarClock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Received" value={stats.received} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Total Value" value={formatRs(stats.value)} icon={Wallet} accent="from-teal-500 to-emerald-500" index={3} />
      </div>

      {/* Filter bar + table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search PO number or supplier…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sorted by newest first</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
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
                      ({orders?.filter((po) => po.status === s).length ?? 0})
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
                  <TableHead className="w-[120px]">PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="hidden sm:table-cell">Order Date</TableHead>
                  <TableHead className="hidden md:table-cell">Expected Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
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
                    <TableCell colSpan={10} className="py-2">
                      <EmptyState
                        icon={PackageCheck}
                        title="No purchase orders found"
                        description="Adjust your filters or create a new purchase order to get started."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : paged.map((po) => {
                  const balance = poBalance(po);
                  return (
                    <TableRow key={po.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{po.supplier?.name || "—"}</p>
                        {po.createdBy && (
                          <p className="text-[11px] text-muted-foreground">by {po.createdBy.split("@")[0]}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDate(po.orderDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {po.expectedDate ? formatDate(po.expectedDate) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] ${PO_STATUS_COLORS[po.status] || "bg-gray-100"}`}>
                          {statusLabel(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{po.items?.length || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatRs(po.totalAmount)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-sm text-emerald-600">
                        {formatRs(po.paidAmount)}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${balance > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                        {formatRs(balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(po.status === "sent" || po.status === "partial") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900 dark:hover:bg-emerald-950/30"
                              onClick={() => setReceivePO(po)}
                              title="Mark as received — updates stock"
                            >
                              <ArrowDownRight className="w-3 h-3" /> Receive
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-teal-600 text-xs"
                            onClick={() => setViewId(po.id)}
                          >
                            <Eye className="w-3 h-3" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                            title="Print PO"
                            onClick={() => printPO(po)}
                          >
                            <Printer className="w-3.5 h-3.5" />
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
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </CardContent>
      </Card>

      {/* Create PO dialog */}
      <CreatePODialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); refreshFn(); toast.success("Purchase order created"); }}
      />

      {/* Receive confirmation */}
      <AlertDialog open={!!receivePO} onOpenChange={(o) => !o && setReceivePO(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" /> Receive Purchase Order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark PO{" "}
              <span className="font-mono font-semibold text-foreground">{receivePO?.poNumber}</span> from{" "}
              <span className="font-semibold text-foreground">{receivePO?.supplier.name}</span> as{" "}
              <span className="font-semibold text-emerald-600">Received</span>. This will update medicine stock levels
              and create stock movements for {receivePO?.items.length || 0} item(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={(e) => { e.preventDefault(); if (receivePO) handleReceive(receivePO); }}
            >
              <ArrowDownRight className="w-4 h-4 mr-1" /> Confirm Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View sheet */}
      <Sheet open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <PODetail po={selected} onPrint={() => printPO(selected)} onReceive={(p) => { setViewId(null); setReceivePO(p); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------------- Create PO Dialog ---------------- */
function CreatePODialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: suppliers } = useFetch<Supplier[]>("/api/suppliers");
  const { data: medicines } = useFetch<MedicineLite[]>("/api/medicines");

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { medicineId: "", quantity: 1, unitPrice: 0, taxPct: 13, discountPct: 0 },
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

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    items.forEach((it) => {
      const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const afterDiscount = line * (1 - (Number(it.discountPct) || 0) / 100);
      const afterTax = afterDiscount * (1 + (Number(it.taxPct) || 0) / 100);
      subtotal += afterDiscount;
      tax += afterTax - afterDiscount;
    });
    return { subtotal, tax, total: subtotal + tax };
  }, [items]);

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      // Auto-fill unit price from medicine.purchasePrice when medicine changes
      if (patch.medicineId !== undefined) {
        const med = medById.get(patch.medicineId);
        if (med) next.unitPrice = med.purchasePrice;
      }
      return next;
    }));
  };

  const addItem = () =>
    setItems((p) => [...p, { medicineId: "", quantity: 1, unitPrice: 0, taxPct: 13, discountPct: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const reset = () => {
    setSupplierId("");
    setExpectedDate("");
    setNotes("");
    setItems([{ medicineId: "", quantity: 1, unitPrice: 0, taxPct: 13, discountPct: 0 }]);
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
        expectedDate: expectedDate || null,
        notes,
        items: valid.map((i) => ({
          medicineId: i.medicineId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice) || 0,
          taxPct: Number(i.taxPct) || 0,
          discountPct: Number(i.discountPct) || 0,
        })),
      };
      const res = await fetchAPI("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create PO");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" /> Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Build a PO with line items. Totals compute automatically — submit to save as draft.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Supplier + dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Expected Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Terms</Label>
              <Input
                value={suppliers?.find((s) => s.id === supplierId)?.paymentTerms || "—"}
                disabled
                className="text-xs text-muted-foreground"
              />
            </div>
          </div>

          {/* Items builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
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
                    className="col-span-3 sm:col-span-1 h-8 text-sm"
                    placeholder="Qty"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="col-span-4 sm:col-span-2 h-8 text-sm"
                    placeholder="Price"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="col-span-2 sm:col-span-1 h-8 text-sm"
                    placeholder="Tax%"
                    value={it.taxPct}
                    onChange={(e) => updateItem(idx, { taxPct: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    className="col-span-2 sm:col-span-1 h-8 text-sm"
                    placeholder="Disc%"
                    value={it.discountPct}
                    onChange={(e) => updateItem(idx, { discountPct: Number(e.target.value) })}
                  />
                  <div className="col-span-1 sm:col-span-1 text-right text-sm font-medium">
                    {formatRs(
                      (Number(it.quantity) || 0) *
                      (Number(it.unitPrice) || 0) *
                      (1 - (Number(it.discountPct) || 0) / 100) *
                      (1 + (Number(it.taxPct) || 0) / 100),
                    )}
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
              {filteredMeds.length === 0 && supplierId && (
                <p className="text-xs text-amber-600 text-center py-2">
                  No medicines linked to this supplier. You can still pick from the full list.
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional notes for the supplier or store team…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Totals */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatRs(totals.tax)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base"><span>Total</span><span className="text-teal-700 dark:text-teal-400">{formatRs(totals.total)}</span></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Creating…" : "Create PO (Draft)"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- PO Detail Sheet ---------------- */
function PODetail({
  po, onPrint, onReceive,
}: { po: PurchaseOrder; onPrint: () => void; onReceive: (po: PurchaseOrder) => void }) {
  const balance = poBalance(po);
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              <span className="font-mono">{po.poNumber}</span>
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span>{formatDate(po.orderDate)}</span>
              <Badge className={`text-[10px] ${PO_STATUS_COLORS[po.status] || "bg-gray-100"}`}>{statusLabel(po.status)}</Badge>
              <span className="text-xs">by {po.createdBy || "—"}</span>
            </SheetDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onPrint}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            {(po.status === "sent" || po.status === "partial") && (
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onReceive(po)}
              >
                <ArrowDownRight className="w-4 h-4" /> Receive
              </Button>
            )}
          </div>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-5">
        {/* Supplier + amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Supplier</p>
            <p className="font-semibold mt-0.5">{po.supplier?.name}</p>
            <p className="text-xs text-muted-foreground">{po.supplier?.phone || "—"}</p>
            {po.supplier?.paymentTerms && (
              <p className="text-xs text-muted-foreground">Terms: {po.supplier.paymentTerms}</p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{formatRs(po.totalAmount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paid <span className="text-emerald-600 font-medium">{formatRs(po.paidAmount)}</span> · Balance{" "}
              <span className={`font-medium ${balance > 0 ? "text-rose-600" : ""}`}>{formatRs(balance)}</span>
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CalendarClock className="w-3 h-3" /> Ordered
            </p>
            <p className="text-sm font-medium mt-0.5">{formatDate(po.orderDate)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Expected</p>
            <p className="text-sm font-medium mt-0.5">{po.expectedDate ? formatDate(po.expectedDate) : "—"}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Received</p>
            <p className="text-sm font-medium mt-0.5">{po.receivedDate ? formatDate(po.receivedDate) : "—"}</p>
          </div>
        </div>

        {/* Items table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Items ({po.items.length})
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Received</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Unit Price</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Tax%</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Disc%</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No items</TableCell></TableRow>
                ) : po.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium">{it.medicine.name}</p>
                      {it.medicine.strength && (
                        <p className="text-[11px] text-muted-foreground">{it.medicine.strength}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">
                      <span className={it.receivedQty >= it.quantity ? "text-emerald-600 font-medium" : "text-amber-600"}>
                        {it.receivedQty}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">{formatRs(it.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">{it.taxPct}%</TableCell>
                    <TableCell className="text-right text-sm hidden md:table-cell">{it.discountPct}%</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRs(it.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* GRN info */}
        {po.grns && po.grns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" /> Goods Received Notes ({po.grns.length})
            </h4>
            <div className="space-y-2">
              {po.grns.map((grn) => (
                <div key={grn.id} className="rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">{grn.grnNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Received {formatDate(grn.receivedDate)}{grn.receivedBy ? ` · by ${grn.receivedBy}` : ""}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {formatRs(grn.totalAmount)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {po.notes && (
          <div>
            <h4 className="text-sm font-semibold mb-1.5">Notes</h4>
            <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 p-3">{po.notes}</p>
          </div>
        )}

        {/* Totals */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm ml-auto max-w-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(po.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-rose-600">- {formatRs(po.discountAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatRs(po.taxAmount)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5 text-base"><span>Total</span><span>{formatRs(po.totalAmount)}</span></div>
          <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatRs(po.paidAmount)}</span></div>
          <div className="flex justify-between font-semibold text-rose-600"><span>Balance</span><span>{formatRs(balance)}</span></div>
        </div>
      </div>
    </div>
  );
}
