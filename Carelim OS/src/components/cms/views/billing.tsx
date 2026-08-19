"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect } from "react";
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
  Search, Plus, Receipt, Wallet, TrendingUp, AlertTriangle,
  Eye, CreditCard, Printer, X, Download, RotateCcw, Mail, MessageSquare,
  ArrowUpDown, Stethoscope, Pill, FlaskConical, Package, BedDouble,
  FileText, Calendar, User,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InvoiceItem {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string;
  type: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  status: string;
  paymentMethod: string | null;
  date: string;
  patient: { id: string; patientCode: string; name: string; phone: string };
  items: InvoiceItem[];
}

interface PatientLite {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
}

const TYPE_COLORS: Record<string, string> = {
  consultation: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  pharmacy: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  lab: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  package: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  ipd: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const PAYMENT_METHODS = ["Cash", "Card", "Bank", "eSewa", "Khalti", "FonePay", "Stripe", "PayPal"];

const STATUS_FILTERS = ["all", "paid", "partial", "unpaid", "refunded"] as const;

type SortKey = "date" | "total" | "paid" | "due" | "invoiceNo";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "invoiceNo", label: "Invoice No" },
  { value: "total", label: "Total" },
  { value: "paid", label: "Paid" },
  { value: "due", label: "Due" },
];

/* ---------- Invoice print HTML builder ---------- */
function buildInvoiceHTML(inv: Invoice): string {
  const statusClass =
    inv.status === "paid" ? "emerald" :
    inv.status === "partial" ? "teal" :
    inv.status === "refunded" ? "rose" : "rose";
  const statusBadge = `<span class="badge ${statusClass}">${statusLabel(inv.status)}</span>`;

  const patientGrid = `
    <div class="info-grid">
      <div><div class="label">Bill To</div><div><strong>${escapeHTML(inv.patient.name)}</strong></div>
        <div>Code: <span style="font-family:monospace">${escapeHTML(inv.patient.patientCode)}</span></div>
        <div>Phone: ${escapeHTML(inv.patient.phone || "—")}</div></div>
      <div><div class="label">Type</div><div>${escapeHTML(inv.type)}</div>
        <div class="label" style="margin-top:6px">Payment Method</div>
        <div>${escapeHTML(inv.paymentMethod || "—")}</div></div>
    </div>`;

  const itemRows = (inv.items?.length ? inv.items : []).map((it) => `
    <tr>
      <td>${escapeHTML(it.description)}</td>
      <td style="text-align:right">${it.qty}</td>
      <td style="text-align:right">${formatRs(it.rate)}</td>
      <td style="text-align:right">${formatRs(it.amount)}</td>
    </tr>`).join("");

  const itemsTable = `
    <h2>Items</h2>
    <table>
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows || `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No items</td></tr>`}</tbody>
    </table>`;

  const totals = `
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatRs(inv.subtotal)}</span></div>
      <div class="row"><span>Discount</span><span>- ${formatRs(inv.discount)}</span></div>
      <div class="row"><span>Tax</span><span>+ ${formatRs(inv.tax)}</span></div>
      <div class="row grand"><span>Total</span><span>${formatRs(inv.total)}</span></div>
      <div class="row"><span>Paid</span><span>${formatRs(inv.paid)}</span></div>
      <div class="row"><span>Due</span><span>${formatRs(inv.due)}</span></div>
    </div>`;

  return `${docHeader(inv.invoiceNo, "INVOICE", formatDate(inv.date), statusBadge)}
    ${patientGrid}
    ${itemsTable}
    ${totals}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Received By</div><div class="role">Patient / Guardian</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">Authorized Signatory</div><div class="role">MedCore Health Center</div></div>
    </div>`;
}

