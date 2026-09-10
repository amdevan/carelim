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
  Search, Download, FileText, ClipboardList, PenLine, CheckCircle2,
  ShieldCheck, Send, Printer, Eye, User, Clock,
  Beaker,
  UserCheck, Activity, Stethoscope,
} from "lucide-react";
import { escapeHTML, SortHeader, InfoTile as SheetInfoTile } from "./utils";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";


/* ---------- Types ---------- */

interface LabReferenceRange {
  id: string;
  gender: string;
  ageMin: number;
  ageMax: number;
  lowNormal: string | null;
  highNormal: string | null;
  criticalLow: string | null;
  criticalHigh: string | null;
  textNormal: string | null;
}

interface LabParameterMaster {
  id: string;
  name: string;
  unit: string | null;
  resultType: string; // numeric | text | dropdown | positive-negative | reactive | image | file
  options: string | null;
  referenceRanges: LabReferenceRange[];
}

interface LabResultParameter {
  id: string;
  resultId: string;
  parameterId: string;
  value: string | null;
  flag: string; // normal | high | low | critical | panic | abnormal
  comment: string | null;
  parameter: LabParameterMaster;
}

interface LabResult {
  id: string;
  orderId: string;
  testId: string;
  testItemId: string | null;
  status: string;
  technicianName: string | null;
  verifiedBy: string | null;
  approvedBy: string | null;
  releasedBy: string | null;
  enteredAt: string | null;
  verifiedAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
  pathologistComments: string | null;
  rejectionReason: string | null;
  reportVersion: number;
  createdAt: string;
  order: {
    orderNo: string;
    patient: { patientCode: string; name: string; age: number; gender: string; phone?: string };
    samples?: { sampleCode: string; testId: string | null }[];
  };
  parameters: LabResultParameter[];
}

interface LabTestMasterLite {
  id: string;
  name: string;
  code: string;
  category: string;
}

/* ---------- Constants ---------- */

const STATUS_FILTERS = ["all", "pending", "entered", "verified", "approved", "released", "rejected"] as const;

