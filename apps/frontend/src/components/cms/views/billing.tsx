"use client";
import { fetchAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { Barcode } from "@/components/ui/barcode";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DoctorSearch } from "@/components/ui/doctor-search";
import { PatientSearch } from "@/components/ui/patient-search";
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
  FileText, Trash2,
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
function buildInvoiceHTML(inv: Invoice, settings?: Record<string, string>): string {
  const statusClass =
    inv.status === "paid" ? "emerald" :
    inv.status === "partial" ? "teal" :
    inv.status === "refunded" ? "rose" : "rose";
  const statusBadge = `<span class="badge ${statusClass}">${statusLabel(inv.status)}</span>`;
  const clinicName = settings?.clinic_name || settings?.organization_name || "Health Center";
  const footerText = settings?.billing_footer_text || `Thank you for choosing ${clinicName}`;

  const patientGrid = `
    <div class="info-grid-2col">
      <div class="info-cell"><span class="label">Bill To</span> <strong>${escapeHTML(inv.patient.name)}</strong> <span class="dim">(${escapeHTML(inv.patient.patientCode)})</span></div>
      <div class="info-cell"><span class="label">Phone</span> ${escapeHTML(inv.patient.phone || "—")}</div>
      <div class="info-cell"><span class="label">Type</span> ${escapeHTML(inv.type)}</div>
      <div class="info-cell"><span class="label">Payment</span> ${escapeHTML(inv.paymentMethod || "—")}</div>
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

  return `${docHeader(inv.invoiceNo, "INVOICE", formatDate(inv.date), statusBadge, clinicName)}
    ${patientGrid}
    ${itemsTable}
    ${totals}
    ${footerText ? `<p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">${escapeHTML(footerText)}</p>` : ""}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Received By</div><div class="role">Patient / Guardian</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">Authorized Signatory</div><div class="role">${escapeHTML(clinicName)}</div></div>
    </div>`;
}

function escapeHTML(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function printInvoice(inv: Invoice, settings?: Record<string, string>) {
  const clinicName = settings?.clinic_name || settings?.organization_name;
  printHTML(`Invoice ${inv.invoiceNo}`, buildInvoiceHTML(inv, settings), clinicName);
}

/* ---------- OPD Card HTML builder ---------- */
function buildOPDCardHTML(inv: Invoice, settings?: Record<string, string>): string {
  const barcodeVal = inv.patient.patientCode || inv.invoiceNo;
    const patientName = inv.patient.name || "Patient";

  // Extract doctor name from consultation item description
  // Format: "Consultation - Dr. DoctorName" or "Consultation - DoctorName"
  let doctorName = "";
  const consultItem = (inv.items || []).find((i) => i.description.toLowerCase().includes("consultation"));
  if (consultItem) {
    const desc = consultItem.description;
    // Remove "Consultation" prefix and any dash/en-dash separator
    let extracted = desc.replace(/^consultation\s*[-–—]\s*/i, "").trim();
    // If it looks like a CUID, it's not a real name
    if (extracted.length > 20 && /^c[a-z0-9]{20,}$/i.test(extracted)) {
      doctorName = "";
    } else {
      // Remove all leading "Dr." prefixes (we add it back in display)
      while (extracted.toLowerCase().startsWith("dr.")) {
        extracted = extracted.substring(3).trim();
      }
      doctorName = extracted;
    }
  }

  return `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; }
    .opd-card { width: 350px; border: 2px solid #0d9488; border-radius: 8px; overflow: hidden; margin: 20px auto; }
    .opd-header { background: linear-gradient(135deg, #0d9488, #10b981); color: white; padding: 12px 16px; text-align: center; }
    .opd-header .logo { height: 28px; margin-bottom: 4px; }
    .opd-header h2 { font-size: 16px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .opd-header .sub { font-size: 10px; opacity: 0.9; margin-top: 2px; text-transform: uppercase; letter-spacing: 2px; }
    .opd-body { padding: 12px 16px; font-size: 11px; }
    .opd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .opd-field { display: flex; align-items: baseline; gap: 4px; }
    .opd-field.full { grid-column: 1 / -1; }
    .opd-field-label { color: #64748b; font-weight: 600; white-space: nowrap; font-size: 10px; text-transform: uppercase; }
    .opd-field-label::after { content: ":"; }
    .opd-field-value { font-weight: 700; color: #1e293b; font-size: 11px; }
    .opd-name-row { grid-column: 1 / -1; display: flex; align-items: center; gap: 6px; padding: 6px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin: 4px 0; }
    .opd-name { font-size: 14px; font-weight: 700; color: #1e293b; }
    .opd-age-gender { font-size: 11px; font-weight: 600; color: #0d9488; }
    .opd-barcode-row { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; }
    .opd-barcode svg { max-width: 140px; height: 32px; }
    .opd-footer { text-align: center; padding: 6px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; }
    @media print { .opd-card { margin: 0; border: 2px solid #0d9488; } }
  </style>
  <div class="opd-card">
    <div class="opd-header">
      <div class="sub">Consultation</div>
    </div>
    <div class="opd-body">
      <div class="opd-grid">
        <div class="opd-field"><span class="opd-field-label">Doctor</span><span class="opd-field-value">${doctorName ? `Dr. ${escapeHTML(doctorName)}` : "—"}</span></div>
        <div class="opd-field"><span class="opd-field-label">Room No</span><span class="opd-field-value">${settings?.room_no || "—"}</span></div>
        <div class="opd-field"><span class="opd-field-label">File No</span><span class="opd-field-value">${escapeHTML(inv.patient.patientCode)}</span></div>
        <div class="opd-field"><span class="opd-field-label">Country</span><span class="opd-field-value">NP</span></div>
      </div>
      <div class="opd-name-row">
        <span class="opd-field-label">Patient</span>
        <span class="opd-name">${escapeHTML(patientName)}</span>
      </div>
      <div class="opd-grid">
        <div class="opd-field full"><span class="opd-field-label">Address</span><span class="opd-field-value">—</span></div>
        <div class="opd-field"><span class="opd-field-label">Phone</span><span class="opd-field-value">${escapeHTML(inv.patient.phone || "—")}</span></div>
        <div class="opd-field"><span class="opd-field-label">Date</span><span class="opd-field-value">${formatDate(inv.date)}</span></div>
      </div>
      <div class="opd-barcode-row">
        <div class="opd-barcode">
          <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            ${generateBarcodeSVG(barcodeVal)}
            <text x="100" y="38" text-anchor="middle" font-size="7" fill="#64748b" font-family="monospace">${escapeHTML(barcodeVal)}</text>
          </svg>
        </div>
      </div>
    </div>
  </div>`;
}

function generateBarcodeSVG(value: string): string {
  // CODE128 encoding for clear thermal printer output
  let bars = "";
  const barPatterns: Record<string, string> = {
    "0": "11011001100", "1": "11001101100", "2": "11001100110", "3": "10010011000", "4": "10010001100",
    "5": "10001001100", "6": "10011001000", "7": "10011000100", "8": "10001100100", "9": "11001001000",
    "A": "11001000100", "B": "11000100100", "C": "11001000100", "D": "10110011100", "E": "10011011100",
    "F": "10011001110", "G": "10111001100", "H": "10011101100", "I": "10011100110", "J": "11001110010",
    "K": "11001011100", "L": "11001001110", "M": "11011100100", "N": "11001110100", "O": "11101101110",
    "P": "11101001100", "Q": "11100101100", "R": "11100100110", "S": "11101100100", "T": "11100110100",
    "U": "11100110010", "V": "11011011000", "W": "11011000110", "X": "11000110110", "Y": "10100011000",
    "Z": "10001011000", "-": "10001000110", ".": "11101101110", " ": "10010110000",
    "$": "10010111000", "/": "10110011000", "+": "10011011000", "%": "11011010000", "*": "11010111010",
  };
  const startCode = "11010000100";
  const endCode = "1100011101011";
  const encoded = value.toUpperCase().split("").map(c => barPatterns[c] || "10111010000").join("");
  const allBars = startCode + encoded + endCode;
  let cx = 0;
  for (let i = 0; i < allBars.length; i++) {
    if (allBars[i] === "1") {
      bars += `<rect x="${cx}" y="0" width="1.5" height="28" fill="#000"/>`;
    }
    cx += 1.5;
  }
  const totalWidth = cx;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 36" style="width:${totalWidth * 0.55}px;height:36px;">
    <rect x="0" y="0" width="${totalWidth}" height="36" fill="white"/>
    ${bars}
    <text x="${totalWidth / 2}" y="35" text-anchor="middle" font-size="7" fill="#000" font-family="'Courier New',monospace" font-weight="bold">${escapeHTML(value)}</text>
  </svg>`;
}

function printOPDCard(inv: Invoice, settings?: Record<string, string>) {
  const clinicName = settings?.clinic_name || settings?.organization_name;
  printHTML(`OPD Card - ${inv.invoiceNo}`, buildOPDCardHTML(inv, settings), clinicName);
}

export function BillingView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const branchId = useAppStore((s) => s.branchId);
  const { data: invoices, loading, error } = useFetch<Invoice[]>(
    refreshKey ? `/api/invoices?_r=${refreshKey}&branchId=${branchId || ""}` : `/api/invoices?branchId=${branchId || ""}`,
  );
  const { data: settings } = useFetch<Record<string, string>>("/api/settings");
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
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      overdue: invoices.filter((i) => i.status === "unpaid" && i.due > 0).length,
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
            disabled={!branchId}
            title={!branchId ? "Select a branch first" : ""}
            onClick={() => branchId && setBillTypeOpen(true)}
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

      {!branchId && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Branch Selected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Select a branch from the header to create invoices. All Branches view is read-only.</p>
          </div>
        </div>
      )}

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
                    <TableCell className="font-mono text-xs">
                      <div>{inv.invoiceNo}</div>
                      <Barcode value={inv.invoiceNo} height={18} fontSize={0} displayValue={false} className="max-w-[80px] mt-0.5" />
                    </TableCell>
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
                          onClick={() => printInvoice(inv, settings ?? undefined)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {inv.type === "consultation" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                            title="Print OPD Card"
                            onClick={() => printOPDCard(inv, settings ?? undefined)}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          title="Delete invoice"
                          onClick={() => setDeleteInvoice(inv)}
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
          {selected && <InvoiceDetail invoice={selected} settings={settings ?? undefined} onDelete={() => { setDeleteInvoice(selected); setViewId(null); }} />}
        </SheetContent>
      </Sheet>

      {/* Delete invoice confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={(o) => !o && setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete invoice{" "}
              <span className="font-mono font-semibold text-foreground">{deleteInvoice?.invoiceNo}</span> for{" "}
              <span className="font-semibold text-foreground">{deleteInvoice?.patient.name}</span> (Total{" "}
              <span className="font-semibold text-foreground">{formatRs(deleteInvoice?.total || 0)}</span>).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteInvoice) return;
                setDeleting(true);
                try {
                  const res = await fetchAPI(`/api/invoices/${deleteInvoice.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    toast.error(err.error || "Failed to delete invoice");
                  } else {
                    toast.success(`${deleteInvoice.invoiceNo} deleted`);
                    setDeleteInvoice(null);
                    refresh();
                  }
                } catch {
                  toast.error("Failed to delete invoice");
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { data: settings } = useFetch<Record<string, string>>("/api/settings");
  const { data: doctors } = useFetch<{ id: string; name: string; consultationFee: number; specialization?: string }[]>("/api/doctors");
  const { data: labTests } = useFetch<{ id: string; name: string; code: string; price: number; sampleType: string; category: string; isPackage: boolean; status: string }[]>("/api/lab-tests-master");
  const { data: labPackages } = useFetch<{ id: string; name: string; code: string; price: number; description?: string; status: string }[]>("/api/lab-packages");
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("consultation");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", qty: 1, rate: 0, amount: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(13);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paid, setPaid] = useState(0);
  const [saving, setSaving] = useState(false);
  const branchId = useAppStore((s) => s.branchId);

  const [consultationFee, setConsultationFee] = useState(0);
  const [doctorName, setDoctorName] = useState("");

  // Pharmacy-specific
  const [medItems, setMedItems] = useState<{ medicineName: string; qty: number; unitPrice: number; batchNo: string; expiry: string; }[]>([
    { medicineName: "", qty: 1, unitPrice: 0, batchNo: "", expiry: "" },
  ]);

  // Lab-specific
  const [labItems, setLabItems] = useState<{ testId: string; testName: string; sampleType: string; rate: number; }[]>([
    { testId: "", testName: "", sampleType: "", rate: 0 },
  ]);

  // Package-specific
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState(0);

  // IPD-specific
  const [ipdItems, setIpdItems] = useState<InvoiceItem[]>([{ description: "", qty: 1, rate: 0, amount: 0 }]);
  const [dailyRoomCharge, setDailyRoomCharge] = useState(0);
  const [medicineCharges, setMedicineCharges] = useState(0);
  const [roomType, setRoomType] = useState("general");

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

  // Auto-fill consultation fee when doctor is selected
  useEffect(() => {
    if (doctorName && doctors) {
      const doctor = doctors.find((d) => d.id === doctorName);
      if (doctor && doctor.consultationFee > 0) {
        setConsultationFee(doctor.consultationFee);
      }
    }
  }, [doctorName, doctors]);

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
  const change = Math.max(0, paid - total);
  const due = Math.max(0, total - paid);

  // Auto-fill paid amount to match total for consultation
  useEffect(() => {
    if (type === "consultation" && total > 0 && paid === 0) {
      setPaid(total);
    }
  }, [total, type, paid]);

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
  const addLabItem = () => setLabItems((p) => [...p, { testId: "", testName: "", sampleType: "", rate: 0 }]);
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
      const doc = doctors?.find((d) => d.id === doctorName);
      const displayName = doc ? doc.name : doctorName || "TBD";
      return [{ description: `Consultation - Dr. ${displayName}`, qty: 1, rate: consultationFee, amount: consultationFee }];
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
    setMedItems([{ medicineName: "", qty: 1, unitPrice: 0, batchNo: "", expiry: "" }]);
    setLabItems([{ testId: "", testName: "", sampleType: "", rate: 0 }]);
    setPackageName("");
    setPackagePrice(0);
    setIpdItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
    setDailyRoomCharge(0);
    setMedicineCharges(0);
    setRoomType("general");
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
      const body: any = {
        branchId,
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
      // Include testIds for lab invoices to create lab orders
      if (type === "lab") {
        body.testIds = labItems.filter((l) => l.testId && l.testName).map((l) => l.testId);
        if (doctorName) body.doctorId = doctorName;
      }
      const res = await fetchAPI("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      const created = await res.json();
      reset();
      onCreated();
      if (type === "consultation") {
        toast.success("Consultation invoice created", {
          description: "Click to print OPD card",
          action: {
            label: "Print OPD Card",
            onClick: () => {
              const inv: Invoice = {
                id: created.id, invoiceNo: created.invoiceNo, patientId: created.patientId,
                type: "consultation", subtotal: created.subtotal, discount: created.discount,
                tax: created.tax, total: created.total, paid: created.paid, due: created.due,
                status: created.status, paymentMethod: created.paymentMethod, date: created.date,
                patient: { id: patientId, patientCode: "", name: "", phone: "" },
                items: finalItems.map((i) => ({ description: i.description, qty: i.qty, rate: i.rate, amount: i.amount })),
              };
              // Re-fetch the invoice to get full patient data
              fetchAPI(`/api/invoices/${created.id}`).then((r) => r.json()).then((full) => {
                printOPDCard(full, settings ?? undefined);
              }).catch(() => {
                printOPDCard(inv, settings ?? undefined);
              });
            },
          },
        });
      } else {
        toast.success("Invoice created successfully");
      }
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
          {/* Patient + Doctor selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PatientSearch value={patientId} onValueChange={setPatientId} label="" required />
            {type === "lab" && (
              <div className="space-y-1.5">
                <DoctorSearch value={doctorName} onValueChange={setDoctorName} label="Ordering Doctor" />
                {doctorName && doctors && (() => {
                  const doc = doctors.find((d) => d.id === doctorName);
                  return doc ? (
                    <p className="text-xs text-cyan-600 dark:text-cyan-400">
                      Dr. {doc.name} — {doc.specialization || "General"}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
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
                  <DoctorSearch value={doctorName} onValueChange={setDoctorName} label="Doctor Name" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Consultation Fee (Rs)</Label>
                  <div className="relative">
                    <Input type="number" min="0" value={consultationFee || ""} onChange={(e) => setConsultationFee(Math.max(0, Number(e.target.value)))} className="h-9 pr-16" placeholder="0" />
                    {doctorName && consultationFee > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-teal-600 bg-teal-100 dark:bg-teal-900/50 px-1.5 py-0.5 rounded font-medium">Auto-filled</span>
                    )}
                  </div>
                </div>
              </div>
              {doctorName && doctors && (() => {
                const doc = doctors.find((d) => d.id === doctorName);
                return doc?.specialization ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                    Specialization: {doc.specialization}
                  </p>
                ) : null;
              })()}
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
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addLabItem}>
                    <Plus className="w-3.5 h-3.5" /> Add Manual
                  </Button>
                </div>
              </div>

              {/* Quick Add from Test Master */}
              {labTests && labTests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <Select onValueChange={(testId) => {
                    const test = labTests.find((t) => t.id === testId);
                    if (test) {
                      setLabItems((prev) => {
                        const empty = prev.findIndex((l) => !l.testName);
                        const newItem = { testId: test.id, testName: test.name, sampleType: test.sampleType, rate: test.price };
                        if (empty >= 0) {
                          const next = [...prev];
                          next[empty] = newItem;
                          return next;
                        }
                        return [...prev, newItem];
                      });
                    }
                  }}>
                    <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Quick Add: Test" /></SelectTrigger>
                    <SelectContent>
                      {labTests.filter((t) => t.status === "active" && !t.isPackage).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {formatRs(t.price)} ({t.sampleType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(pkgId) => {
                    const pkg = labPackages?.find((p) => p.id === pkgId);
                    if (pkg) {
                      setLabItems((prev) => {
                        const empty = prev.findIndex((l) => !l.testName);
                        const newItem = { testId: pkg.id, testName: pkg.name, sampleType: "Multiple", rate: pkg.price };
                        if (empty >= 0) {
                          const next = [...prev];
                          next[empty] = newItem;
                          return next;
                        }
                        return [...prev, newItem];
                      });
                    }
                  }}>
                    <SelectTrigger className="h-8 w-auto text-xs"><SelectValue placeholder="Quick Add: Package" /></SelectTrigger>
                    <SelectContent>
                      {labPackages?.filter((p) => p.status === "active").map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatRs(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {labItems.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <Input className="h-9 text-sm" placeholder="Test Name" value={l.testName} onChange={(e) => updateLabItem(idx, { testName: e.target.value })} title={l.testName} />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Input className="h-9 text-sm" placeholder="Sample" value={l.sampleType} onChange={(e) => updateLabItem(idx, { sampleType: e.target.value })} />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Input type="number" min="0" className="h-9 text-sm" placeholder="Rate" value={l.rate} onChange={(e) => updateLabItem(idx, { rate: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600" onClick={() => removeLabItem(idx)} disabled={labItems.length === 1}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lab items total */}
              {labItems.some((l) => l.testName) && (
                <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
                  <span>{labItems.filter((l) => l.testName).length} test(s) selected</span>
                  <span className="font-medium text-cyan-700 dark:text-cyan-400">Subtotal: {formatRs(labItems.reduce((s, l) => s + (Number(l.rate) || 0), 0))}</span>
                </div>
              )}
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
                <Input type="number" min="0" value={discount || ""} onChange={(e) => { const v = e.target.value; setDiscount(v === "" ? 0 : Math.max(0, Number(v))); }} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" min="0" max="100" value={taxRate || ""} onChange={(e) => { const v = e.target.value; setTaxRate(v === "" ? 0 : Math.max(0, Math.min(100, Number(v)))); }} className="h-9" />
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
                <Input type="number" min="0" value={paid || ""} onChange={(e) => { const v = e.target.value; setPaid(v === "" ? 0 : Math.max(0, Number(v))); }} className="h-9" />
              </div>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={() => setPaid(total)} className="text-teal-600 hover:text-teal-700 underline underline-offset-2">Pay Full ({formatRs(total)})</button>
                <span className="text-muted-foreground">·</span>
                <button type="button" onClick={() => setPaid(Math.ceil(total / 2))} className="text-teal-600 hover:text-teal-700 underline underline-offset-2">Pay Half ({formatRs(Math.ceil(total / 2))})</button>
                <span className="text-muted-foreground">·</span>
                <button type="button" onClick={() => setPaid(0)} className="text-muted-foreground hover:text-foreground underline underline-offset-2">Clear</button>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-4 text-sm">
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatRs(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-medium text-rose-600">- {formatRs(discount)}</span></div>}
              {taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span className="font-medium">+ {formatRs(taxAmount)}</span></div>}
              <div className="flex justify-between font-semibold border-t border-teal-200 dark:border-teal-800 pt-2 mt-1"><span>Total</span><span className="text-teal-700 dark:text-teal-300">{formatRs(total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span className="font-medium">{formatRs(paid)}</span></div>
              {change > 0 ? (
                <div className="flex justify-between font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 -mx-4 px-4 py-1.5 rounded-lg">
                  <span>Change</span><span>{formatRs(change)}</span>
                </div>
              ) : due > 0 ? (
                <div className="flex justify-between font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 -mx-4 px-4 py-1.5 rounded-lg">
                  <span>Due</span><span>{formatRs(due)}</span>
                </div>
              ) : total > 0 ? (
                <div className="flex justify-between font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 -mx-4 px-4 py-1.5 rounded-lg">
                  <span>Fully Paid</span><span className="text-xs">✓</span>
                </div>
              ) : null}
            </div>
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
  const overpay = Math.max(0, newPaidTotal - invoice.total);
  const newStatus = newDue <= 0 ? "paid" : newPaidTotal > 0 ? "partial" : "unpaid";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: newPaidTotal, due: newDue, status: newStatus, paymentMethod: method }),
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
          {/* Invoice summary */}
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span className="font-medium">{formatRs(invoice.total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatRs(invoice.paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Outstanding Due</span><span className="text-rose-600">{formatRs(invoice.due)}</span></div>
          </div>

          {/* Payment inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (Rs) *</Label>
              <Input type="number" min="0" value={amount || ""} onChange={(e) => { const v = e.target.value; setAmount(v === "" ? 0 : Math.max(0, Number(v))); }} />
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

          {/* Quick pay shortcuts */}
          {invoice.due > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={() => setAmount(invoice.due)} className="text-teal-600 hover:text-teal-700 underline underline-offset-2">Pay Full Due ({formatRs(invoice.due)})</button>
              <span className="text-muted-foreground">·</span>
              <button type="button" onClick={() => setAmount(Math.ceil(invoice.due / 2))} className="text-teal-600 hover:text-teal-700 underline underline-offset-2">Pay Half ({formatRs(Math.ceil(invoice.due / 2))})</button>
              <span className="text-muted-foreground">·</span>
              <button type="button" onClick={() => setAmount(0)} className="text-muted-foreground hover:text-foreground underline underline-offset-2">Clear</button>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/20 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">New Paid Total</span><span className="text-emerald-600 font-medium">{formatRs(newPaidTotal)}</span></div>
            {overpay > 0 ? (
              <div className="flex justify-between font-semibold text-blue-600"><span>Overpayment (Change)</span><span>{formatRs(overpay)}</span></div>
            ) : (
              <div className="flex justify-between"><span className="text-muted-foreground">Remaining Due</span><span className="font-medium">{formatRs(newDue)}</span></div>
            )}
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

function InvoiceDetail({ invoice, settings, onDelete }: { invoice: Invoice; settings?: Record<string, string>; onDelete?: () => void }) {
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
            <div className="mt-2">
              <Barcode value={invoice.invoiceNo} height={30} fontSize={10} className="max-w-[150px]" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printInvoice(invoice, settings ?? undefined)}>
              <Printer className="w-4 h-4" /> Print Invoice
            </Button>
            {invoice.type === "consultation" && (
              <Button variant="outline" size="sm" className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300" onClick={() => printOPDCard(invoice, settings ?? undefined)}>
                <FileText className="w-4 h-4" /> Print OPD Card
              </Button>
            )}
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" /> Delete
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