function escapeHTML(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function printInvoice(inv: Invoice) {
  printHTML(`Invoice ${inv.invoiceNo}`, buildInvoiceHTML(inv));
}

export function BillingView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const { data: invoices, loading, error } = useFetch<Invoice[]>(
    refreshKey ? `/api/invoices?_r=${refreshKey}` : "/api/invoices",
  );
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [billTypeOpen, setBillTypeOpen] = useState(false);
  const [selectedBillType, setSelectedBillType] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [refundInvoice, setRefundInvoice] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const ql = q.toLowerCase();
    const list = invoices.filter((inv) => {
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchesSearch = !ql ||
        inv.invoiceNo.toLowerCase().includes(ql) ||
        inv.patient.name.toLowerCase().includes(ql);
      return matchesStatus && matchesSearch;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "date") { av = new Date(a.date).getTime(); bv = new Date(b.date).getTime(); }
      else if (sortKey === "invoiceNo") { av = a.invoiceNo; bv = b.invoiceNo; }
      else { av = (a as unknown as Record<string, number>)[sortKey]; bv = (b as unknown as Record<string, number>)[sortKey]; }
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [invoices, q, statusFilter, sortKey, sortDir]);

  const { paged, page, totalPages, setPage, size, setSize, range } = usePagination<Invoice>(filtered, 10);

  const stats = useMemo(() => {
    if (!invoices) return { revenue: 0, collected: 0, due: 0, overdue: 0 };
    return {
      revenue: invoices.reduce((s, i) => s + (i.total || 0), 0),
      collected: invoices.reduce((s, i) => s + (i.paid || 0), 0),
      due: invoices.reduce((s, i) => s + (i.due || 0), 0),
      overdue: invoices.filter((i) => i.status === "unpaid").length,
    };
  }, [invoices]);

  const selected = invoices?.find((i) => i.id === viewId) || null;

  const handleExport = () => {
    if (!filtered.length) { toast.info("No invoices to export"); return; }
    exportToCSV("invoices", [
      "Invoice No", "Date", "Patient", "Type", "Subtotal", "Discount", "Tax",
      "Total", "Paid", "Due", "Status", "Method",
    ], filtered.map((i) => [
      i.invoiceNo, formatDate(i.date), i.patient.name, i.type,
      i.subtotal, i.discount, i.tax, i.total, i.paid, i.due,
      statusLabel(i.status), i.paymentMethod || "",
    ]));
    toast.success(`Exported ${filtered.length} invoices to CSV`);
  };

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-10 text-center text-sm text-rose-600">
            Failed to load invoices: {error}
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
            <Receipt className="w-5 h-5 text-teal-600" /> Billing &amp; Invoices
          </h2>
          <p className="text-sm text-muted-foreground">
            {invoices?.length ?? 0} invoices · {formatRs(stats.collected)} collected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setBillTypeOpen(true)}
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Revenue", value: formatRs(stats.revenue), icon: TrendingUp, accent: "from-teal-500 to-teal-600" },
          { label: "Collected", value: formatRs(stats.collected), icon: Wallet, accent: "from-emerald-500 to-emerald-600" },
          { label: "Outstanding Due", value: formatRs(stats.due), icon: AlertTriangle, accent: "from-amber-500 to-orange-500" },
          { label: "Overdue Invoices", value: String(stats.overdue), icon: Receipt, accent: "from-rose-500 to-rose-600" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters + table */}
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

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 text-xs"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              >
                {sortDir === "asc" ? "Asc" : "Desc"}
              </Button>
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
                      ({invoices?.filter((i) => i.status === s).length ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Invoice No</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : paged.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{inv.invoiceNo}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(inv.date)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{inv.patient.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{inv.patient.patientCode}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-[10px] capitalize ${TYPE_COLORS[inv.type] || "bg-gray-100"}`}>
                        {inv.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatRs(inv.total)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm text-emerald-600">
                      {formatRs(inv.paid)}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-medium ${inv.due > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                      {formatRs(inv.due)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${statusColors[inv.status] || "bg-gray-100"}`}>
                        {statusLabel(inv.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(inv.status === "unpaid" || inv.status === "partial") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setPayInvoice(inv)}
                          >
                            <CreditCard className="w-3 h-3" /> Pay
                          </Button>
                        )}
                        {inv.status === "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                            onClick={() => setRefundInvoice(inv)}
                          >
                            <RotateCcw className="w-3 h-3" /> Refund
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-teal-600 text-xs"
                          onClick={() => setViewId(inv.id)}
                        >
                          <Eye className="w-3 h-3" /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                          title="Print invoice"
                          onClick={() => printInvoice(inv)}
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

      {/* Create invoice dialog */}
      <BillTypeDialog
        open={billTypeOpen}
        onOpenChange={setBillTypeOpen}
        onSelect={(type) => {
          setBillTypeOpen(false);
          setSelectedBillType(type);
          setCreateOpen(true);
        }}
      />
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        billType={selectedBillType}
        onCreated={() => { setCreateOpen(false); setSelectedBillType(null); refresh(); toast.success("Invoice created successfully"); }}
      />

      {/* Collect payment dialog */}
      <CollectPaymentDialog
        invoice={payInvoice}
        onOpenChange={(o) => !o && setPayInvoice(null)}
        onPaid={() => { setPayInvoice(null); refresh(); }}
      />

      {/* Refund confirm */}
      <RefundDialog
        invoice={refundInvoice}
        onOpenChange={(o) => !o && setRefundInvoice(null)}
        onRefunded={() => { setRefundInvoice(null); refresh(); }}
      />

      {/* View invoice sheet */}
      <Sheet open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <InvoiceDetail invoice={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- Bill Type Selection Dialog ---------- */

interface BillTypeInfo {
  id: string;
  label: string;
  description: string;
  icon: typeof Stethoscope;
  gradient: string;
}

const BILL_TYPES: BillTypeInfo[] = [
  { id: "consultation", label: "Consultation", description: "General consultation billing", icon: Stethoscope, gradient: "from-teal-500 to-teal-600" },
  { id: "pharmacy", label: "Pharmacy", description: "Medicine and drug billing", icon: Pill, gradient: "from-violet-500 to-violet-600" },
  { id: "lab", label: "Lab Test", description: "Laboratory test and diagnostics", icon: FlaskConical, gradient: "from-cyan-500 to-cyan-600" },
  { id: "package", label: "Health Package", description: "Health checkup packages", icon: Package, gradient: "from-amber-500 to-amber-600" },
  { id: "ipd", label: "IPD", description: "In-patient department charges", icon: BedDouble, gradient: "from-rose-500 to-rose-600" },
];

function BillTypeDialog({
  open, onOpenChange, onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (type: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Select Invoice Type
          </DialogTitle>
          <DialogDescription>Choose the type of bill you want to create.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {BILL_TYPES.map((bt) => (
            <button
              key={bt.id}
              type="button"
              onClick={() => onSelect(bt.id)}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/60 hover:shadow-md transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bt.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                <bt.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{bt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Create Invoice Dialog ---------- */

function CreateInvoiceDialog({
  open, onOpenChange, onCreated, billType,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void; billType: string | null }) {
  const { data: patients } = useFetch<PatientLite[]>("/api/patients");
  const { data: settings } = useFetch<Record<string, string>>("/api/settings");
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("consultation");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", qty: 1, rate: 0, amount: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(13);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paid, setPaid] = useState(0);
  const [saving, setSaving] = useState(false);

  // Consultation-specific
  const [consultationFee, setConsultationFee] = useState(0);
  const [doctorName, setDoctorName] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");

  // Pharmacy-specific
  const [medItems, setMedItems] = useState<{ medicineName: string; qty: number; unitPrice: number; batchNo: string; expiry: string; }[]>([
    { medicineName: "", qty: 1, unitPrice: 0, batchNo: "", expiry: "" },
  ]);

  // Lab-specific
  const [labItems, setLabItems] = useState<{ testName: string; sampleType: string; rate: number; }[]>([
    { testName: "", sampleType: "", rate: 0 },
  ]);

  // Package-specific
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState(0);
  const [includedServices, setIncludedServices] = useState("");

  // IPD-specific
  const [roomType, setRoomType] = useState("general");
  const [admissionDate, setAdmissionDate] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [ipdItems, setIpdItems] = useState<InvoiceItem[]>([{ description: "", qty: 1, rate: 0, amount: 0 }]);
  const [dailyRoomCharge, setDailyRoomCharge] = useState(0);
  const [medicineCharges, setMedicineCharges] = useState(0);

  useEffect(() => {
    if (billType && open) {
      setType(billType);
    }
  }, [billType, open]);

  // Load tax rate from settings when dialog opens
  useEffect(() => {
    if (open && settings?.tax_rate) {
      setTaxRate(Number(settings.tax_rate) || 13);
    }
  }, [open, settings]);

  // Compute subtotal from type-specific items
  const itemsSubtotal = useMemo(() => {
    if (type === "consultation") return consultationFee;
    if (type === "pharmacy") return medItems.reduce((s, m) => s + (Number(m.qty) || 0) * (Number(m.unitPrice) || 0), 0);
    if (type === "lab") return labItems.reduce((s, l) => s + (Number(l.rate) || 0), 0);
    if (type === "package") return packagePrice;
    if (type === "ipd") return ipdItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0) + dailyRoomCharge + medicineCharges;
    return items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  }, [type, consultationFee, medItems, labItems, packagePrice, ipdItems, dailyRoomCharge, medicineCharges, items]);

  const subtotal = itemsSubtotal;
  const taxAmount = useMemo(() => (subtotal - discount) * (taxRate / 100), [subtotal, discount, taxRate]);
  const total = Math.max(0, subtotal - discount + taxAmount);
  const due = Math.max(0, total - paid);

  // Pharmacy helpers
  const updateMedItem = (idx: number, patch: Partial<typeof medItems[0]>) => {
    setMedItems((prev) => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };
  const addMedItem = () => setMedItems((p) => [...p, { medicineName: "", qty: 1, unitPrice: 0, batchNo: "", expiry: "" }]);
  const removeMedItem = (idx: number) => setMedItems((p) => p.filter((_, i) => i !== idx));

  // Lab helpers
  const updateLabItem = (idx: number, patch: Partial<typeof labItems[0]>) => {
    setLabItems((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const addLabItem = () => setLabItems((p) => [...p, { testName: "", sampleType: "", rate: 0 }]);
  const removeLabItem = (idx: number) => setLabItems((p) => p.filter((_, i) => i !== idx));

  // IPD helpers
  const updateIpdItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setIpdItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.amount = (Number(next.qty) || 0) * (Number(next.rate) || 0);
      return next;
    }));
  };
  const addIpdItem = () => setIpdItems((p) => [...p, { description: "", qty: 1, rate: 0, amount: 0 }]);
  const removeIpdItem = (idx: number) => setIpdItems((p) => p.filter((_, i) => i !== idx));

  const buildItems = (): InvoiceItem[] => {
    if (type === "consultation") {
      return [{ description: `Consultation - Dr. ${doctorName || "TBD"}`, qty: 1, rate: consultationFee, amount: consultationFee }];
    }
    if (type === "pharmacy") {
      return medItems.filter((m) => m.medicineName).map((m) => ({
        description: `${m.medicineName}${m.batchNo ? ` [${m.batchNo}]` : ""}`,
        qty: Number(m.qty) || 0,
        rate: Number(m.unitPrice) || 0,
        amount: (Number(m.qty) || 0) * (Number(m.unitPrice) || 0),
      }));
    }
    if (type === "lab") {
      return labItems.filter((l) => l.testName).map((l) => ({
        description: `${l.testName}${l.sampleType ? ` (${l.sampleType})` : ""}`,
        qty: 1,
        rate: Number(l.rate) || 0,
        amount: Number(l.rate) || 0,
      }));
    }
    if (type === "package") {
      return [{ description: `Package: ${packageName || "Health Package"}`, qty: 1, rate: packagePrice, amount: packagePrice }];
    }
    if (type === "ipd") {
      const allItems: InvoiceItem[] = [];
      if (dailyRoomCharge > 0) allItems.push({ description: `Room Charge (${roomType})`, qty: 1, rate: dailyRoomCharge, amount: dailyRoomCharge });
      if (medicineCharges > 0) allItems.push({ description: "Medicine Charges", qty: 1, rate: medicineCharges, amount: medicineCharges });
      ipdItems.filter((it) => it.description).forEach((it) => allItems.push(it));
      return allItems;
    }
    return items.filter((i) => i.description);
  };

  const reset = () => {
    setPatientId("");
    setType("consultation");
    setItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
    setDiscount(0);
    setTaxRate(settings?.tax_rate ? Number(settings.tax_rate) || 13 : 13);
    setPaymentMethod("Cash");
    setPaid(0);
    setConsultationFee(0);
    setDoctorName("");
    setConsultationNotes("");
    setMedItems([{ medicineName: "", qty: 1, unitPrice: 0, batchNo: "", expiry: "" }]);
    setLabItems([{ testName: "", sampleType: "", rate: 0 }]);
    setPackageName("");
    setPackagePrice(0);
    setIncludedServices("");
    setRoomType("general");
    setAdmissionDate("");
    setDischargeDate("");
    setIpdItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
    setDailyRoomCharge(0);
    setMedicineCharges(0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) { toast.error("Please select a patient"); return; }
    const finalItems = buildItems();
    if (finalItems.length === 0) {
      toast.error("Add at least one invoice item"); return;
    }
    setSaving(true);
    try {
      const body = {
        patientId,
        type,
        subtotal,
        discount: Number(discount) || 0,
        tax: taxAmount,
        total,
        paid: Number(paid) || 0,
        due,
        status: paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid",
        paymentMethod,
        items: finalItems.map((i) => ({
          description: i.description,
          qty: Number(i.qty) || 0,
          rate: Number(i.rate) || 0,
          amount: (Number(i.qty) || 0) * (Number(i.rate) || 0),
        })),
      };
      const res = await fetchAPI("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "consultation" && <Stethoscope className="w-5 h-5 text-teal-600" />}
            {type === "pharmacy" && <Pill className="w-5 h-5 text-violet-600" />}
            {type === "lab" && <FlaskConical className="w-5 h-5 text-cyan-600" />}
            {type === "package" && <Package className="w-5 h-5 text-amber-600" />}
            {type === "ipd" && <BedDouble className="w-5 h-5 text-rose-600" />}
            New {BILL_TYPES.find((b) => b.id === type)?.label || "Invoice"}
          </DialogTitle>
          <DialogDescription>Fill in patient details and charges. Totals compute automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Patient Selector — full width */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Search and select patient..." /></SelectTrigger>
              <SelectContent>
                {patients?.slice(0, 100).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · <span className="font-mono text-xs">{p.patientCode}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific sections */}
          {type === "consultation" && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50/80 to-white dark:from-teal-950/30 dark:to-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Consultation Details</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Doctor Name</Label>
                  <Input placeholder="e.g. Dr. Sharma" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Consultation Fee (Rs)</Label>
                  <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(Number(e.target.value))} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <textarea
                  className="w-full h-16 rounded-lg border bg-white dark:bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  placeholder="Additional notes..."
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {type === "pharmacy" && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-950/30 dark:to-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-violet-600" />
                  </div>
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Medication Items</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addMedItem}>
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {medItems.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-12 sm:col-span-3 h-9 text-sm" placeholder="Medicine Name" value={m.medicineName} onChange={(e) => updateMedItem(idx, { medicineName: e.target.value })} />
                    <Input type="number" className="col-span-3 sm:col-span-1 h-9 text-sm" placeholder="Qty" value={m.qty} onChange={(e) => updateMedItem(idx, { qty: Number(e.target.value) })} />
                    <Input type="number" className="col-span-3 sm:col-span-2 h-9 text-sm" placeholder="Unit Price" value={m.unitPrice} onChange={(e) => updateMedItem(idx, { unitPrice: Number(e.target.value) })} />
                    <Input className="col-span-3 sm:col-span-2 h-9 text-sm" placeholder="Batch No" value={m.batchNo} onChange={(e) => updateMedItem(idx, { batchNo: e.target.value })} />
                    <Input type="date" className="col-span-3 sm:col-span-2 h-9 text-sm" value={m.expiry} onChange={(e) => updateMedItem(idx, { expiry: e.target.value })} />
                    <div className="col-span-2 text-right text-sm font-medium text-violet-600">{formatRs((Number(m.qty) || 0) * (Number(m.unitPrice) || 0))}</div>
                    <Button type="button" variant="ghost" size="sm" className="col-span-1 h-8 w-8 p-0 text-rose-500 hover:text-rose-600" onClick={() => removeMedItem(idx)} disabled={medItems.length === 1}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === "lab" && (
            <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/80 to-white dark:from-cyan-950/30 dark:to-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-cyan-600" />
                  </div>
                  <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">Lab Test Items</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addLabItem}>
                  <Plus className="w-3.5 h-3.5" /> Add Test
                </Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {labItems.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-12 sm:col-span-4 h-9 text-sm" placeholder="Test Name" value={l.testName} onChange={(e) => updateLabItem(idx, { testName: e.target.value })} />
                    <Input className="col-span-5 sm:col-span-4 h-9 text-sm" placeholder="Sample Type" value={l.sampleType} onChange={(e) => updateLabItem(idx, { sampleType: e.target.value })} />
                    <Input type="number" className="col-span-5 sm:col-span-3 h-9 text-sm" placeholder="Rate" value={l.rate} onChange={(e) => updateLabItem(idx, { rate: Number(e.target.value) })} />
                    <Button type="button" variant="ghost" size="sm" className="col-span-2 h-8 w-8 p-0 text-rose-500 hover:text-rose-600" onClick={() => removeLabItem(idx)} disabled={labItems.length === 1}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === "package" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/30 dark:to-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Health Package Details</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Package Name</Label>
                  <Input placeholder="e.g. Full Body Checkup" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Package Price (Rs)</Label>
                  <Input type="number" value={packagePrice} onChange={(e) => setPackagePrice(Number(e.target.value))} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Included Services</Label>
                <textarea
                  className="w-full h-16 rounded-lg border bg-white dark:bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  placeholder="List included services..."
                  value={includedServices}
                  onChange={(e) => setIncludedServices(e.target.value)}
                />
              </div>
            </div>
          )}

          {type === "ipd" && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/30 dark:to-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <BedDouble className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">IPD Details</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="semi-private">Semi-Private</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="icu">ICU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Admission Date</Label>
                  <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Discharge Date</Label>
                  <Input type="date" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Daily Room Charge (Rs)</Label>
                  <Input type="number" value={dailyRoomCharge} onChange={(e) => setDailyRoomCharge(Number(e.target.value))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medicine Charges (Rs)</Label>
                  <Input type="number" value={medicineCharges} onChange={(e) => setMedicineCharges(Number(e.target.value))} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Treatment Items</Label>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addIpdItem}>
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                  {ipdItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-12 sm:col-span-5 h-9 text-sm" placeholder="Description" value={it.description} onChange={(e) => updateIpdItem(idx, { description: e.target.value })} />
                      <Input type="number" className="col-span-3 sm:col-span-2 h-9 text-sm" placeholder="Qty" value={it.qty} onChange={(e) => updateIpdItem(idx, { qty: Number(e.target.value) })} />
                      <Input type="number" className="col-span-4 sm:col-span-2 h-9 text-sm" placeholder="Rate" value={it.rate} onChange={(e) => updateIpdItem(idx, { rate: Number(e.target.value) })} />
                      <div className="col-span-4 sm:col-span-2 text-right text-sm font-medium text-rose-600">{formatRs(it.amount)}</div>
                      <Button type="button" variant="ghost" size="sm" className="col-span-1 h-8 w-8 p-0 text-rose-500 hover:text-rose-600" onClick={() => removeIpdItem(idx)} disabled={ipdItems.length === 1}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Discount / tax / payment */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount (Rs)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Paid (Rs)</Label>
                <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} className="h-9" />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatRs(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-medium text-rose-600">- {formatRs(discount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-medium">+ {formatRs(taxAmount)}</span></div>
            <div className="flex justify-between font-semibold border-t border-teal-200 dark:border-teal-800 pt-2 mt-1"><span>Total</span><span className="text-teal-700 dark:text-teal-300">{formatRs(total)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span className="font-medium">{formatRs(paid)}</span></div>
            <div className="flex justify-between font-semibold text-rose-600"><span>Due</span><span>{formatRs(due)}</span></div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Creating..." : <><FileText className="w-4 h-4" /> Create Invoice</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Collect Payment Dialog ---------- */

function CollectPaymentDialog({
  invoice, onOpenChange, onPaid,
}: {
  invoice: Invoice | null;
  onOpenChange: (v: boolean) => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);

  // Reset amount when invoice changes
  useEffect(() => {
    if (invoice) {
      setAmount(invoice.due || 0);
      setMethod(invoice.paymentMethod || "Cash");
    }
  }, [invoice]);

  if (!invoice) return null;

  const newPaidTotal = (invoice.paid || 0) + (Number(amount) || 0);
  const newDue = Math.max(0, invoice.total - newPaidTotal);
  const newStatus = newDue <= 0 ? "paid" : newPaidTotal > 0 ? "partial" : "unpaid";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: newPaidTotal, status: newStatus, paymentMethod: method }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      toast.success(`Payment of ${formatRs(amount)} recorded for ${invoice.invoiceNo}`);
      onPaid();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" /> Collect Payment
          </DialogTitle>
          <DialogDescription>
            Invoice <span className="font-mono">{invoice.invoiceNo}</span> · {invoice.patient.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span className="font-medium">{formatRs(invoice.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatRs(invoice.paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Outstanding Due</span><span className="text-rose-600">{formatRs(invoice.due)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (Rs) *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={0} max={invoice.due} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/20 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">New Paid Total</span><span className="text-emerald-600 font-medium">{formatRs(newPaidTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Remaining Due</span><span className="font-medium">{formatRs(newDue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">New Status</span>
              <Badge className={`text-[10px] ${statusColors[newStatus]}`}>{statusLabel(newStatus)}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Refund Dialog ---------- */

function RefundDialog({
  invoice, onOpenChange, onRefunded,
}: {
  invoice: Invoice | null;
  onOpenChange: (v: boolean) => void;
  onRefunded: () => void;
}) {
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "refunded" }),
      });
      if (!res.ok) throw new Error("Failed to refund");
      toast.success(`${invoice.invoiceNo} marked as refunded`);
      onRefunded();
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={!!invoice} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" /> Refund Invoice?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to mark invoice{" "}
            <span className="font-mono font-semibold text-foreground">{invoice.invoiceNo}</span> for{" "}
            <span className="font-semibold text-foreground">{invoice.patient.name}</span> (Total{" "}
            <span className="font-semibold text-foreground">{formatRs(invoice.total)}</span>) as{" "}
            <span className="font-semibold text-rose-600">Refunded</span>. This action will update the
            invoice status and cannot be undone from this view.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={(e) => { e.preventDefault(); confirm(); }}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {saving ? "Processing…" : "Yes, Refund"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- Invoice Detail Sheet ---------- */

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              <span className="font-mono">{invoice.invoiceNo}</span>
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span>{formatDate(invoice.date)}</span>
              <Badge variant="outline" className={`text-[10px] capitalize ${TYPE_COLORS[invoice.type] || "bg-gray-100"}`}>
                {invoice.type}
              </Badge>
              <Badge className={`text-[10px] ${statusColors[invoice.status]}`}>{statusLabel(invoice.status)}</Badge>
              {invoice.paymentMethod && (
                <span className="text-xs">via {invoice.paymentMethod}</span>
              )}
            </SheetDescription>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printInvoice(invoice)}>
              <Printer className="w-4 h-4" /> Print Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info("Email gateway not configured — invoice PDF ready to attach")}
            >
              <Mail className="w-4 h-4" /> Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info("SMS gateway not configured — invoice PDF ready to attach")}
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </Button>
          </div>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-5">
        {/* Patient info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Bill To</p>
            <p className="font-semibold mt-0.5">{invoice.patient.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{invoice.patient.patientCode}</p>
            <p className="text-xs text-muted-foreground">{invoice.patient.phone}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Invoice Total</p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{formatRs(invoice.total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paid <span className="text-emerald-600 font-medium">{formatRs(invoice.paid)}</span> · Due{" "}
              <span className={`font-medium ${invoice.due > 0 ? "text-rose-600" : ""}`}>{formatRs(invoice.due)}</span>
            </p>
          </div>
        </div>

        {/* Items table */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Line Items</h4>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-16">Qty</TableHead>
                  <TableHead className="text-right w-24">Rate</TableHead>
                  <TableHead className="text-right w-28">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No items</TableCell></TableRow>
                ) : invoice.items.map((it) => (
                  <TableRow key={it.id || it.description}>
                    <TableCell className="text-sm">{it.description}</TableCell>
                    <TableCell className="text-right text-sm">{it.qty}</TableCell>
                    <TableCell className="text-right text-sm">{formatRs(it.rate)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRs(it.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals breakdown */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm ml-auto max-w-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-rose-600">- {formatRs(invoice.discount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatRs(invoice.tax)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5 text-base"><span>Total</span><span>{formatRs(invoice.total)}</span></div>
          <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatRs(invoice.paid)}</span></div>
          <div className="flex justify-between font-semibold text-rose-600"><span>Due</span><span>{formatRs(invoice.due)}</span></div>
        </div>
      </div>
    </div>
  );
}
