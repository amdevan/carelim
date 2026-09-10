"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StaffSearch } from "@/components/ui/staff-search";
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
  Search, FlaskConical, TestTube, ListChecks, CheckCircle2,
  Eye, Syringe, Barcode, User, Printer,
  Wallet, ClipboardList, Activity,
} from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { escapeHTML, buildBarcodeBars } from "./utils";
import { printHTML } from "@/lib/export-utils";

import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";

import { useAppStore } from "@/store/app-store";


/* ---------- Types ---------- */

interface LabTestDepartment { id: string; name: string; color: string | null; }

interface LabTestMaster {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  department?: LabTestDepartment | null;
  sampleType?: string;
  containerType?: string;
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

const PRIORITY_FILTERS = ["all", "normal", "urgent", "emergency"] as const;

/* ---------- Main Component ---------- */

export function LimsOrders() {
  const [refresh, setRefresh] = useState(0);
  const refreshList = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: orders, loading, error } = useFetch<LabOrder[]>(
    refresh ? `/api/lab-orders?_r=${refresh}` : "/api/lab-orders",
  );

  const [q, setQ] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [viewId, setViewId] = useState<string | null>(null);
  const [collectOrder, setCollectOrder] = useState<LabOrder | null>(null);

  /* ---- Filter ---- */
  const filtered = useMemo(() => {
    if (!orders) return [];
    const ql = q.toLowerCase();
    return orders.filter((o) => {
      const matchesPriority = priorityFilter === "all" || o.priority === priorityFilter;
      const matchesSearch = !ql ||
        o.orderNo.toLowerCase().includes(ql) ||
        o.patient.name.toLowerCase().includes(ql) ||
        (o.patient.patientCode || "").toLowerCase().includes(ql);
      return matchesPriority && matchesSearch;
    });
  }, [orders, q, priorityFilter]);

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
  }, [q, priorityFilter]);

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

      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: String(stats.total), icon: FlaskConical, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30" },
          { label: "Pending", value: String(stats.pending), icon: ListChecks, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { label: "In Progress", value: String(stats.inProgress), icon: TestTube, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "Completed", value: String(stats.completed), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2.5 rounded-lg border bg-card p-2.5`}>
            <div className={`w-8 h-8 rounded-md ${s.color} flex items-center justify-center shrink-0`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search order no or patient name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground mr-0.5">Priority:</span>
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
                            title="Send to collection"
                          >
                            <Syringe className="w-3 h-3" /> Send to Collection
                          </Button>
                        )}
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

interface SampleToCollect {
  sampleType: string;
  containerType: string;
  tests: string[];
}

function CollectSampleDialog({ order, open, onClose, onCollected }: CollectDialogProps) {
  const branchId = useAppStore((s) => s.branchId);
  const [saving, setSaving] = useState(false);
  const [collectorName, setCollectorName] = useState("");
  const [location, setLocation] = useState("Sample Reception");

  /* Auto-detect samples from order items */
  const samplesToCollect = useMemo<SampleToCollect[]>(() => {
    if (!order?.items) return [];
    const map = new Map<string, SampleToCollect>();
    for (const item of order.items) {
      const st = item.test?.sampleType || "Blood";
      const ct = item.test?.containerType || "EDTA Tube";
      const key = `${st}|${ct}`;
      if (!map.has(key)) {
        map.set(key, { sampleType: st, containerType: ct, tests: [] });
      }
      map.get(key)!.tests.push(item.test.name);
    }
    return Array.from(map.values());
  }, [order]);

  useEffect(() => {
    if (open) {
      setCollectorName("");
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
      /* Create one sample per container type */
      for (const s of samplesToCollect) {
        const res = await fetchAPI("/api/lab-samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            sampleType: s.sampleType,
            containerType: s.containerType,
            collectorName,
            location,
            branchId,
          }),
        });
        if (!res.ok) throw new Error("Failed to create sample");
      }
      toast.success(`${samplesToCollect.length} sample(s) sent to collection for ${order.orderNo}`);
      onClose();
      onCollected();
    } catch (e) {
      toast.error(`Failed to send to collection: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const printLabel = (sample: SampleToCollect, idx: number) => {
    const sampleCode = `${order.orderNo.replace("LAB-", "S-")}-${idx + 1}`;
    const barcode = sampleCode;
    const sex = order.patient.gender === "male" ? "M" : order.patient.gender === "female" ? "F" : order.patient.gender || "-";
    const age = (order.patient.age ?? 0) > 0 ? order.patient.age : "-";
    const labelHTML = `
      <style>
        .lbl-wrap { width: 320px; margin: 0 auto; border: 2px solid #0d9488; border-radius: 10px; padding: 8px 12px; font-family: 'Courier New', monospace; }
        .lbl-wrap .code { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
        .lbl-wrap .bars { text-align: center; margin: 4px 0; line-height: 0; }
        .lbl-wrap .divider { border: 0; border-top: 1px dashed #cbd5e1; margin: 6px 0; }
        .lbl-wrap table { width: 100%; font-size: 11px; }
        .lbl-wrap td { padding: 1px 0; }
        .lbl-wrap .lbl { color: #64748b; }
        .lbl-wrap .val { font-weight: bold; color: #1a2e35; }
      </style>
      <div class="lbl-wrap">
        <div class="bars">${buildBarcodeBars(barcode)}</div>
        <div class="code">${escapeHTML(sampleCode)}</div>
        <hr class="divider" />
        <table>
          <tr><td class="lbl">Patient:</td><td class="val">${escapeHTML(order.patient.name)},${sex},${age}</td></tr>
          <tr><td class="lbl">Date:</td><td class="val">${escapeHTML(new Date().toLocaleDateString())}</td></tr>
        </table>
      </div>`;
    printHTML(`Sample Label ${sampleCode}`, labelHTML);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-cyan-600" /> Send to Collection
          </DialogTitle>
          <DialogDescription>
            {order.orderNo} — {order.patient.name} · {samplesToCollect.length} container(s) detected
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Collector Name */}
          <div className="space-y-1.5">
            <Label>Collector Name *</Label>
            <StaffSearch value={collectorName} onValueChange={setCollectorName} label="Collector Name" required />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Collection Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sample Reception"
            />
          </div>

          {/* Auto-detected samples */}
          <div className="space-y-2">
            <Label>Sample Containers ({samplesToCollect.length})</Label>
            {samplesToCollect.length === 0 ? (
              <p className="text-xs text-muted-foreground">No test items in this order</p>
            ) : (
              <div className="space-y-2">
                {samplesToCollect.map((sample, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center shrink-0">
                        <Syringe className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{sample.sampleType} — {sample.containerType}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {sample.tests.length} test(s): {sample.tests.slice(0, 3).join(", ")}
                          {sample.tests.length > 3 && ` +${sample.tests.length - 3} more`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs shrink-0"
                      onClick={() => printLabel(sample, idx)}
                    >
                      <Printer className="w-3 h-3" /> Label
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              disabled={saving || samplesToCollect.length === 0}
            >
              {saving ? "Sending…" : (<><Syringe className="w-4 h-4" /> Send to Collection</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LimsOrders;
