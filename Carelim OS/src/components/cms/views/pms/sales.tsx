"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Plus, ShoppingCart, Wallet, TrendingUp, CalendarDays,
  Receipt, Eye, Printer, Download, X, Trash2, CreditCard,
  Pill, Stethoscope, FileText, Package, Percent, User,
  Minus, Barcode, Clock, RotateCcw, ArrowRight, Banknote,
  Smartphone, Building2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ---------------- Types ---------------- */
interface MedicineLite {
  id: string;
  name: string;
  strength?: string | null;
  category?: string | null;
  salePrice: number;
  stockQty: number;
  reorderLevel: number | null;
}

interface SaleItem {
  id: string;
  medicineId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  medicine: { name: string; strength?: string | null };
}

interface PharmacySale {
  id: string;
  invoiceNo: string;
  patientName: string | null;
  doctorName: string | null;
  prescriptionRef: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  saleDate: string;
  items: SaleItem[];
}

/* ---------------- Constants ---------------- */
const PAYMENT_METHODS = ["Cash", "Card", "eSewa", "Khalti", "FonePay", "Bank"] as const;

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Cash: <Banknote className="w-4 h-4" />,
  Card: <CreditCard className="w-4 h-4" />,
  eSewa: <Smartphone className="w-4 h-4" />,
  Khalti: <Smartphone className="w-4 h-4" />,
  FonePay: <Smartphone className="w-4 h-4" />,
  Bank: <Building2 className="w-4 h-4" />,
};

const PAYMENT_COLORS: Record<string, string> = {
  Cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Card: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  eSewa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Khalti: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  FonePay: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Bank: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const DEFAULT_TAX_RATE = 13; // 13% VAT in Nepal

interface DraftCartItem {
  medicineId: string;
  name: string;
  strength?: string | null;
  category?: string | null;
  unitPrice: number;
  quantity: number;
  discount: number;
  stockQty: number;
}

const MED_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "Tablet", label: "Tablets" },
  { value: "Capsule", label: "Capsules" },
  { value: "Syrup", label: "Syrups" },
  { value: "Injection", label: "Injections" },
  { value: "Cream", label: "Creams" },
  { value: "Drops", label: "Drops" },
  { value: "Inhaler", label: "Inhalers" },
  { value: "Powder", label: "Powder" },
  { value: "Gel", label: "Gel" },
  { value: "Suspension", label: "Suspension" },
  { value: "General", label: "Other" },
];