const RESULT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  entered: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  verified: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  approved: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  released: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const FLAG_COLORS: Record<string, string> = {
  normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  critical: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  panic: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  abnormal: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

const FLAG_ORDER = ["panic", "critical", "abnormal", "high", "low"] as const;

type SortKey = "orderNo" | "enteredAt" | "status" | "";

/* ---------- Helpers ---------- */

function formatRefRange(p: LabResultParameter): string {
  const ref = p.parameter.referenceRanges?.[0];
  if (!ref) return "—";
  if (ref.textNormal) return ref.textNormal;
  if (ref.lowNormal && ref.highNormal) return `${ref.lowNormal} - ${ref.highNormal}`;
  if (ref.lowNormal) return `≥ ${ref.lowNormal}`;
  if (ref.highNormal) return `≤ ${ref.highNormal}`;
  return "—";
}

// Auto-flag computation
function computeFlag(p: LabResultParameter, value: string): string {
  if (!value || !value.trim()) return "normal";
  const v = value.trim();
  const ref = p.parameter.referenceRanges?.[0];

  if (p.parameter.resultType === "positive-negative") {
    return v.toLowerCase() === "positive" ? "abnormal" : "normal";
  }
  if (p.parameter.resultType === "reactive") {
    return v.toLowerCase() === "reactive" ? "abnormal" : "normal";
  }
  if (p.parameter.resultType === "numeric") {
    const num = Number(v);
    if (Number.isNaN(num) || !ref) return "normal";
    const low = ref.lowNormal ? Number(ref.lowNormal) : null;
    const high = ref.highNormal ? Number(ref.highNormal) : null;
    const critLow = ref.criticalLow ? Number(ref.criticalLow) : null;
    const critHigh = ref.criticalHigh ? Number(ref.criticalHigh) : null;
    if ((critLow !== null && !Number.isNaN(critLow) && num < critLow) ||
        (critHigh !== null && !Number.isNaN(critHigh) && num > critHigh)) {
      return "critical";
    }
    if (low !== null && !Number.isNaN(low) && num < low) return "low";
    if (high !== null && !Number.isNaN(high) && num > high) return "high";
    return "normal";
  }
  return "normal";
}

function flagCounts(parameters: LabResultParameter[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of parameters) {
    if (p.flag && p.flag !== "normal") {
      counts[p.flag] = (counts[p.flag] || 0) + 1;
    }
  }
  return counts;
}

async function patchResult(
  id: string,
  body: Record<string, unknown>,
  successMsg: string,
  refresh: () => void,
) {
  try {
    const res = await fetchAPI(`/api/lab-results/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed");
    toast.success(successMsg);
    refresh();
    return true;
  } catch {
    toast.error("Action failed");
    return false;
  }
}

function flagBadgeHTML(flag: string): string {
  const map: Record<string, { bg: string; color: string; text: string }> = {
    normal: { bg: "#ecfdf5", color: "#059669", text: "Normal" },
    high: { bg: "#fef3c7", color: "#b45309", text: "High" },
    low: { bg: "#cffafe", color: "#0e7490", text: "Low" },
    critical: { bg: "#fef2f2", color: "#e11d48", text: "Critical" },
    panic: { bg: "#fee2e2", color: "#b91c1c", text: "PANIC" },
    abnormal: { bg: "#ede9fe", color: "#6d28d9", text: "Abnormal" },
  };
  const f = map[flag] || map.normal;
  return `<span class="badge" style="background:${f.bg}; color:${f.color};">${f.text}</span>`;
}

function printLabReport(result: LabResult, testName: string) {
  const statusClass = result.status === "released" ? "emerald" : "teal";
  const statusBadge = `<span class="badge ${statusClass}">${escapeHTML(result.status.toUpperCase())}</span>`;

  const patientGrid = `
    <div class="info-grid">
      <div><div class="label">Patient Name</div><div><strong>${escapeHTML(result.order.patient.name)}</strong></div></div>
      <div><div class="label">Patient ID</div><div style="font-family: monospace;">${escapeHTML(result.order.patient.patientCode)}</div></div>
      <div><div class="label">Age / Gender</div><div>${result.order.patient.age} yrs / ${escapeHTML(result.order.patient.gender)}</div></div>
      <div><div class="label">Phone</div><div>${escapeHTML(result.order.patient.phone || "—")}</div></div>
      <div><div class="label">Order No</div><div style="font-family: monospace;">${escapeHTML(result.order.orderNo)}</div></div>
      <div><div class="label">Report Date</div><div>${escapeHTML(formatDate(result.createdAt))}</div></div>
    </div>`;

  const resultsTable = `
    <table>
      <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
      <tbody>
        ${result.parameters.map((p) => {
          const refText = formatRefRange(p);
          return `<tr>
            <td>${escapeHTML(p.parameter.name)}</td>
            <td><strong>${escapeHTML(p.value || "—")}</strong></td>
            <td>${escapeHTML(p.parameter.unit || "")}</td>
            <td>${escapeHTML(refText)}</td>
            <td>${flagBadgeHTML(p.flag)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;

  const pathComments = result.pathologistComments
    ? `<h2>Pathologist Comments</h2>
       <p style="padding: 10px 14px; background: #f0fdfa; border-left: 3px solid #0d9488; border-radius: 0 8px 8px 0; font-size: 13px;">${escapeHTML(result.pathologistComments)}</p>`
    : "";

  const body = `${docHeader(result.order.orderNo, "LABORATORY REPORT", formatDate(result.createdAt), statusBadge)}
    <h2>Test Performed: ${escapeHTML(testName)}</h2>
    ${patientGrid}
    <h2>Results</h2>
    ${resultsTable}
    ${pathComments}
    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">${escapeHTML(result.technicianName || "Lab Technician")}</div><div class="role">Lab Technician</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">${escapeHTML(result.approvedBy || result.verifiedBy || "Pathologist")}</div><div class="role">Consultant Pathologist</div></div>
    </div>`;

  printHTML(`Lab Report ${result.order.orderNo}`, body);
}

/* ---------- Main View ---------- */

export function LimsResults() {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((k) => k + 1), []);
  const { data: results, loading, error } = useFetch<LabResult[]>(
    refresh ? `/api/lab-results?_r=${refresh}` : "/api/lab-results",
  );
  const { data: testMasters } = useFetch<LabTestMasterLite[]>("/api/lab-tests-master");

  const testNameMap = useMemo(() => {
    const m = new Map<string, LabTestMasterLite>();
    testMasters?.forEach((t) => m.set(t.id, { id: t.id, name: t.name, code: t.code, category: t.category }));
    return m;
  }, [testMasters]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [enterResult, setEnterResult] = useState<LabResult | null>(null);
  const [approveResult, setApproveResult] = useState<LabResult | null>(null);
  const [viewResult, setViewResult] = useState<LabResult | null>(null);
  const [labType, setLabType] = useState<"internal" | "external">("internal");
  const [uploadResult, setUploadResult] = useState<LabResult | null>(null);

  /* Filter by lab type: external = results with External in technician or releasedBy */
  const isExternalResult = (r: LabResult) => {
    const t = (r.technicianName || "").toLowerCase();
    const rb = (r.releasedBy || "").toLowerCase();
    return t.includes("external") || rb.includes("external") || t.includes("pathcare") || rb.includes("pathcare") || t.includes("national health") || rb.includes("national health") || t.includes("himalayan") || rb.includes("himalayan");
  };

  const labFiltered = useMemo(() => {
    if (!results) return [];
    if (labType === "internal") return results.filter((r) => !isExternalResult(r));
    return results.filter((r) => isExternalResult(r));
  }, [results, labType]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    const list = labFiltered.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch = !ql ||
        r.order.orderNo.toLowerCase().includes(ql) ||
        r.order.patient.name.toLowerCase().includes(ql) ||
        (r.order.samples?.find(s => s.testId === r.testId) || r.order.samples?.[0])?.sampleCode.toLowerCase().includes(ql);
      return matchesStatus && matchesSearch;
    });
    if (!sortKey) return list;
    const d = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "orderNo") return a.order.orderNo.localeCompare(b.order.orderNo) * d;
      if (sortKey === "status") return a.status.localeCompare(b.status) * d;
      if (sortKey === "enteredAt") {
        const av = a.enteredAt ? new Date(a.enteredAt).getTime() : 0;
        const bv = b.enteredAt ? new Date(b.enteredAt).getTime() : 0;
        return (av - bv) * d;
      }
      return 0;
    });
  }, [labFiltered, q, statusFilter, sortKey, sortDir]);

  const pagination = usePagination<LabResult>(filtered, 10);

  const stats = useMemo(() => {
    return {
      pending: labFiltered.filter((r) => r.status === "pending").length,
      entered: labFiltered.filter((r) => r.status === "entered").length,
      verified: labFiltered.filter((r) => r.status === "verified").length,
      released: labFiltered.filter((r) => r.status === "released" || r.status === "approved").length,
    };
  }, [labFiltered]);

  const handleExport = () => {
    if (!filtered.length) { toast.info("No results to export"); return; }
    exportToCSV("lab-results.csv", [
      "Order No", "Sample", "Patient", "Test", "Status", "Technician", "Flags",
    ], filtered.map((r) => {
      const counts = flagCounts(r.parameters);
      const flags = FLAG_ORDER
        .filter((f) => counts[f])
        .map((f) => `${counts[f]} ${f}`)
        .join("; ") || "None";
      return [
        r.order.orderNo,
        r.order.samples?.[0]?.sampleCode || "",
        r.order.patient.name,
        testNameMap.get(r.testId)?.name || r.testId,
        r.status,
        r.technicianName || "",
        flags,
      ];
    }));
    toast.success(`Exported ${filtered.length} results to CSV`);
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
            <FileText className="w-5 h-5 text-teal-600" /> Result Entry &amp; Approval
          </h2>
          <p className="text-sm text-muted-foreground">Lab technician workspace · {results?.length ?? 0} results</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border overflow-hidden">
            <button
              onClick={() => setLabType("internal")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                labType === "internal"
                  ? "bg-teal-600 text-white"
                  : "bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              <Beaker className="w-3.5 h-3.5 inline mr-1" /> Internal Lab
            </button>
            <button
              onClick={() => setLabType("external")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                labType === "external"
                  ? "bg-violet-600 text-white"
                  : "bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              <Send className="w-3.5 h-3.5 inline mr-1" /> External Lab
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Pending", value: stats.pending, icon: ClipboardList, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
          { label: "Entered", value: stats.entered, icon: PenLine, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
          { label: "Approval", value: stats.verified, icon: ShieldCheck, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30" },
          { label: "Released", value: stats.released, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
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
              <Input placeholder="Search order no or patient…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors capitalize ${
                    statusFilter === s ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:bg-accent border-border"
                  }`}>
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader label="Order No" colKey="orderNo" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("orderNo")} />
                  <TableHead>Sample</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Test</TableHead>
                  <TableHead className="text-center">Params</TableHead>
                  <TableHead>Flags</TableHead>
                  <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("status")} className="text-center" />
                  <TableHead className="hidden lg:table-cell">Technician</TableHead>
                  <SortHeader label="Entered" colKey="enteredAt" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("enteredAt")} className="hidden sm:table-cell" />
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
                    <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      No results found
                    </TableCell>
                  </TableRow>
                ) : pagination.paged.map((r) => {
                  const counts = flagCounts(r.parameters);
                  const testName = testNameMap.get(r.testId)?.name || `Test ${r.testId.slice(-6)}`;
                  return (
                    <TableRow key={r.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-xs">{r.order.orderNo}</TableCell>
                      <TableCell className="font-mono text-xs text-cyan-600 dark:text-cyan-400">
                        {(() => {
                          const sample = r.order.samples?.find(s => s.testId === r.testId) || r.order.samples?.[0];
                          return sample?.sampleCode || "—";
                        })()}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{r.order.patient.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.order.patient.patientCode}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{testName}</TableCell>
                      <TableCell className="text-center text-sm">{r.parameters.length}</TableCell>
                      <TableCell>
                        <FlagBadges counts={counts} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] capitalize ${RESULT_STATUS_COLORS[r.status] || "bg-gray-100"}`}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {r.technicianName ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" /> {r.technicianName}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {r.enteredAt ? timeAgo(r.enteredAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ResultActions
                          result={r}
                          testName={testName}
                          labType={labType}
                          onEnter={() => setEnterResult(r)}
                          onApprove={() => setApproveResult(r)}
                          onView={() => setViewResult(r)}
                          onUpload={() => setUploadResult(r)}
                          onActioned={refreshFn}
                        />
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

      {/* Enter Result dialog */}
      <EnterResultDialog
        result={enterResult}
        testName={enterResult ? (testNameMap.get(enterResult.testId)?.name || `Test ${enterResult.testId.slice(-6)}`) : ""}
        onOpenChange={(o) => !o && setEnterResult(null)}
        onSaved={() => { setEnterResult(null); refreshFn(); }}
      />

      {/* Approve dialog */}
      <ApproveResultDialog
        result={approveResult}
        testName={approveResult ? (testNameMap.get(approveResult.testId)?.name || `Test ${approveResult.testId.slice(-6)}`) : ""}
        onOpenChange={(o) => !o && setApproveResult(null)}
        onSaved={() => { setApproveResult(null); refreshFn(); }}
      />

      {/* Upload report dialog */}
      <UploadReportDialog
        result={uploadResult}
        testName={uploadResult ? (testNameMap.get(uploadResult.testId)?.name || `Test ${uploadResult.testId.slice(-6)}`) : ""}
        onOpenChange={(o) => !o && setUploadResult(null)}
        onUploaded={() => { setUploadResult(null); refreshFn(); }}
      />

      {/* View Sheet */}
      <ResultViewSheet
        result={viewResult}
        testName={viewResult ? (testNameMap.get(viewResult.testId)?.name || `Test ${viewResult.testId.slice(-6)}`) : ""}
        onOpenChange={(o) => !o && setViewResult(null)}
        onPrint={() => viewResult && printLabReport(viewResult, testNameMap.get(viewResult.testId)?.name || `Test ${viewResult.testId.slice(-6)}`)}
      />

    </div>
  );
}

/* ---------- Flag Badges ---------- */

function FlagBadges({ counts }: { counts: Record<string, number> }) {
  const flags = FLAG_ORDER.filter((f) => counts[f]);
  if (flags.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} className={`text-[10px] capitalize ${FLAG_COLORS[f]}`}>
          {counts[f]} {f}
        </Badge>
      ))}
    </div>
  );
}

/* ---------- Result Actions ---------- */

function ResultActions({
  result, testName, labType, onEnter, onApprove, onView, onUpload, onActioned,
}: {
  result: LabResult;
  testName: string;
  labType: "internal" | "external";
  onEnter: () => void;
  onApprove: () => void;
  onView: () => void;
  onUpload: () => void;
  onActioned: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handle = async (body: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      const ok = await patchResult(result.id, body, successMsg, onActioned);
      return ok;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-teal-700 dark:text-teal-400" title="View details" onClick={onView}>
        <Eye className="w-3.5 h-3.5" />
      </Button>
      {labType === "internal" ? (
        <>
          {result.status === "pending" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900"
              onClick={onEnter}>
              <PenLine className="w-3 h-3" /> Result Entry
            </Button>
          )}
          {result.status === "entered" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900"
              disabled={saving}
              onClick={() => handle({ action: "verify", verifiedBy: "Pathologist" }, `Result for ${result.order.orderNo} verified`)}>
              <ShieldCheck className="w-3 h-3" /> Verify
            </Button>
          )}
          {result.status === "verified" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 dark:bg-teal-950/30 dark:border-teal-900"
              onClick={onApprove}>
              <CheckCircle2 className="w-3 h-3" /> Approve
            </Button>
          )}
          {result.status === "approved" && (
            <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving}
              onClick={() => handle({ action: "release", releasedBy: "Lab Department" }, `Result for ${result.order.orderNo} released`)}>
              <Send className="w-3 h-3" /> Release
            </Button>
          )}
          {result.status === "released" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
              onClick={() => printLabReport(result, testName)}>
              <Printer className="w-3 h-3" /> Print
            </Button>
          )}
        </>
      ) : (
        <>
          {result.status !== "released" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900"
              onClick={onUpload}>
              <FileText className="w-3 h-3" /> Upload Report
            </Button>
          )}
          {result.status === "released" && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
              onClick={() => printLabReport(result, testName)}>
              <Printer className="w-3 h-3" /> Print
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Enter Result Dialog ---------- */

function EnterResultDialog({
  result, testName, onOpenChange, onSaved,
}: {
  result: LabResult | null;
  testName: string;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [technicianName, setTechnicianName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (result) {
      const v: Record<string, string> = {};
      const c: Record<string, string> = {};
      result.parameters.forEach((p) => {
        v[p.id] = p.value || "";
        c[p.id] = p.comment || "";
      });
      setValues(v);
      setComments(c);
      setTechnicianName(result.technicianName || "");
    }
  }, [result]);

  if (!result) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName.trim()) { toast.error("Enter the technician's name"); return; }
    // Validate that every parameter has a value
    const missing = result.parameters.filter((p) => !values[p.id] || !values[p.id].trim());
    if (missing.length > 0) {
      toast.error(`Please enter values for all parameters (${missing.length} missing)`);
      return;
    }
    const payload = result.parameters.map((p) => ({
      id: p.id,
      value: values[p.id].trim(),
      flag: computeFlag(p, values[p.id]),
      comment: comments[p.id]?.trim() || null,
    }));
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-results/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enter",
          technicianName: technicianName.trim(),
          parameters: payload,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Results saved for ${result.order.orderNo}`);
      onSaved();
    } catch {
      toast.error("Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!result} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-teal-600" /> Enter Test Results
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{testName}</span> · <span className="font-mono">{result.order.orderNo}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Patient info banner */}
        <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Patient</p>
            <p className="font-medium">{result.order.patient.name}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Patient ID</p>
            <p className="font-mono text-xs">{result.order.patient.patientCode}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Age / Gender</p>
            <p>{result.order.patient.age} / {result.order.patient.gender}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Order Date</p>
            <p>{formatDate(result.createdAt)}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {result.parameters.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No parameters defined for this test.
            </div>
          ) : (
            <div className="space-y-3">
              {result.parameters.map((p) => (
                <ParameterInputRow
                  key={p.id}
                  param={p}
                  value={values[p.id] || ""}
                  comment={comments[p.id] || ""}
                  onValueChange={(v) => setValues((s) => ({ ...s, [p.id]: v }))}
                  onCommentChange={(v) => setComments((s) => ({ ...s, [p.id]: v }))}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label>Technician Name *</Label>
              <StaffSearch value={technicianName} onValueChange={setTechnicianName} label="Technician Name" required />
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
            On save, status will be set to <span className="font-semibold">Entered</span>. The result will then be ready for pathologist verification.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Save Results"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Parameter Input Row ---------- */

function ParameterInputRow({
  param, value, comment, onValueChange, onCommentChange,
}: {
  param: LabResultParameter;
  value: string;
  comment: string;
  onValueChange: (v: string) => void;
  onCommentChange: (v: string) => void;
}) {
  const flag = computeFlag(param, value);
  const refText = formatRefRange(param);

  const options = param.parameter.options
    ? param.parameter.options.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{param.parameter.name}</span>
          {param.parameter.unit && (
            <span className="text-xs text-muted-foreground">({param.parameter.unit})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Ref: <span className="font-medium text-foreground">{refText}</span></span>
          {value && (
            <Badge className={`text-[10px] capitalize ${FLAG_COLORS[flag]}`}>{flag}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="sm:col-span-1 space-y-1">
          <Label className="text-[11px] text-muted-foreground">Result</Label>
          {param.parameter.resultType === "numeric" && (
            <Input type="number" step="any" placeholder="e.g. 13.5" value={value}
              onChange={(e) => onValueChange(e.target.value)} />
          )}
          {param.parameter.resultType === "text" && (
            <Input type="text" placeholder="Enter text result" value={value}
              onChange={(e) => onValueChange(e.target.value)} />
          )}
          {param.parameter.resultType === "dropdown" && (
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {param.parameter.resultType === "positive-negative" && (
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Positive">Positive</SelectItem>
                <SelectItem value="Negative">Negative</SelectItem>
              </SelectContent>
            </Select>
          )}
          {param.parameter.resultType === "reactive" && (
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Reactive">Reactive</SelectItem>
                <SelectItem value="Non Reactive">Non Reactive</SelectItem>
              </SelectContent>
            </Select>
          )}
          {/* Fallback for any other resultType (image/file/etc.) */}
          {!["numeric", "text", "dropdown", "positive-negative", "reactive"].includes(param.parameter.resultType) && (
            <Input type="text" placeholder="Enter result" value={value}
              onChange={(e) => onValueChange(e.target.value)} />
          )}
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-[11px] text-muted-foreground">Comment (optional)</Label>
          <Input type="text" placeholder="Add a comment…" value={comment}
            onChange={(e) => onCommentChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Approve Result Dialog ---------- */

function ApproveResultDialog({
  result, testName, onOpenChange, onSaved,
}: {
  result: LabResult | null;
  testName: string;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (result) setComments(result.pathologistComments || "");
  }, [result]);

  if (!result) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/lab-results/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          approvedBy: "Dr. Pathologist",
          pathologistComments: comments.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Result for ${result.order.orderNo} approved`);
      onSaved();
    } catch {
      toast.error("Failed to approve result");
    } finally {
      setSaving(false);
    }
  };

  const counts = flagCounts(result.parameters);

  return (
    <Dialog open={!!result} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" /> Approve Result
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{testName}</span> · <span className="font-mono">{result.order.orderNo}</span> · {result.order.patient.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {/* Summary of results */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Results Summary</p>
              <FlagBadges counts={counts} />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {result.parameters.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0">
                  <span className="flex-1 min-w-0 truncate">
                    <span className="font-medium">{p.parameter.name}</span>
                    {p.parameter.unit && <span className="text-muted-foreground ml-1">({p.parameter.unit})</span>}
                  </span>
                  <span className="font-mono font-medium mx-2">{p.value || "—"}</span>
                  {p.flag !== "normal" && (
                    <Badge className={`text-[10px] capitalize ${FLAG_COLORS[p.flag]}`}>{p.flag}</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pathologist Comments</Label>
            <Textarea rows={4} placeholder="Add clinical interpretation, recommendations, or notes…"
              value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>

          <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/20 p-3 text-xs text-teal-800 dark:text-teal-300">
            On approval, the result will be marked <span className="font-semibold">Approved</span> and ready for release to the patient record.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Approving…" : "Approve Result"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Upload Report Dialog ---------- */

function UploadReportDialog({
  result, testName, onOpenChange, onUploaded,
}: {
  result: LabResult | null;
  testName: string;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (result) {
      setFile(null);
      setNotes("");
    }
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    if (!file) {
      toast.error("Please select a report file");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resultId", result.id);
      formData.append("notes", notes);

      const res = await fetchAPI("/api/lab-results/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success(`Report uploaded for ${result.order.orderNo}`);
      onUploaded();
    } catch {
      toast.error("Failed to upload report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!result} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-600" /> Upload Lab Report
          </DialogTitle>
          <DialogDescription>
            Upload external lab report for <span className="font-mono">{result?.order?.orderNo}</span> — {testName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Report File *</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1 text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 dark:file:bg-violet-900/50 dark:file:text-violet-300"
              />
            </div>
            {file && (
              <p className="text-[11px] text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upload-notes">Notes</Label>
            <Textarea
              id="upload-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about the report..."
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              disabled={saving || !file}
            >
              {saving ? "Uploading…" : (<><FileText className="w-4 h-4" /> Upload Report</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Result View Sheet ---------- */

function ResultViewSheet({
  result, testName, onOpenChange, onPrint,
}: {
  result: LabResult | null;
  testName: string;
  onOpenChange: (v: boolean) => void;
  onPrint: () => void;
}) {
  if (!result) return null;

  const timeline = [
    { label: "Entered", icon: PenLine, who: result.technicianName, at: result.enteredAt },
    { label: "Verified", icon: ShieldCheck, who: result.verifiedBy, at: result.verifiedAt },
    { label: "Approved", icon: CheckCircle2, who: result.approvedBy, at: result.approvedAt },
    { label: "Released", icon: Send, who: result.releasedBy, at: result.releasedAt },
  ];

  return (
    <Sheet open={!!result} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span className="font-mono">{result.order.orderNo}</span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="font-medium">{testName}</span>
                <Badge className={`text-[10px] capitalize ${RESULT_STATUS_COLORS[result.status] || "bg-gray-100"}`}>{result.status}</Badge>
                <span>v{result.reportVersion}</span>
              </SheetDescription>
            </div>
            {result.status === "released" && (
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onPrint}>
                <Printer className="w-4 h-4" /> Print
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-5">
          {/* Patient info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SheetInfoTile label="Patient" value={result.order.patient.name} icon={<User className="w-3.5 h-3.5" />} />
            <SheetInfoTile label="Patient ID" value={result.order.patient.patientCode} mono />
            <SheetInfoTile label="Age / Gender" value={`${result.order.patient.age} / ${result.order.patient.gender}`} icon={<Activity className="w-3.5 h-3.5" />} />
            <SheetInfoTile label="Technician" value={result.technicianName || "—"} icon={<UserCheck className="w-3.5 h-3.5" />} />
            <SheetInfoTile label="Created" value={formatDate(result.createdAt)} icon={<Clock className="w-3.5 h-3.5" />} />
            <SheetInfoTile label="Phone" value={result.order.patient.phone || "—"} />
          </div>

          {/* Parameters table */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-teal-600" /> Parameters
              <Badge variant="outline" className="text-[10px]">{result.parameters.length}</Badge>
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Parameter</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden sm:table-cell">Unit</TableHead>
                    <TableHead className="hidden md:table-cell">Ref Range</TableHead>
                    <TableHead className="text-center">Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.parameters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                        No parameters defined.
                      </TableCell>
                    </TableRow>
                  ) : result.parameters.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{p.parameter.name}</p>
                        {p.comment && <p className="text-xs text-muted-foreground italic mt-0.5">{p.comment}</p>}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-sm">{p.value || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.parameter.unit || ""}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatRefRange(p)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] capitalize ${FLAG_COLORS[p.flag] || FLAG_COLORS.normal}`}>{p.flag}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Status Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" /> Status Timeline
            </h4>
            <div className="relative space-y-0">
              {timeline.map((step, i) => {
                const complete = !!step.at;
                return (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${complete ? "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300" : "bg-muted text-muted-foreground"}`}>
                        <step.icon className="w-3.5 h-3.5" />
                      </div>
                      {i < timeline.length - 1 && <div className={`w-px flex-1 min-h-[32px] ${complete ? "bg-teal-300" : "bg-border"}`} />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${complete ? "" : "text-muted-foreground"}`}>{step.label}</p>
                        {!complete && <span className="text-[10px] text-muted-foreground">(pending)</span>}
                      </div>
                      {complete && (
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          {step.who && <p>by <span className="font-medium text-foreground">{step.who}</span></p>}
                          <p>{formatDateTime(step.at!)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pathologist comments */}
          {result.pathologistComments && (
            <div className="rounded-lg border bg-teal-50 dark:bg-teal-950/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-teal-700 dark:text-teal-300 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Pathologist Comments
              </p>
              <p className="text-sm">{result.pathologistComments}</p>
            </div>
          )}

          {/* Rejection reason */}
          {result.rejectionReason && (
            <div className="rounded-lg border bg-rose-50 dark:bg-rose-950/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300 mb-1">Rejection Reason</p>
              <p className="text-sm">{result.rejectionReason}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
