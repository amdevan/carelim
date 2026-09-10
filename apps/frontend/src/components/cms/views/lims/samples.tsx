"use client";
import { fetchAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StaffSearch } from "@/components/ui/staff-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Search, Plus, Download, TestTube, ClipboardList, CheckCircle2, Microscope,
  Barcode, MapPin, Printer, Send, Ban, Route, Syringe, QrCode, User, Clock, Package,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { exportToCSV, printHTML } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";

import { escapeHTML, buildBarcodeBars, SAMPLE_STATUS_COLORS, SAMPLE_TYPE_COLORS, SAMPLE_TYPES, CONTAINER_TYPES, SortHeader, InfoTile } from "./utils";

/* ---------- Types ---------- */

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
  orderId: string;
  testId: string | null;
  sampleType: string;
  containerType: string;
  barcode: string | null;
  qrCode: string | null;
  collectorName: string | null;
  collectionTime: string | null;
  collectedAt: string | null;
  receivedAt: string | null;
  status: string;
  rejectionReason: string | null;
  location: string | null;
  order: {
    orderNo: string;
    patient: { patientCode: string; name: string; phone: string; gender: string; age: number };
    items?: { test: { name: string } }[];
  };
  tracking: LabSampleTracking[];
}

interface LabOrderItemTest {
  id: string;
  name: string;
  code: string;
  category: string;
  sampleType: string;
  containerType: string;
  price: number;
}

interface LabOrderItem {
  id: string;
  orderId: string;
  testId: string;
  test: LabOrderItemTest;
  price: number;
  status: string;
  resultStatus: string;
}

interface LabOrder {
  id: string;
  orderNo: string;
  patientId: string;
  patient: { id: string; patientCode: string; name: string; phone: string };
  priority: string;
  status: string;
  orderedAt: string;
  items: LabOrderItem[];
}

/* ---------- Constants ---------- */

const STATUS_FILTERS = ["all", "pending", "collected", "received", "recollected"] as const;

type SortKey = "sampleCode" | "collectedAt" | "status" | "";

/* ---------- Helpers ---------- */

function printSampleLabel(sample: LabSample, clinicName?: string) {
  const barcode = sample.barcode || sample.sampleCode;
  const patient = sample.order.patient;
  const sex = patient.gender === "male" ? "M" : patient.gender === "female" ? "F" : patient.gender || "-";
  const age = patient.age > 0 ? patient.age : "-";
  const body = `
  <style>
    .label-wrap { width: 320px; margin: 0 auto; border: 2px solid #0d9488; border-radius: 10px; padding: 8px 12px; font-family: 'Courier New', monospace; }
    .label-wrap .code { text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .label-wrap .bars { text-align: center; margin: 4px 0; line-height: 0; }
    .label-wrap .divider { border: 0; border-top: 1px dashed #cbd5e1; margin: 6px 0; }
    .label-wrap table { width: 100%; font-size: 11px; }
    .label-wrap td { padding: 1px 0; }
    .label-wrap .lbl { color: #64748b; }
    .label-wrap .val { font-weight: bold; color: #1a2e35; }
  </style>
  <div class="label-wrap">
    <div class="bars">${buildBarcodeBars(barcode)}</div>
    <div class="code">${escapeHTML(sample.sampleCode)}</div>
    <hr class="divider" />
    <table>
      <tr><td class="lbl">Patient:</td><td class="val">${escapeHTML(patient.name)},${sex},${age}</td></tr>
      <tr><td class="lbl">Date:</td><td class="val">${sample.collectedAt ? escapeHTML(formatDate(sample.collectedAt)) : "-"}</td></tr>
    </table>
  </div>`;
  printHTML(`Sample Label ${sample.sampleCode}`, body);
}

