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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Search, Plus, FlaskConical, TestTube, ListChecks, CheckCircle2,
  Download, Eye, Syringe, Printer, ArrowUpDown, Barcode, User,
  Wallet, ClipboardList, Activity, X, Package as PackageIcon,
} from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ---------- Types ---------- */

interface LabDepartment { id: string; name: string; color: string; }
interface LabTestDepartment { id: string; name: string; color: string | null; }

interface LabTestMaster {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  department?: LabTestDepartment | null;
  sampleType?: string;
}

interface LabPackageTest {
  testId: string;
  test: LabTestMaster;
}

interface LabPackage {
  id: string;
  name: string;
  code: string;
  price: number;
  discountPct?: number;
  tests: LabPackageTest[];
}

interface LabOrderItem {
  id: string;
  testId: string;
  price: number;
  status: string;
  resultStatus: string;
  result?: string | null;
  comments?: string | null;
  test: LabTestMaster;
}

interface LabSampleTracking {
  id: string;
  status: string;
  location: string | null;
  handler: string | null;
  timestamp: string;
  notes: string | null;
}

interface LabSample {
  id: string;
  sampleCode: string;
  barcode: string | null;
  status: string;
  collectorName: string | null;
  collectionTime: string | null;
  sampleType?: string;
  containerType?: string;
  location?: string | null;
  tracking: LabSampleTracking[];
}

interface LabResultParameter {
  id: string;
  value: string | null;
  flag: string;
  comment?: string | null;
  parameter: { id: string; name: string; unit: string | null };
}

interface LabResult {
  id: string;
  testId: string;
  status: string;
  technicianName: string | null;
  verifiedBy: string | null;
  approvedBy: string | null;
  pathologistComments?: string | null;
  parameters: LabResultParameter[];
}

interface LabOrder {
  id: string;
  orderNo: string;
  patientId: string;
  doctorId: string | null;
  priority: string;
  clinicalNotes: string | null;
  status: string;
  totalAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  paidAmount: number;
  paymentStatus: string;
  barcode: string | null;
  orderedAt: string;
  collectedAt: string | null;
  completedAt: string | null;
  patient: {
    id: string;
    patientCode: string;
    name: string;
    phone: string;
    age?: number;
    gender?: string;
  };
  items: LabOrderItem[];
  samples: LabSample[];
  results: LabResult[];
}

interface PatientLite {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  age?: number;
  gender?: string;
}

interface DoctorLite {
  id: string;
  name: string;
  specialization: string;
  department?: { id: string; name: string } | null;
}