/* ---------------- Helpers ---------------- */
function escapeHTML(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function buildReceiptHTML(sale: PharmacySale): string {
  const statusBadge = `<span class="badge ${sale.status === "completed" ? "emerald" : "rose"}">${statusLabel(sale.status)}</span>`;
  const patientGrid = `
    <div class="info-grid">
      <div><div class="label">Customer</div><div><strong>${escapeHTML(sale.patientName || "Walk-in Customer")}</strong></div>
        ${sale.doctorName ? `<div class="label" style="margin-top:6px">Prescribed By</div><div>${escapeHTML(sale.doctorName)}</div>` : ""}</div>
      <div><div class="label">Invoice</div><div style="font-family:monospace">${escapeHTML(sale.invoiceNo)}</div>
        <div class="label" style="margin-top:6px">Date</div><div>${formatDate(sale.saleDate)}</div>
        ${sale.prescriptionRef ? `<div class="label" style="margin-top:6px">Rx Ref</div><div>${escapeHTML(sale.prescriptionRef)}</div>` : ""}</div>
    </div>`;

  const itemRows = (sale.items?.length ? sale.items : []).map((it) => `
    <tr>
      <td>${escapeHTML(it.medicine.name)}${it.medicine.strength ? ` <span style="color:#94a3b8">(${escapeHTML(it.medicine.strength)})</span>` : ""}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td style="text-align:right">${formatRs(it.unitPrice)}</td>
      <td style="text-align:right">${formatRs(it.total)}</td>
    </tr>`).join("");

  const itemsTable = `
    <h2>Items (${sale.items.length})</h2>
    <table>
      <thead><tr><th>Medicine</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows || `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No items</td></tr>`}</tbody>
    </table>`;

  const totals = `
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatRs(sale.subtotal)}</span></div>
      <div class="row"><span>Discount</span><span>- ${formatRs(sale.discount)}</span></div>
      <div class="row"><span>Tax</span><span>+ ${formatRs(sale.tax)}</span></div>
      <div class="row grand"><span>Total</span><span>${formatRs(sale.total)}</span></div>
      <div class="row"><span>Paid (${escapeHTML(sale.paymentMethod)})</span><span>${formatRs(sale.paidAmount)}</span></div>
    </div>`;

  return `${docHeader(sale.invoiceNo, "PHARMACY RECEIPT", formatDate(sale.saleDate), statusBadge)}
    ${patientGrid}
    ${itemsTable}
    ${totals}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Customer</div><div class="role">Signature</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">Pharmacist</div><div class="role">Carelim OS Pharmacy</div></div>
    </div>`;
}

function printReceipt(sale: PharmacySale) {
  printHTML(`Receipt ${sale.invoiceNo}`, buildReceiptHTML(sale));
}

/* ---------------- Main View ---------------- */
export function PmsSales() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: sales, loading, error } = useFetch<PharmacySale[]>(
    refresh ? `/api/pharmacy-sales?_r=${refresh}` : "/api/pharmacy-sales",
  );

  const [q, setQ] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!sales) return [];
    const ql = q.toLowerCase();
    return sales.filter((s) => {
      const matchQ = !ql ||
        s.invoiceNo.toLowerCase().includes(ql) ||
        (s.patientName || "").toLowerCase().includes(ql);
      const matchPay = payFilter === "all" || s.paymentMethod === payFilter;
      return matchQ && matchPay;
    });
  }, [sales, q, payFilter]);

  const { paged, page, totalPages, setPage, size, setSize, range } = usePagination<PharmacySale>(filtered, 10);

  const stats = useMemo(() => {
    if (!sales) return { todayCount: 0, todayRevenue: 0, monthRevenue: 0, avg: 0 };
    const now = new Date();
    let todayCount = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;
    sales.forEach((s) => {
      const d = new Date(s.saleDate);
      if (isSameDay(d, now)) {
        todayCount++;
        todayRevenue += s.total || 0;
      }
      if (isSameMonth(d, now)) {
        monthRevenue += s.total || 0;
      }
      totalRevenue += s.total || 0;
    });
    return {
      todayCount,
      todayRevenue,
      monthRevenue,
      avg: sales.length ? totalRevenue / sales.length : 0,
    };
  }, [sales]);

  const selected = sales?.find((s) => s.id === viewId) || null;

  const handleExport = () => {
    if (!filtered.length) { toast.info("No sales to export"); return; }
    exportToCSV("pharmacy-sales", [
      "Invoice", "Patient", "Doctor", "Date", "Subtotal", "Discount", "Tax",
      "Total", "Payment", "Status",
    ], filtered.map((s) => [
      s.invoiceNo,
      s.patientName || "Walk-in",
      s.doctorName || "",
      formatDate(s.saleDate),
      s.subtotal, s.discount, s.tax, s.total,
      s.paymentMethod, statusLabel(s.status),
    ]));
    toast.success(`Exported ${filtered.length} sales to CSV`);
  };

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-10 text-center text-sm text-rose-600">
            Failed to load pharmacy sales: {error}
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
            <ShoppingCart className="w-5 h-5 text-teal-600" /> Pharmacy Sales (POS)
          </h2>
          <p className="text-sm text-muted-foreground">
            {sales?.length ?? 0} sales · {formatRs(stats.monthRevenue)} this month
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
            <Plus className="w-4 h-4" /> New Sale
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard label="Today's Sales" value={stats.todayCount} icon={CalendarDays} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Today's Revenue" value={formatRs(stats.todayRevenue)} icon={Wallet} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="This Month Revenue" value={formatRs(stats.monthRevenue)} icon={TrendingUp} accent="from-teal-500 to-emerald-500" index={2} />
        <KpiCard label="Avg Sale Value" value={formatRs(stats.avg)} icon={Receipt} accent="from-amber-500 to-orange-500" index={3} />
      </div>

      {/* Filter bar + table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice no. or patient name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={payFilter} onValueChange={setPayFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <CalendarDays className="w-3.5 h-3.5" /> Last 100 sales
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[130px]">Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Doctor</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Subtotal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Payment</TableHead>
                  <TableHead className="text-center">Status</TableHead>
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
                        icon={ShoppingCart}
                        title="No sales found"
                        description="Adjust your filters or complete a new sale to see records here."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : paged.map((s) => (
                  <TableRow key={s.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{s.invoiceNo}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {s.patientName || "Walk-in"}
                      </p>
                      {s.prescriptionRef && (
                        <p className="text-[11px] text-muted-foreground font-mono">{s.prescriptionRef}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {s.doctorName ? (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" /> {s.doctorName}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {timeAgo(s.saleDate)}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">{s.items?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm">{formatRs(s.subtotal)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatRs(s.total)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${PAYMENT_COLORS[s.paymentMethod] || "bg-gray-100"}`}>
                        {s.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${statusColors[s.status] || "bg-gray-100"}`}>
                        {statusLabel(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-teal-600 text-xs"
                          onClick={() => setViewId(s.id)}
                        >
                          <Eye className="w-3 h-3" /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                          title="Print receipt"
                          onClick={() => printReceipt(s)}
                        >
                          <Printer className="w-3.5 h-3.5" />
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

      {/* New Sale dialog */}
      <NewSaleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); refreshFn(); toast.success("Sale completed — stock updated"); }}
      />

      {/* View sheet */}
      <Sheet open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <SaleDetail sale={selected} onPrint={() => printReceipt(selected)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------------- Full-Screen POS ---------------- */
function NewSaleDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: medicines } = useFetch<MedicineLite[]>("/api/medicines");
  const searchRef = useRef<HTMLInputElement>(null);

  // State
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionRef, setPrescriptionRef] = useState("");
  const [cart, setCart] = useState<DraftCartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [medSearch, setMedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [cashTendered, setCashTendered] = useState(0);
  const [showRecent, setShowRecent] = useState(false);
  const [heldSales, setHeldSales] = useState<{ cart: DraftCartItem[]; patient: string; doctor: string; rx: string; discount: number }[]>([]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Cart actions
  const clearCart = () => { setCart([]); setDiscount(0); setCashTendered(0); };

  const addToCart = (med: MedicineLite) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= med.stockQty) {
          toast.warning(`Only ${med.stockQty} units in stock`);
          return prev;
        }
        return prev.map((c) => c.medicineId === med.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        medicineId: med.id, name: med.name, strength: med.strength,
        category: med.category, unitPrice: med.salePrice, quantity: 1,
        discount: 0, stockQty: med.stockQty,
      }];
    });
    setMedSearch("");
  };

  const updateQty = (medicineId: string, qty: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.medicineId !== medicineId) return c;
      const newQty = Math.max(1, qty);
      if (newQty > c.stockQty) { toast.warning(`Max stock: ${c.stockQty}`); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const updatePrice = (medicineId: string, price: number) => {
    setCart((prev) => prev.map((c) => c.medicineId === medicineId ? { ...c, unitPrice: Math.max(0, price) } : c));
  };

  const updateItemDiscount = (medicineId: string, disc: number) => {
    setCart((prev) => prev.map((c) => c.medicineId === medicineId ? { ...c, discount: Math.max(0, disc) } : c));
  };

  const removeItem = (medicineId: string) => {
    setCart((prev) => prev.filter((c) => c.medicineId !== medicineId));
  };

  // Hold / Recall
  const holdSale = () => {
    if (cart.length === 0) { toast.info("Cart is empty"); return; }
    setHeldSales((prev) => [...prev, { cart: [...cart], patient: patientName, doctor: doctorName, rx: prescriptionRef, discount }]);
    clearCart();
    setPatientName(""); setDoctorName(""); setPrescriptionRef("");
    toast.success("Sale held");
  };

  const recallSale = () => {
    if (heldSales.length === 0) { toast.info("No held sales"); return; }
    const last = heldSales[heldSales.length - 1];
    setCart(last.cart);
    setPatientName(last.patient);
    setDoctorName(last.doctor);
    setPrescriptionRef(last.rx);
    setDiscount(last.discount);
    setHeldSales((prev) => prev.slice(0, -1));
    toast.success("Sale recalled");
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { e.preventDefault(); onOpenChange(false); }
      if (e.key === "F2") { e.preventDefault(); holdSale(); }
      if (e.key === "F3") { e.preventDefault(); recallSale(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cart, patientName, doctorName, prescriptionRef, discount, heldSales]);

  // Medicine filtering
  const medOptions = useMemo(() => {
    if (!medicines) return [] as MedicineLite[];
    const ql = medSearch.toLowerCase().trim();
    return medicines.filter((m) => {
      const matchQ = !ql ||
        m.name.toLowerCase().includes(ql) ||
        (m.strength || "").toLowerCase().includes(ql) ||
        (m.category || "").toLowerCase().includes(ql);
      const matchCat = categoryFilter === "all" || m.category === categoryFilter;
      return matchQ && matchCat;
    });
  }, [medicines, medSearch, categoryFilter]);

  // Available categories from stock
  const availableCategories = useMemo(() => {
    if (!medicines) return [] as string[];
    const cats = new Set<string>();
    medicines.forEach((m) => { if (m.category) cats.add(m.category); });
    return MED_CATEGORIES.filter((c) => c.value === "all" || cats.has(c.value)).map((c) => c.value);
  }, [medicines]);

  // Totals
  const lineTotals = useMemo(() => cart.map((c) => ({
    ...c,
    lineTotal: (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0) - (Number(c.discount) || 0),
  })), [cart]);

  const subtotal = useMemo(() => lineTotals.reduce((s, it) => s + it.lineTotal, 0), [lineTotals]);
  const totalItemDiscount = useMemo(() => cart.reduce((s, c) => s + (Number(c.discount) || 0), 0), [cart]);
  const taxAmount = useMemo(() => Math.round(Math.max(0, subtotal - discount) * (DEFAULT_TAX_RATE / 100)), [subtotal, discount]);
  const total = Math.max(0, subtotal - discount + taxAmount);
  const change = paymentMethod === "Cash" ? Math.max(0, cashTendered - total) : 0;

  // Submit
  const submit = async () => {
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      const body = {
        patientName: patientName || "Walk-in Customer",
        doctorName: doctorName || null,
        prescriptionRef: prescriptionRef || null,
        items: cart.map((c) => ({
          medicineId: c.medicineId,
          quantity: Number(c.quantity),
          unitPrice: Number(c.unitPrice),
          discount: Number(c.discount) || 0,
        })),
        discount: Number(discount) || 0,
        tax: taxAmount,
        paymentMethod,
        paidAmount: paymentMethod === "Cash" ? cashTendered : total,
      };
      const res = await fetchAPI("/api/pharmacy-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      clearCart();
      setPatientName(""); setDoctorName(""); setPrescriptionRef("");
      setCashTendered(0);
      onCreated();
    } catch {
      toast.error("Failed to complete sale");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Pharmacy POS</h1>
              <p className="text-[10px] text-muted-foreground">
                {cart.length} items · {medicines?.length || 0} medicines in stock
              </p>
            </div>
          </div>
          <SeparatorV />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-amber-600" onClick={holdSale} title="Hold Sale (F2)">
              <Clock className="w-3.5 h-3.5" /> Hold {heldSales.length > 0 && <Badge className="ml-0.5 h-4 min-w-4 text-[9px] bg-amber-100 text-amber-700">{heldSales.length}</Badge>}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600" onClick={recallSale} title="Recall Sale (F3)" disabled={heldSales.length === 0}>
              <RotateCcw className="w-3.5 h-3.5" /> Recall
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowRecent(!showRecent)}>
            <Clock className="w-3.5 h-3.5" /> Recent
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} title="Close (Esc)">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Medicine Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + category tabs */}
          <div className="border-b bg-card/50 px-4 py-2 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search by name, strength, category, or scan barcode… (F1)"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
              {medSearch && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setMedSearch("")}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-0.5">
              {MED_CATEGORIES.filter((c) => c.value === "all" || availableCategories.includes(c.value)).map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    categoryFilter === cat.value
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Medicine grid */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {medicines === undefined ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            ) : medOptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Package className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">No medicines found</p>
                <p className="text-xs">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {medOptions.map((m) => {
                  const inCart = cart.find((c) => c.medicineId === m.id);
                  const stockPct = m.reorderLevel ? (m.stockQty / m.reorderLevel) * 100 : 100;
                  const stockColor = m.stockQty === 0 ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" :
                    stockPct < 50 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" :
                    "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => addToCart(m)}
                      disabled={m.stockQty === 0}
                      className={`text-left rounded-xl border p-3 transition-all hover:shadow-md active:scale-[0.97] ${
                        inCart
                          ? "border-teal-300 bg-teal-50/50 dark:border-teal-700 dark:bg-teal-950/20 ring-1 ring-teal-200"
                          : "border-border hover:border-teal-200 bg-card"
                      } ${m.stockQty === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate leading-tight">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.strength || m.category}</p>
                        </div>
                        {inCart && (
                          <Badge className="h-5 min-w-5 text-[9px] bg-teal-600 text-white shrink-0">{inCart.quantity}</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-teal-700 dark:text-teal-400">{formatRs(m.salePrice)}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stockColor}`}>
                          {m.stockQty === 0 ? "Out" : `${m.stockQty} left`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart + Payment */}
        <div className="w-full lg:w-[420px] border-l flex flex-col bg-card shrink-0">
          {/* Patient info */}
          <div className="border-b px-4 py-3 space-y-2 shrink-0">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Patient</Label>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Walk-in customer"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Doctor (optional)"
                className="h-8 text-sm"
              />
              <Input
                value={prescriptionRef}
                onChange={(e) => setPrescriptionRef(e.target.value)}
                placeholder="Rx Ref"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2 space-y-1.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs">Click medicines to add</p>
              </div>
            ) : lineTotals.map((c) => (
              <div key={c.medicineId} className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.strength && <p className="text-[11px] text-muted-foreground">{c.strength}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{formatRs(c.lineTotal)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-rose-500" onClick={() => removeItem(c.medicineId)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-1.5 items-end">
                  {/* Qty controls */}
                  <div className="col-span-3">
                    <Label className="text-[9px] text-muted-foreground">Qty</Label>
                    <div className="flex items-center gap-0.5">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateQty(c.medicineId, c.quantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number" min={1} max={c.stockQty} value={c.quantity}
                        onChange={(e) => updateQty(c.medicineId, Number(e.target.value))}
                        className="h-7 text-center text-xs px-1"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateQty(c.medicineId, c.quantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {/* Price */}
                  <div className="col-span-3">
                    <Label className="text-[9px] text-muted-foreground">Price</Label>
                    <Input
                      type="number" min={0} value={c.unitPrice}
                      onChange={(e) => updatePrice(c.medicineId, Number(e.target.value))}
                      className="h-7 text-xs"
                    />
                  </div>
                  {/* Discount */}
                  <div className="col-span-3">
                    <Label className="text-[9px] text-muted-foreground">Disc.</Label>
                    <Input
                      type="number" min={0} value={c.discount}
                      onChange={(e) => updateItemDiscount(c.medicineId, Number(e.target.value))}
                      className="h-7 text-xs"
                    />
                  </div>
                  {/* Stock */}
                  <div className="col-span-3 text-right">
                    <Label className="text-[9px] text-muted-foreground block">Stock</Label>
                    <span className={`text-[11px] font-medium ${c.stockQty < 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {c.stockQty}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment + totals */}
          <div className="border-t shrink-0">
            {/* Payment method */}
            <div className="px-4 py-3 space-y-2">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                      paymentMethod === m
                        ? "border-teal-400 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:border-teal-600 dark:text-teal-300 shadow-sm"
                        : "border-border hover:border-teal-200 text-muted-foreground"
                    }`}
                  >
                    {PAYMENT_ICONS[m]} {m}
                  </button>
                ))}
              </div>
              {/* Cash tendered */}
              {paymentMethod === "Cash" && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Cash Tendered</Label>
                  <Input
                    type="number" min={0} value={cashTendered || ""}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {/* Discount */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Percent className="w-3 h-3" /> Discount (Rs)</Label>
                <Input
                  type="number" min={0} value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Totals summary */}
            <div className="px-4 py-2 space-y-1 text-sm border-t bg-muted/30">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatRs(subtotal + totalItemDiscount)}</span>
              </div>
              {totalItemDiscount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Item Disc.</span>
                  <span className="text-rose-600 tabular-nums">- {formatRs(totalItemDiscount)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Extra Disc.</span>
                  <span className="text-rose-600 tabular-nums">- {formatRs(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tax ({DEFAULT_TAX_RATE}%)</span>
                <span className="tabular-nums">+ {formatRs(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-teal-700 dark:text-teal-400 border-t pt-1.5 mt-1">
                <span>Total</span>
                <span className="tabular-nums">{formatRs(total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{cart.reduce((s, c) => s + c.quantity, 0)} units · {cart.length} items</span>
                {paymentMethod === "Cash" && cashTendered > 0 && (
                  <span className="text-emerald-600 font-medium">Change: {formatRs(change)}</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 flex gap-2">
              <Button
                variant="outline" onClick={() => onOpenChange(false)}
                className="flex-1 h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={saving || cart.length === 0}
                className="flex-[2] h-10 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-500/25"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Complete · {formatRs(total)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Separator helper ---------------- */
function SeparatorV() {
  return <div className="w-px h-6 bg-border" />;
}

/* ---------------- Sale Detail Sheet ---------------- */
function SaleDetail({ sale, onPrint }: { sale: PharmacySale; onPrint: () => void }) {
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              <span className="font-mono">{sale.invoiceNo}</span>
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span>{formatDate(sale.saleDate)}</span>
              <Badge className={`text-[10px] ${PAYMENT_COLORS[sale.paymentMethod] || "bg-gray-100"}`}>{sale.paymentMethod}</Badge>
              <Badge className={`text-[10px] ${statusColors[sale.status] || "bg-gray-100"}`}>{statusLabel(sale.status)}</Badge>
              <Badge className={`text-[10px] ${statusColors[sale.paymentStatus] || "bg-gray-100"}`}>{statusLabel(sale.paymentStatus)}</Badge>
            </SheetDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onPrint}>
            <Printer className="w-4 h-4" /> Print Receipt
          </Button>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-5">
        {/* Patient + total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <User className="w-3 h-3" /> Customer
            </p>
            <p className="font-semibold mt-0.5">{sale.patientName || "Walk-in Customer"}</p>
            {sale.doctorName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Stethoscope className="w-3 h-3" /> {sale.doctorName}
              </p>
            )}
            {sale.prescriptionRef && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{sale.prescriptionRef}</p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total Paid</p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{formatRs(sale.total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              via <span className="font-medium">{sale.paymentMethod}</span> · {timeAgo(sale.saleDate)}
            </p>
          </div>
        </div>

        {/* Items table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Items ({sale.items.length})
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Medicine</TableHead>
                  <TableHead className="text-right w-16">Qty</TableHead>
                  <TableHead className="text-right w-24">Price</TableHead>
                  <TableHead className="text-right w-24 hidden sm:table-cell">Disc</TableHead>
                  <TableHead className="text-right w-28">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No items</TableCell></TableRow>
                ) : sale.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium">{it.medicine.name}</p>
                      {it.medicine.strength && (
                        <p className="text-[11px] text-muted-foreground">{it.medicine.strength}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{it.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{formatRs(it.unitPrice)}</TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell text-rose-600">
                      {it.discount > 0 ? `- ${formatRs(it.discount)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRs(it.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm ml-auto max-w-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(sale.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-rose-600">- {formatRs(sale.discount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatRs(sale.tax)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5 text-base"><span>Total</span><span>{formatRs(sale.total)}</span></div>
          <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatRs(sale.paidAmount)}</span></div>
        </div>
      </div>
    </div>
  );
}