async function patchSample(
  id: string,
  body: Record<string, unknown>,
  successMsg: string,
  refresh: () => void,
  setErrorMsg?: string,
) {
  try {
    const res = await fetchAPI(`/api/lab-samples/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed");
    toast.success(successMsg);
    refresh();
  } catch {
    toast.error(setErrorMsg || "Action failed");
  }
}

/* ---------- Main View ---------- */

export function LimsSamples() {
  const [refresh, setRefresh] = useState(0);
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const refreshFn = useCallback(() => setRefresh((k) => k + 1), []);
  const { data: samples, loading, error } = useFetch<LabSample[]>(
    refresh ? `/api/lab-samples?_r=${refresh}` : "/api/lab-samples",
  );

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [collectOpen, setCollectOpen] = useState(false);
  const [trackSample, setTrackSample] = useState<LabSample | null>(null);
  const [rejectSample, setRejectSample] = useState<LabSample | null>(null);
  const [sendLabSample, setSendLabSample] = useState<LabSample | null>(null);

  const filtered = useMemo(() => {
    if (!samples) return [];
    const ql = q.toLowerCase();
    const list = samples.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch = !ql ||
        s.sampleCode.toLowerCase().includes(ql) ||
        (s.barcode || "").toLowerCase().includes(ql) ||
        s.order.patient.name.toLowerCase().includes(ql);
      return matchesStatus && matchesSearch;
    });
    if (!sortKey) return list;
    const d = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey as keyof LabSample];
      const bv = b[sortKey as keyof LabSample];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortKey === "collectedAt") {
        return (new Date(av as string).getTime() - new Date(bv as string).getTime()) * d;
      }
      return String(av).localeCompare(String(bv)) * d;
    });
  }, [samples, q, statusFilter, sortKey, sortDir]);

  const pagination = usePagination<LabSample>(filtered, 10);

  const stats = useMemo(() => {
    if (!samples) return { total: 0, pending: 0, collected: 0, sentToLab: 0, recollected: 0 };
    return {
      total: samples.length,
      pending: samples.filter((s) => s.status === "pending").length,
      collected: samples.filter((s) => s.status === "collected").length,
      sentToLab: samples.filter((s) => s.status === "received").length,
      recollected: samples.filter((s) => s.status === "recollected").length,
    };
  }, [samples]);

  const handleExport = () => {
    if (!filtered.length) { toast.info("No samples to export"); return; }
    exportToCSV("lab-samples.csv", [
      "Sample Code", "Order No", "Patient", "Sample Type", "Container", "Barcode", "Collector", "Status", "Location",
    ], filtered.map((s) => [
      s.sampleCode, s.order.orderNo, s.order.patient.name, s.sampleType, s.containerType,
      s.barcode || "", s.collectorName || "", s.status, s.location || "",
    ]));
    toast.success(`Exported ${filtered.length} samples to CSV`);
  };

  const toggleSort = (key: Exclude<SortKey, "">) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-10 text-center text-sm text-rose-600">
            Failed to load: {error}
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
            <TestTube className="w-5 h-5 text-teal-600" /> Sample Collection
          </h2>
          <p className="text-sm text-muted-foreground">Barcode &amp; QR tracking · {samples?.length ?? 0} samples</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCollectOpen(true)}>
            <Plus className="w-4 h-4" /> Collect Sample
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", value: stats.total, icon: TestTube, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30" },
          { label: "Pending", value: stats.pending, icon: ClipboardList, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { label: "Collected", value: stats.collected, icon: CheckCircle2, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
          { label: "Sent to Lab", value: stats.sentToLab, icon: Microscope, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "Recollected", value: stats.recollected, icon: Syringe, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5">
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

      {/* Table card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search sample code, barcode or patient…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    statusFilter === s ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:bg-accent border-border"
                  }`}>
                  {s === "all" ? "All" : s === "received" ? "Sent to Lab" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader label="Sample Code" colKey="sampleCode" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("sampleCode")} />
                  <TableHead className="hidden md:table-cell">Barcode</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Sample Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Container</TableHead>
                  <TableHead className="hidden lg:table-cell">Collector</TableHead>
                  <SortHeader label="Collected" colKey="collectedAt" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("collectedAt")} />
                  <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("status")} className="text-center" />
                  <TableHead className="hidden xl:table-cell">Location</TableHead>
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
                ) : pagination.paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-10">
                      <TestTube className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      No samples found
                    </TableCell>
                  </TableRow>
                ) : pagination.paged.map((s) => (
                  <TableRow key={s.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs">{s.sampleCode}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-teal-600" />
                        <span className="font-mono text-xs">{s.barcode || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.order.orderNo}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{s.order.patient.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.order.patient.patientCode}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-[10px] ${SAMPLE_TYPE_COLORS[s.sampleType] || "bg-gray-100 text-gray-700"}`}>
                        {s.sampleType}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{s.containerType}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {s.collectorName ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" /> {s.collectorName}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.collectedAt ? formatDate(s.collectedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] capitalize ${SAMPLE_STATUS_COLORS[s.status] || "bg-gray-100"}`}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {s.location ? (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <SampleActions
                        sample={s}
                        onTrack={() => setTrackSample(s)}
                        onPrint={() => printSampleLabel(s, tenantBranding?.clinicName ?? undefined)}
                        onCollect={() => patchSample(
                          s.id,
                          { status: "collected", collectedAt: new Date().toISOString() },
                          `Sample ${s.sampleCode} collected`,
                          refreshFn,
                        )}
                        onReceive={() => patchSample(
                          s.id,
                          { status: "received", location: "Sample Reception", handler: "Lab Reception" },
                          `Sample ${s.sampleCode} received`,
                          refreshFn,
                        )}
                        onReject={() => setRejectSample(s)}
                        onSendLab={() => setSendLabSample(s)}
                      />
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

      {/* Collect Sample dialog */}
      <CollectSampleDialog
        open={collectOpen}
        onOpenChange={setCollectOpen}
        onCreated={() => { setCollectOpen(false); refreshFn(); }}
      />

      {/* Tracking Sheet */}
      <TrackingSheet sample={trackSample} onOpenChange={(o) => !o && setTrackSample(null)} />

      {/* Reject dialog */}
      <RejectSampleDialog
        sample={rejectSample}
        onOpenChange={(o) => !o && setRejectSample(null)}
        onSaved={() => { setRejectSample(null); refreshFn(); }}
      />

      {/* Send to Lab dialog */}
      <SendToLabDialog
        sample={sendLabSample}
        onOpenChange={(o) => !o && setSendLabSample(null)}
        onSent={() => { setSendLabSample(null); refreshFn(); }}
      />
    </div>
  );
}

/* ---------- Sample Actions ---------- */

function SampleActions({
  sample, onTrack, onPrint, onCollect, onReceive, onReject, onSendLab,
}: {
  sample: LabSample;
  onTrack: () => void;
  onPrint: () => void;
  onCollect: () => void;
  onReceive: () => void;
  onReject: () => void;
  onSendLab: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-teal-700 dark:text-teal-400" title="Track sample" onClick={onTrack}>
        <Route className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Print label" onClick={onPrint}>
        <Printer className="w-3.5 h-3.5" />
      </Button>
      {sample.status === "pending" && (
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900 dark:hover:bg-cyan-950/50"
          onClick={onCollect}>
          <Syringe className="w-3 h-3" /> Collect
        </Button>
      )}
      {sample.status === "collected" && (
        <>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 dark:bg-teal-950/30 dark:border-teal-900 dark:hover:bg-teal-950/50"
            onClick={onReceive}>
            <CheckCircle2 className="w-3 h-3" /> Receive
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
            onClick={onReject}>
            <Ban className="w-3 h-3" /> Reject
          </Button>
        </>
      )}
      {sample.status === "received" && (
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900 dark:hover:bg-violet-950/50"
          onClick={onSendLab}>
          <Send className="w-3 h-3" /> Send to Lab
        </Button>
      )}
    </div>
  );
}

/* ---------- Collect Sample Dialog ---------- */

function CollectSampleDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: orders, loading: ordersLoading } = useFetch<LabOrder[]>(
    open ? "/api/lab-orders?status=ordered" : null,
  );
  const [orderId, setOrderId] = useState("");
  const [testId, setTestId] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [sampleType, setSampleType] = useState<string>("Blood");
  const [containerType, setContainerType] = useState<string>("EDTA Tube");
  const [location, setLocation] = useState("Sample Reception");
  const [saving, setSaving] = useState(false);

  const selectedOrder = orders?.find((o) => o.id === orderId);
  const selectedTest = selectedOrder?.items.find((it) => it.testId === testId)?.test;

  // Auto-fill sample type + container from test master
  useEffect(() => {
    if (selectedTest) {
      setSampleType(selectedTest.sampleType);
      setContainerType(selectedTest.containerType);
    }
  }, [selectedTest]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setOrderId(""); setTestId(""); setCollectorName("");
      setSampleType("Blood"); setContainerType("EDTA Tube"); setLocation("Sample Reception");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) { toast.error("Please select a lab order"); return; }
    if (!testId) { toast.error("Please select a test to collect"); return; }
    if (!collectorName.trim()) { toast.error("Enter the collector's name"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/lab-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          testId,
          sampleType,
          containerType,
          collectorName: collectorName.trim(),
          location: location.trim() || "Sample Reception",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Sample collected successfully");
      onCreated();
    } catch {
      toast.error("Failed to collect sample");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="w-4 h-4 text-teal-600" /> Collect Sample
          </DialogTitle>
          <DialogDescription>
            Collect a sample for an existing ordered lab order. A unique sample code and barcode will be auto-generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Lab Order *</Label>
            <Select value={orderId} onValueChange={(v) => { setOrderId(v); setTestId(""); }}>
              <SelectTrigger><SelectValue placeholder={ordersLoading ? "Loading orders…" : "Select ordered lab order"} /></SelectTrigger>
              <SelectContent>
                {orders && orders.length === 0 ? (
                  <SelectItem value="__none" disabled>No pending orders</SelectItem>
                ) : orders?.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="font-mono">{o.orderNo}</span> · {o.patient.name} · {o.items.length} test(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrder && (
            <div className="space-y-1.5">
              <Label>Test *</Label>
              <Select value={testId} onValueChange={setTestId}>
                <SelectTrigger><SelectValue placeholder="Select test to collect" /></SelectTrigger>
                <SelectContent>
                  {selectedOrder.items.map((it) => (
                    <SelectItem key={it.id} value={it.testId}>
                      {it.test.name} · <span className="font-mono text-xs">{it.test.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTest && (
                <p className="text-xs text-muted-foreground">
                  Default sample: <span className="font-medium text-teal-700 dark:text-teal-400">{selectedTest.sampleType}</span> / {selectedTest.containerType}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Collector Name *</Label>
            <StaffSearch value={collectorName} onValueChange={setCollectorName} label="Collector Name" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sample Type</Label>
              <Select value={sampleType} onValueChange={setSampleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAMPLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Container Type</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Collection Location</Label>
            <Input placeholder="e.g. Sample Reception" value={location}
              onChange={(e) => setLocation(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Collecting…" : "Collect Sample"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Send to Lab Dialog ---------- */

const LAB_OPTIONS = [
  { id: "internal", name: "Internal Lab", location: "Lab Department" },
  { id: "external_1", name: "PathCare Laboratory", location: "External" },
  { id: "external_2", name: "National Health Lab", location: "External" },
  { id: "external_3", name: "Himalayan Diagnostics", location: "External" },
];

function SendToLabDialog({
  sample, onOpenChange, onSent,
}: {
  sample: LabSample | null;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}) {
  const [selectedLab, setSelectedLab] = useState("internal");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sample) setSelectedLab("internal");
  }, [sample]);

  const handleSubmit = async () => {
    if (!sample) return;
    const lab = LAB_OPTIONS.find((l) => l.id === selectedLab);
    setSaving(true);
    try {
      await patchSample(
        sample.id,
        { status: "processing", location: lab?.location || "Lab Department", handler: lab?.name || "Lab" },
        `Sample ${sample.sampleCode} sent to ${lab?.name || "lab"}`,
        onSent,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!sample} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-600" /> Send to Lab
          </DialogTitle>
          <DialogDescription>
            Select a lab to send sample <span className="font-mono">{sample?.sampleCode}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {LAB_OPTIONS.map((lab) => (
            <label
              key={lab.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedLab === lab.id
                  ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <input
                type="radio"
                name="lab"
                value={lab.id}
                checked={selectedLab === lab.id}
                onChange={() => setSelectedLab(lab.id)}
                className="accent-violet-600"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{lab.name}</p>
                <p className="text-[11px] text-muted-foreground">{lab.location}</p>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Sending…" : (<><Send className="w-4 h-4" /> Send to Lab</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Reject Sample Dialog ---------- */

function RejectSampleDialog({
  sample, onOpenChange, onSaved,
}: {
  sample: LabSample | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setReason(""); }, [sample]);

  if (!sample) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("Enter a rejection reason"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-samples/${sample.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: reason.trim(),
          handler: "Lab Reception",
          notes: reason.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Sample ${sample.sampleCode} rejected`);
      onSaved();
    } catch {
      toast.error("Failed to reject sample");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!sample} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600" /> Reject Sample
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono">{sample.sampleCode}</span> · {sample.order.patient.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Rejection Reason *</Label>
            <Textarea rows={3} placeholder="e.g. Hemolyzed sample, insufficient volume, wrong container…"
              value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </div>
          <div className="rounded-lg border bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-800 dark:text-rose-300">
            Once rejected, the sample will need to be recollected. This action is recorded in the sample&apos;s tracking history.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              {saving ? "Rejecting…" : "Reject Sample"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Tracking Sheet ---------- */

function TrackingSheet({
  sample, onOpenChange,
}: {
  sample: LabSample | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!sample) return null;
  const tracking = [...sample.tracking].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <Sheet open={!!sample} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <SheetTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-teal-600" />
            <span className="font-mono">{sample.sampleCode}</span>
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="font-mono">{sample.order.orderNo}</span>
            <span>·</span>
            <span>{sample.order.patient.name}</span>
            <Badge className={`text-[10px] capitalize ${SAMPLE_STATUS_COLORS[sample.status] || "bg-gray-100"}`}>
              {sample.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-5">
          {/* Sample info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoTile label="Sample Type" value={sample.sampleType} icon={<TestTube className="w-3.5 h-3.5" />} />
            <InfoTile label="Container" value={sample.containerType} icon={<Package className="w-3.5 h-3.5" />} />
            <InfoTile label="Collector" value={sample.collectorName || "—"} icon={<User className="w-3.5 h-3.5" />} />
            <InfoTile label="Collected" value={sample.collectedAt ? formatDate(sample.collectedAt) : "—"} icon={<Clock className="w-3.5 h-3.5" />} />
            <InfoTile label="Location" value={sample.location || "—"} icon={<MapPin className="w-3.5 h-3.5" />} />
            <InfoTile label="Barcode" value={sample.barcode || "—"} icon={<Barcode className="w-3.5 h-3.5" />} mono />
          </div>

          {sample.qrCode && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
              <QrCode className="w-5 h-5 text-teal-600" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">QR Code</p>
                <p className="font-mono text-sm">{sample.qrCode}</p>
              </div>
            </div>
          )}

          {sample.rejectionReason && (
            <div className="rounded-lg border bg-rose-50 dark:bg-rose-950/20 p-3 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300 mb-1">Rejection Reason</p>
              <p className="text-rose-900 dark:text-rose-200">{sample.rejectionReason}</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Route className="w-4 h-4 text-teal-600" /> Tracking Timeline
              <Badge variant="outline" className="text-[10px]">{tracking.length} events</Badge>
            </h4>
            {tracking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tracking events recorded.</p>
            ) : (
              <div className="relative space-y-0">
                {tracking.map((t, i) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ring-2 ring-background ${i === 0 ? "bg-teal-500" : "bg-muted-foreground/40"}`} />
                      {i < tracking.length - 1 && <div className="w-px flex-1 bg-border min-h-[40px]" />}
                    </div>
                    <div className="flex-1 pb-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] capitalize ${SAMPLE_STATUS_COLORS[t.status] || "bg-gray-100"}`}>{t.status}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(t.timestamp)}</span>
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-sm">
                        {t.location && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-3 h-3" /> {t.location}
                          </p>
                        )}
                        {t.handler && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="w-3 h-3" /> {t.handler}
                          </p>
                        )}
                        {t.notes && (
                          <p className="text-xs italic text-muted-foreground mt-1 pl-4 border-l-2 border-border">
                            {t.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