/* ---------- Constants ---------- */

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  urgent: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  emergency: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const LAB_STATUS_COLORS: Record<string, string> = {
  ordered: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  collected: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  processing: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const RESULT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  entered: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  verified: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  released: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const FLAG_COLORS: Record<string, string> = {
  normal: "text-emerald-600 dark:text-emerald-400",
  high: "text-amber-600 dark:text-amber-400",
  low: "text-cyan-600 dark:text-cyan-400",
  critical: "text-rose-600 dark:text-rose-400",
  panic: "text-red-600 dark:text-red-400 font-bold",
  abnormal: "text-violet-600 dark:text-violet-400",
};

const STATUS_FILTERS = ["all", "ordered", "collected", "processing", "completed", "cancelled"] as const;
const PRIORITY_FILTERS = ["all", "normal", "urgent", "emergency"] as const;

const TAX_RATE = 0.13;

/* ---------- Helpers ---------- */

function escapeHTML(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function buildOrderHTML(o: LabOrder): string {
  const statusBadge = `<span class="badge teal">${statusLabel(o.status)}</span>`;
  const priorityBadge = `<span class="badge ${o.priority === "emergency" ? "rose" : o.priority === "urgent" ? "teal" : "teal"}">${statusLabel(o.priority)} Priority</span>`;

  const patientGrid = `
    <div class="info-grid">
      <div>
        <div class="label">Patient</div>
        <div><strong>${escapeHTML(o.patient.name)}</strong></div>
        <div>Code: <span style="font-family:monospace">${escapeHTML(o.patient.patientCode)}</span></div>
        <div>Phone: ${escapeHTML(o.patient.phone || "—")}</div>
        ${o.patient.age ? `<div>Age/Sex: ${o.patient.age} / ${escapeHTML(o.patient.gender || "—")}</div>` : ""}
      </div>
      <div>
        <div class="label">Order Info</div>
        <div>Priority: <strong>${escapeHTML(statusLabel(o.priority))}</strong></div>
        <div>Ordered: ${formatDate(o.orderedAt)}</div>
        <div>Barcode: <span style="font-family:monospace">${escapeHTML(o.barcode || "—")}</span></div>
        ${o.clinicalNotes ? `<div class="label" style="margin-top:6px">Clinical Notes</div><div>${escapeHTML(o.clinicalNotes)}</div>` : ""}
      </div>
    </div>`;

  const itemRows = (o.items || []).map((it) => `
    <tr>
      <td>${escapeHTML(it.test.name)}</td>
      <td style="font-family:monospace">${escapeHTML(it.test.code)}</td>
      <td style="text-align:right">${formatRs(it.price)}</td>
      <td>${statusLabel(it.status)}</td>
    </tr>`).join("");

  const itemsTable = `
    <h2>Test Items</h2>
    <table>
      <thead><tr><th>Test</th><th>Code</th><th style="text-align:right">Price</th><th>Status</th></tr></thead>
      <tbody>${itemRows || `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No items</td></tr>`}</tbody>
    </table>`;

  const totals = `
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatRs(o.totalAmount)}</span></div>
      <div class="row"><span>Discount</span><span>- ${formatRs(o.discount)}</span></div>
      <div class="row"><span>Tax (13%)</span><span>+ ${formatRs(o.tax)}</span></div>
      <div class="row grand"><span>Net Amount</span><span>${formatRs(o.netAmount)}</span></div>
      <div class="row"><span>Paid</span><span>${formatRs(o.paidAmount)}</span></div>
      <div class="row"><span>Due</span><span>${formatRs(Math.max(0, o.netAmount - o.paidAmount))}</span></div>
    </div>`;

  return `${docHeader(o.orderNo, "LAB ORDER", formatDate(o.orderedAt), statusBadge + priorityBadge)}
    ${patientGrid}
    ${itemsTable}
    ${totals}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Collected By</div><div class="role">Lab Technician</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">Authorized Signatory</div><div class="role">Carelim OS Lab Services</div></div>
    </div>`;
}

function printOrder(o: LabOrder) {
  printHTML(`Lab Order ${o.orderNo}`, buildOrderHTML(o));
}

/* ---------- Main Component ---------- */

export function LimsOrders() {
  const [refresh, setRefresh] = useState(0);
  const refreshList = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: orders, loading, error } = useFetch<LabOrder[]>(
    refresh ? `/api/lab-orders?_r=${refresh}` : "/api/lab-orders",
  );

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"orderedAt" | "orderNo" | "netAmount">("orderedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [collectOrder, setCollectOrder] = useState<LabOrder | null>(null);

  /* ---- Filter + sort ---- */
  const filtered = useMemo(() => {
    if (!orders) return [];
    const ql = q.toLowerCase();
    const list = orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || o.priority === priorityFilter;
      const matchesSearch = !ql ||
        o.orderNo.toLowerCase().includes(ql) ||
        o.patient.name.toLowerCase().includes(ql) ||
        (o.patient.patientCode || "").toLowerCase().includes(ql);
      return matchesStatus && matchesPriority && matchesSearch;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "orderedAt") {
        av = new Date(a.orderedAt).getTime();
        bv = new Date(b.orderedAt).getTime();
      } else if (sortKey === "orderNo") {
        av = a.orderNo;
        bv = b.orderNo;
      } else {
        av = a.netAmount;
        bv = b.netAmount;
      }
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [orders, q, statusFilter, priorityFilter, sortKey, sortDir]);

  const pagination = usePagination<LabOrder>(filtered, 10);

  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "ordered").length,
      inProgress: orders.filter((o) => o.status === "collected" || o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed").length,
    };
  }, [orders]);

  const selected = orders?.find((o) => o.id === viewId) || null;

  /* Reset page to 1 when filters change */
  useEffect(() => {
    pagination.setPage(1);
  }, [q, statusFilter, priorityFilter, sortKey, sortDir]);

  const handleExport = () => {
    if (!filtered.length) { toast.info("No lab orders to export"); return; }
    exportToCSV("lab-orders", [
      "Order No", "Patient", "Priority", "Tests", "Status", "Total", "Paid", "Payment",
    ], filtered.map((o) => [
      o.orderNo,
      o.patient.name,
      statusLabel(o.priority),
      o.items.length,
      statusLabel(o.status),
      o.netAmount,
      o.paidAmount,
      statusLabel(o.paymentStatus),
    ]));
    toast.success(`Exported ${filtered.length} lab orders to CSV`);
  };

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-10 text-center text-sm text-rose-600">
            Failed to load lab orders: {error}
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
            <FlaskConical className="w-5 h-5 text-teal-600" /> Lab Orders
          </h2>
          <p className="text-sm text-muted-foreground">
            {orders?.length ?? 0} orders · {stats.pending} pending collection · {stats.inProgress} in progress · {stats.completed} completed
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
            <Plus className="w-4 h-4" /> New Lab Order
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: String(stats.total), icon: FlaskConical, accent: "from-teal-500 to-teal-600" },
          { label: "Pending Collection", value: String(stats.pending), icon: ListChecks, accent: "from-amber-500 to-orange-500" },
          { label: "In Progress", value: String(stats.inProgress), icon: TestTube, accent: "from-violet-500 to-purple-600" },
          { label: "Completed", value: String(stats.completed), icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/60">
              <CardContent className="p-3.5">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.accent} flex items-center justify-center text-white shadow-sm`}>
                  <s.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-xl font-bold mt-2">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order no or patient name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as typeof sortKey)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="orderedAt">Ordered</SelectItem>
                  <SelectItem value="orderNo">Order No</SelectItem>
                  <SelectItem value="netAmount">Net Amount</SelectItem>
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
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Status:</span>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    statusFilter === s
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {s === "all" ? "All" : statusLabel(s)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Priority:</span>
              {PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    priorityFilter === p
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {p === "all" ? "All" : statusLabel(p)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[130px]">Order No</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead className="hidden sm:table-cell">Tests</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Total</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Payment</TableHead>
                  <TableHead className="hidden lg:table-cell">Ordered</TableHead>
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
                ) : pagination.paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      <FlaskConical className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      No lab orders found
                    </TableCell>
                  </TableRow>
                ) : pagination.paged.map((o) => (
                  <TableRow key={o.id} className="hover:bg-accent/40">
                    <TableCell>
                      <p className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">{o.orderNo}</p>
                      {o.barcode && (
                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <Barcode className="w-2.5 h-2.5" />
                          {o.barcode}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{o.patient.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{o.patient.patientCode}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={`text-[10px] ${PRIORITY_COLORS[o.priority] || PRIORITY_COLORS.normal}`}>
                        {statusLabel(o.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-medium mr-1">{o.items.length}</span>
                        {o.items.slice(0, 2).map((it) => (
                          <Badge key={it.id} variant="outline" className="text-[9px] py-0 h-4 max-w-[100px] truncate">
                            {it.test.name}
                          </Badge>
                        ))}
                        {o.items.length > 2 && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4">+{o.items.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${LAB_STATUS_COLORS[o.status] || "bg-gray-100"}`}>
                        {statusLabel(o.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell text-sm font-medium">
                      {formatRs(o.netAmount)}
                    </TableCell>
                    <TableCell className="text-center hidden lg:table-cell">
                      <Badge className={`text-[10px] ${statusColors[o.paymentStatus] || "bg-gray-100"}`}>
                        {statusLabel(o.paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {timeAgo(o.orderedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewId(o.id)}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {o.status === "ordered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
                            onClick={() => setCollectOrder(o)}
                            title="Collect sample"
                          >
                            <Syringe className="w-3 h-3" /> Collect
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => printOrder(o)}
                          title="Print order"
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
            page={pagination.page}
            totalPages={pagination.totalPages}
            setPage={pagination.setPage}
            size={pagination.size}
            setSize={pagination.setSize}
            range={pagination.range}
          />
        </CardContent>
      </Card>

      {/* Sheet detail */}
      <Sheet open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <OrderDetail order={selected} />}
        </SheetContent>
      </Sheet>

      {/* Collect sample dialog */}
      {collectOrder && (
        <CollectSampleDialog
          order={collectOrder}
          open={!!collectOrder}
          onClose={() => setCollectOrder(null)}
          onCollected={refreshList}
        />
      )}

      {/* New lab order dialog */}
      <NewLabOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshList}
      />
    </div>
  );
}

/* ---------- Order Detail Sheet ---------- */

function OrderDetail({ order }: { order: LabOrder }) {
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-xl flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-600" />
              <span className="font-mono">{order.orderNo}</span>
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span>{formatDate(order.orderedAt)}</span>
              <Badge className={`text-[10px] ${LAB_STATUS_COLORS[order.status] || "bg-gray-100"}`}>
                {statusLabel(order.status)}
              </Badge>
              <Badge className={`text-[10px] ${PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.normal}`}>
                {statusLabel(order.priority)} Priority
              </Badge>
              {order.barcode && (
                <span className="text-xs flex items-center gap-1">
                  <Barcode className="w-3 h-3" /> {order.barcode}
                </span>
              )}
            </SheetDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => printOrder(order)}>
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-5">
        {/* Patient + Billing info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <User className="w-3 h-3" /> Patient
            </p>
            <p className="font-semibold mt-0.5">{order.patient.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{order.patient.patientCode}</p>
            <p className="text-xs text-muted-foreground">{order.patient.phone}</p>
            {(order.patient.age || order.patient.gender) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {order.patient.age ? `${order.patient.age} yrs` : ""} {order.patient.gender ? `· ${order.patient.gender}` : ""}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Billing
            </p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{formatRs(order.netAmount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paid <span className="text-emerald-600 font-medium">{formatRs(order.paidAmount)}</span> · Due{" "}
              <span className={`font-medium ${order.netAmount - order.paidAmount > 0 ? "text-rose-600" : ""}`}>
                {formatRs(Math.max(0, order.netAmount - order.paidAmount))}
              </span>
            </p>
            <Badge className={`text-[10px] mt-1.5 ${statusColors[order.paymentStatus] || "bg-gray-100"}`}>
              {statusLabel(order.paymentStatus)}
            </Badge>
          </div>
        </div>

        {/* Clinical notes */}
        {order.clinicalNotes && (
          <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900 p-3">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1 font-medium">
              <ClipboardList className="w-3 h-3" /> Clinical Notes
            </p>
            <p className="text-sm mt-1">{order.clinicalNotes}</p>
          </div>
        )}

        {/* Items table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <TestTube className="w-4 h-4 text-teal-600" /> Test Items ({order.items.length})
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Test</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead className="hidden md:table-cell">Dept</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">
                      No test items
                    </TableCell>
                  </TableRow>
                ) : order.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm font-medium">{it.test.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs font-mono text-muted-foreground">{it.test.code}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {it.test.department && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: it.test.department.color || "#0d9488" }}
                          />
                          {it.test.department.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-sm">{formatRs(it.price)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${LAB_STATUS_COLORS[it.status] || "bg-gray-100"}`}>
                        {statusLabel(it.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${RESULT_STATUS_COLORS[it.resultStatus] || "bg-gray-100"}`}>
                        {statusLabel(it.resultStatus)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Samples */}
        {order.samples.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Syringe className="w-4 h-4 text-cyan-600" /> Samples ({order.samples.length})
            </h4>
            <div className="space-y-2">
              {order.samples.map((s) => (
                <div key={s.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium font-mono">{s.sampleCode}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.barcode && <span className="font-mono">{s.barcode} · </span>}
                        {s.sampleType && <span>{s.sampleType}</span>}
                        {s.containerType && <span> · {s.containerType}</span>}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${statusColors[s.status] || "bg-gray-100"}`}>
                      {statusLabel(s.status)}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {s.collectorName && <span>Collected by {s.collectorName}</span>}
                    {s.collectionTime && <span> · {formatDate(s.collectionTime)}</span>}
                  </div>
                  {s.tracking.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Tracking</p>
                      <div className="space-y-0.5">
                        {s.tracking.slice(0, 4).map((t) => (
                          <div key={t.id} className="text-[11px] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            <span className="font-medium">{statusLabel(t.status)}</span>
                            {t.location && <span className="text-muted-foreground">· {t.location}</span>}
                            {t.handler && <span className="text-muted-foreground">· {t.handler}</span>}
                            <span className="text-muted-foreground ml-auto">{timeAgo(t.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {order.results.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" /> Results ({order.results.length})
            </h4>
            <div className="space-y-2">
              {order.results.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-muted-foreground">
                      {r.technicianName && <span>By {r.technicianName}</span>}
                      {r.verifiedBy && <span> · Verified by {r.verifiedBy}</span>}
                      {r.approvedBy && <span> · Approved by {r.approvedBy}</span>}
                    </div>
                    <Badge className={`text-[10px] ${RESULT_STATUS_COLORS[r.status] || "bg-gray-100"}`}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                  {r.parameters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No parameters entered</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="h-7 text-[10px]">Parameter</TableHead>
                            <TableHead className="h-7 text-[10px] text-right">Value</TableHead>
                            <TableHead className="h-7 text-[10px] text-center">Flag</TableHead>
                            <TableHead className="h-7 text-[10px] hidden sm:table-cell">Unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {r.parameters.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-xs py-1.5">{p.parameter.name}</TableCell>
                              <TableCell className={`text-xs py-1.5 text-right font-medium ${FLAG_COLORS[p.flag] || ""}`}>
                                {p.value || "—"}
                              </TableCell>
                              <TableCell className="text-xs py-1.5 text-center">
                                <span className={`text-[10px] uppercase ${FLAG_COLORS[p.flag] || ""}`}>
                                  {p.flag !== "normal" ? statusLabel(p.flag) : "Normal"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs py-1.5 hidden sm:table-cell text-muted-foreground">
                                {p.parameter.unit || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {r.pathologistComments && (
                    <p className="text-[11px] text-muted-foreground mt-2 italic">
                      Pathologist: {r.pathologistComments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals breakdown */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm ml-auto max-w-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(order.totalAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-rose-600">- {formatRs(order.discount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>+ {formatRs(order.tax)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5 text-base"><span>Net</span><span>{formatRs(order.netAmount)}</span></div>
          <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatRs(order.paidAmount)}</span></div>
          <div className="flex justify-between font-semibold text-rose-600"><span>Due</span><span>{formatRs(Math.max(0, order.netAmount - order.paidAmount))}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Collect Sample Dialog ---------- */

interface CollectDialogProps {
  order: LabOrder;
  open: boolean;
  onClose: () => void;
  onCollected: () => void;
}

function CollectSampleDialog({ order, open, onClose, onCollected }: CollectDialogProps) {
  const [saving, setSaving] = useState(false);
  const [collectorName, setCollectorName] = useState("");
  const [sampleType, setSampleType] = useState("Blood");
  const [containerType, setContainerType] = useState("EDTA Tube");
  const [location, setLocation] = useState("Sample Reception");

  useEffect(() => {
    if (open) {
      setCollectorName("");
      setSampleType("Blood");
      setContainerType("EDTA Tube");
      setLocation("Sample Reception");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectorName.trim()) {
      toast.error("Collector name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          sampleType,
          containerType,
          collectorName,
          location,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
      }
      toast.success(`Sample collected for ${order.orderNo}`);
      onClose();
      onCollected();
    } catch (e) {
      toast.error(`Failed to collect sample: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-cyan-600" /> Collect Sample
          </DialogTitle>
          <DialogDescription>
            Collect sample for order <span className="font-mono">{order.orderNo}</span> ({order.patient.name})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="collector">Collector Name *</Label>
            <Input
              id="collector"
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
              placeholder="e.g. Ram Thapa"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="stype">Sample Type</Label>
              <Select value={sampleType} onValueChange={setSampleType}>
                <SelectTrigger id="stype"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Blood", "Urine", "Stool", "Sputum", "Tissue", "CSF", "Swab"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="container">Container</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger id="container"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EDTA Tube", "Citrate Tube", "Heparin Tube", "Plain Tube", "Fluoride Tube", "Container"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Collection Location</Label>
            <Input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sample Reception"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              disabled={saving}
            >
              {saving ? "Collecting…" : (<><Syringe className="w-4 h-4" /> Collect Sample</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- New Lab Order Dialog ---------- */

interface NewOrderProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NewLabOrderDialog({ open, onClose, onCreated }: NewOrderProps) {
  const { data: patients, loading: patientsLoading } = useFetch<PatientLite[]>(
    open ? "/api/patients" : null,
  );
  const { data: doctors, loading: doctorsLoading } = useFetch<DoctorLite[]>(
    open ? "/api/doctors" : null,
  );
  const { data: tests, loading: testsLoading } = useFetch<LabTestMaster[]>(
    open ? "/api/lab-tests-master" : null,
  );
  const { data: packages } = useFetch<LabPackage[]>(
    open ? "/api/lab-packages" : null,
  );

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("none");
  const [priority, setPriority] = useState("normal");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPatientId("");
      setDoctorId("none");
      setPriority("normal");
      setClinicalNotes("");
      setDiscount(0);
      setSelectedTestIds([]);
      setTestSearch("");
      setSelectedPackageId("none");
    }
  }, [open]);

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    const ql = testSearch.toLowerCase();
    if (!ql) return tests;
    return tests.filter((t) =>
      t.name.toLowerCase().includes(ql) ||
      t.code.toLowerCase().includes(ql) ||
      (t.category || "").toLowerCase().includes(ql),
    );
  }, [tests, testSearch]);

  // When a package is selected, auto-select its tests
  useEffect(() => {
    if (!packages) return;
    if (selectedPackageId === "none") return;
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (pkg) {
      setSelectedTestIds(pkg.tests.map((t) => t.testId));
    }
  }, [selectedPackageId, packages]);

  const selectedTests = useMemo(() => {
    if (!tests) return [];
    return tests.filter((t) => selectedTestIds.includes(t.id));
  }, [tests, selectedTestIds]);

  const subtotal = useMemo(
    () => selectedTests.reduce((s, t) => s + (t.price || 0), 0),
    [selectedTests],
  );
  const disc = Math.min(Math.max(0, discount || 0), subtotal);
  const tax = Math.round((subtotal - disc) * TAX_RATE);
  const netAmount = subtotal - disc + tax;

  const toggleTest = (testId: string) => {
    setSelectedPackageId("none");
    setSelectedTestIds((cur) =>
      cur.includes(testId) ? cur.filter((id) => id !== testId) : [...cur, testId],
    );
  };

  const handleRemoveTest = (testId: string) => {
    setSelectedPackageId("none");
    setSelectedTestIds((cur) => cur.filter((id) => id !== testId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one test");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId: doctorId === "none" ? null : doctorId,
          priority,
          clinicalNotes: clinicalNotes || null,
          discount: disc,
          testIds: selectedTestIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
      }
      const order = await res.json();
      toast.success(`Lab order ${order.orderNo} created`);
      onClose();
      onCreated();
    } catch (e) {
      toast.error(`Failed to create order: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" /> New Lab Order
          </DialogTitle>
          <DialogDescription>
            Create a new laboratory order with test or package selection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient + Doctor + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="patient">Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId} required>
                <SelectTrigger id="patient">
                  <SelectValue placeholder={patientsLoading ? "Loading patients…" : "Select patient"} />
                </SelectTrigger>
                <SelectContent>
                  {(patients || []).slice(0, 100).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.patientCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctor">Referring Doctor (optional)</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger id="doctor">
                  <SelectValue placeholder={doctorsLoading ? "Loading doctors…" : "Select doctor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No referring doctor</SelectItem>
                  {(doctors || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.specialization ? `· ${d.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority" className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Package select */}
          <div className="space-y-1.5">
            <Label htmlFor="package" className="flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5" /> Select Package (optional — auto-selects its tests)
            </Label>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger id="package">
                <SelectValue placeholder="No package — pick tests manually below" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No package</SelectItem>
                {(packages || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.tests.length} tests · {formatRs(p.price)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5" /> Select Tests *
              </Label>
              <span className="text-xs text-muted-foreground">
                {selectedTestIds.length} selected · {formatRs(subtotal)}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tests by name, code or category…"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="rounded-lg border max-h-64 overflow-y-auto">
              {testsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {tests && tests.length === 0 ? "No lab tests available" : "No tests match your search"}
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredTests.slice(0, 80).map((t) => {
                    const checked = selectedTestIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTest(t.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-mono">{t.code}</span>
                            {t.category && <span> · {t.category}</span>}
                            {t.department && <span> · {t.department.name}</span>}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                          {formatRs(t.price)}
                        </p>
                      </label>
                    );
                  })}
                  {filteredTests.length > 80 && (
                    <div className="p-2 text-center text-[11px] text-muted-foreground">
                      Showing first 80 tests — refine your search to find more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected tests chips */}
          {selectedTests.length > 0 && (
            <div className="space-y-1.5">
              <Label>Selected ({selectedTests.length})</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedTests.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="gap-1 py-1 pr-1 pl-2 text-[11px] bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(t.id)}
                      className="ml-1 rounded-full hover:bg-teal-200 dark:hover:bg-teal-900 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Clinical notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Clinical Notes</Label>
            <Textarea
              id="notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Symptoms, provisional diagnosis, fasting status, etc."
              rows={2}
            />
          </div>

          {/* Discount + live totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount (Rs.)</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRs(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-rose-600">- {formatRs(disc)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (13%)</span><span>+ {formatRs(tax)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-base">
                <span>Net Amount</span>
                <span className="text-teal-700 dark:text-teal-400">{formatRs(netAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              disabled={saving || !patientId || selectedTestIds.length === 0}
            >
              {saving ? "Creating…" : (<><Plus className="w-4 h-4" /> Create Order</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LimsOrders;
