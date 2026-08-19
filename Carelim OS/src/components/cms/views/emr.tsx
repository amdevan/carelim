"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { usePagination, useSort } from "@/lib/use-pagination";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { Pagination } from "@/components/cms/pagination";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search, FileText, Plus, Printer, Download, Stethoscope, Pill,
  HeartPulse, CalendarClock, ArrowUp, ArrowDown, ArrowUpDown, X,
  LayoutGrid, List, Eye, Clock, CheckCircle2, AlertTriangle,
  Activity, ChevronDown, ChevronRight, Copy, Sparkles,
  User, MessageSquare, FileCheck, FlaskConical, ClipboardList, Send,
} from "lucide-react";
import { formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─────────── Types ─────────── */

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
}

interface Prescription {
  id: string;
  code: string;
  patientId: string;
  doctorId: string;
  diagnosis: string | null;
  symptoms: string | null;
  vitals: string | null;
  advice: string | null;
  followUp: string | null;
  status: string;
  createdAt: string;
  patient: { id: string; patientCode: string; name: string; age: number; gender: string };
  doctor: {
    id: string;
    name: string;
    specialization: string;
    department?: { name: string; color: string } | null;
  };
  items: PrescriptionItem[];
}

type DisplayPrescription = Prescription & { patientName: string };

interface PatientOption {
  id: string;
  patientCode: string;
  name: string;
  age?: number;
  gender?: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
  department?: { name: string; color: string } | null;
}

interface MedicineItemDraft {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

/* ─────────── Constants ─────────── */

const FREQUENCIES = ["1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-1", "0-0-0-1", "SOS", "HS", "STAT", "After meal", "Before meal", "Empty stomach", "Bedtime", "As needed"];

const SORT_COLS: { key: keyof DisplayPrescription; label: string }[] = [
  { key: "createdAt", label: "Date" },
  { key: "code", label: "Code" },
  { key: "patientName", label: "Patient" },
  { key: "diagnosis", label: "Diagnosis" },
];

const STATUS_OPTIONS = ["all", "active", "completed", "archived"];

const QUICK_TEMPLATES = [
  {
    name: "Common Cold",
    diagnosis: "Common Cold (URI)",
    medicines: [
      { medicineName: "Paracetamol 500mg", dosage: "1 Tablet", frequency: "1-0-1", duration: "5 days", quantity: "10", instructions: "After meal" },
      { medicineName: "Cetirizine 10mg", dosage: "1 Tablet", frequency: "0-0-1", duration: "5 days", quantity: "5", instructions: "At bedtime" },
      { medicineName: "Ambroxol 30mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "5 days", quantity: "5", instructions: "After meal" },
    ],
  },
  {
    name: "Hypertension Follow-up",
    diagnosis: "Essential Hypertension",
    medicines: [
      { medicineName: "Amlodipine 5mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "After meal" },
      { medicineName: "Metoprolol 25mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "" },
    ],
  },
  {
    name: "Gastritis",
    diagnosis: "Acute Gastritis",
    medicines: [
      { medicineName: "Pantoprazole 40mg", dosage: "1 Tablet", frequency: "1-0-0", duration: "14 days", quantity: "14", instructions: "Before breakfast" },
      { medicineName: "Domperidone 10mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "7 days", quantity: "7", instructions: "Before meal" },
      { medicineName: "Sucralfate 1g", dosage: "1 Sachet", frequency: "0-0-1", duration: "7 days", quantity: "7", instructions: "2 hours after meal" },
    ],
  },
  {
    name: "Diabetes Follow-up",
    diagnosis: "Type 2 Diabetes Mellitus",
    medicines: [
      { medicineName: "Metformin 500mg", dosage: "1 Tablet", frequency: "1-0-1", duration: "30 days", quantity: "60", instructions: "After meal" },
      { medicineName: "Glimepiride 2mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "Before meal" },
    ],
  },
];

/* ─────────── Utility Functions ─────────── */

function escapeHTML(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

function isFollowUpDue(p: DisplayPrescription): boolean {
  if (!p.followUp) return false;
  try {
    const d = new Date(p.followUp);
    const now = new Date();
    return d >= now && d.getTime() - now.getTime() < 7 * 86400000;
  } catch { return false; }
}

function buildPrescriptionHTML(p: DisplayPrescription): string {
  const deptName = p.doctor?.department?.name || "";
  const itemsHTML = (p.items?.length ? p.items : [])
    .map(
      (it) => `
      <div class="rx-item">
        <div class="med">${escapeHTML(it.medicineName)}</div>
        <div class="sig">${escapeHTML(it.dosage)} · ${escapeHTML(it.frequency)} · ${escapeHTML(it.duration)} · Qty: ${it.quantity}${it.instructions ? " · " + escapeHTML(it.instructions) : ""}</div>
      </div>`,
    )
    .join("");

  return `${docHeader(p.code, "PRESCRIPTION", formatDate(p.createdAt))}
    <h2>Patient Information</h2>
    <div class="info-grid">
      <div><div class="label">Patient Name</div>${escapeHTML(p.patient?.name || "—")}</div>
      <div><div class="label">Patient Code</div>${escapeHTML(p.patient?.patientCode || "—")}</div>
      <div><div class="label">Age / Gender</div>${p.patient?.age ?? "—"} yrs / ${escapeHTML(p.patient?.gender || "—")}</div>
      <div><div class="label">Attending Doctor</div>${escapeHTML(p.doctor?.name || "—")}${deptName ? ` (${escapeHTML(deptName)})` : ""}</div>
    </div>
    <h2>Clinical Notes</h2>
    <div class="info-grid">
      <div><div class="label">Diagnosis</div>${escapeHTML(p.diagnosis || "—")}</div>
      <div><div class="label">Symptoms</div>${escapeHTML(p.symptoms || "—")}</div>
      <div><div class="label">Vitals</div>${escapeHTML(p.vitals || "—")}</div>
    </div>
    <h2>Rx — Medicines</h2>
    ${itemsHTML || `<p style="color:#94a3b8;font-size:13px;padding:8px 0">No medicines prescribed.</p>`}
    ${p.advice ? `<h2>Advice</h2><p style="font-size:13px;line-height:1.6">${escapeHTML(p.advice)}</p>` : ""}
    ${p.followUp ? `<h2>Follow-up</h2><p style="font-size:13px;line-height:1.6">${escapeHTML(p.followUp)}</p>` : ""}
    <div class="signature">
      <div class="sig-block">
        <div class="line"></div>
        <div class="name">${escapeHTML(p.doctor?.name || "—")}</div>
        <div class="role">${escapeHTML(p.doctor?.specialization || "")}</div>
      </div>
    </div>`;
}

function emptyItem(): MedicineItemDraft {
  return {
    medicineName: "",
    dosage: "",
    frequency: "After meal",
    duration: "",
    quantity: "",
    instructions: "",
  };
}

/* ═══════════════════════════════════════════════════════════
   MAIN EMR VIEW
   ═══════════════════════════════════════════════════════════ */

export function EmrView() {
  const [refresh, setRefresh] = useState(0);
  const { data, loading } = useFetch<Prescription[]>(`/api/prescriptions?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [detailPrescription, setDetailPrescription] = useState<DisplayPrescription | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const prescriptions = useMemo<DisplayPrescription[]>(
    () => (data ?? []).map((p) => ({ ...p, patientName: p.patient?.name || "" })),
    [data],
  );

  const uniqueDoctors = useMemo(() => {
    const map = new Map<string, string>();
    prescriptions.forEach((p) => {
      if (p.doctor?.id && p.doctor?.name) map.set(p.doctor.id, p.doctor.name);
    });
    return Array.from(map.entries());
  }, [prescriptions]);

  const filtered = useMemo(() => {
    let result = prescriptions;
    const ql = q.toLowerCase().trim();
    if (ql) {
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(ql) ||
          p.patientName.toLowerCase().includes(ql) ||
          (p.diagnosis || "").toLowerCase().includes(ql) ||
          (p.patient?.patientCode || "").toLowerCase().includes(ql),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (doctorFilter !== "all") {
      result = result.filter((p) => p.doctor?.id === doctorFilter);
    }
    return result;
  }, [prescriptions, q, statusFilter, doctorFilter]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<DisplayPrescription>(filtered, "createdAt");
  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<DisplayPrescription>(sorted, 10);

  /* Stats */
  const stats = useMemo(() => ({
    total: prescriptions.length,
    active: prescriptions.filter((p) => p.status === "active").length,
    completed: prescriptions.filter((p) => p.status === "completed").length,
    followUpDue: prescriptions.filter(isFollowUpDue).length,
    thisWeek: prescriptions.filter((p) => {
      const d = new Date(p.createdAt);
      const now = new Date();
      return (now.getTime() - d.getTime()) < 7 * 86400000;
    }).length,
  }), [prescriptions]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExport = () => {
    if (prescriptions.length === 0) {
      toast.error("No prescriptions to export");
      return;
    }
    const headers = ["Code", "Date", "Patient", "Doctor", "Diagnosis", "Status", "Medicines"];
    const rows = sorted.map((p) => [
      p.code,
      formatDate(p.createdAt),
      p.patient?.name || "",
      p.doctor?.name || "",
      p.diagnosis || "",
      p.status,
      (p.items || []).map((it) => `${it.medicineName} (${it.dosage})`).join("; "),
    ]);
    exportToCSV("prescriptions.csv", headers, rows);
    toast.success(`Exported ${rows.length} prescription(s) to CSV`);
  };

  const handleSaved = () => {
    setNewOpen(false);
    setRefresh((r) => r + 1);
  };

  const handleDuplicate = (p: DisplayPrescription) => {
    toast.success(`Duplicated prescription ${p.code} — opening new form`);
    setNewOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            EMR &amp; Prescriptions
          </h2>
          <p className="text-sm text-muted-foreground">
            {prescriptions.length} prescription record{prescriptions.length === 1 ? "" : "s"}
            {total !== prescriptions.length && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={prescriptions.length === 0}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setNewOpen(true)}
          >
            <Plus className="w-4 h-4" /> New Prescription
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: FileText, accent: "from-teal-500 to-teal-600" },
          { label: "Active", value: stats.active, icon: Activity, accent: "from-blue-500 to-blue-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
          { label: "Follow-up Due", value: stats.followUpDue, icon: AlertTriangle, accent: "from-amber-500 to-orange-500" },
          { label: "This Week", value: stats.thisWeek, icon: Clock, accent: "from-violet-500 to-purple-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-[0.03]`} />
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, patient, diagnosis, or patient code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s === "all" ? "All Status" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Doctors</SelectItem>
                  {uniqueDoctors.map(([id, name]) => (
                    <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Sort:</span>
              {SORT_COLS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <Button
                    key={col.key as string}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={`h-7 text-[11px] gap-1 ${active ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {active ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "card" ? "default" : "ghost"}
                className={`h-7 w-7 p-0 ${viewMode === "card" ? "bg-teal-600 text-white" : ""}`}
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                className={`h-7 w-7 p-0 ${viewMode === "table" ? "bg-teal-600 text-white" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── List ── */}
      {loading ? (
        <div className={viewMode === "card" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            viewMode === "card"
              ? <Skeleton key={i} className="h-72 rounded-xl" />
              : <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-teal-300" />
            </div>
            <p className="text-sm font-medium mb-1">No prescriptions found</p>
            <p className="text-xs text-muted-foreground mb-4">
              {q || statusFilter !== "all" || doctorFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first prescription to get started"}
            </p>
            {!q && statusFilter === "all" && doctorFilter === "all" && (
              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setNewOpen(true)}>
                <Plus className="w-4 h-4" /> New Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paged.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <PrescriptionCard
                  prescription={p}
                  expanded={expandedCards.has(p.id)}
                  onToggleExpand={() => toggleExpand(p.id)}
                  onDetail={() => setDetailPrescription(p)}
                  onDuplicate={() => handleDuplicate(p)}
                />
              </motion.div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Code</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Date</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Patient</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Doctor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Diagnosis</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Medicines</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">{p.code}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-[10px]">
                                {p.patient?.name?.charAt(0) || "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{p.patientName || "Unknown"}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{p.patient?.patientCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs">{p.doctor?.name || "—"}</td>
                        <td className="p-3 text-xs font-medium max-w-[200px] truncate">{p.diagnosis || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.items?.length || 0}</td>
                        <td className="p-3">
                          <Badge className={`text-[10px] ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                            {statusLabel(p.status)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailPrescription(p)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p))}>
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </>
      )}

      {/* ── Dialogs ── */}
      <NewPrescriptionDialog open={newOpen} onOpenChange={setNewOpen} onSaved={handleSaved} />
      <PrescriptionDetailDialog
        prescription={detailPrescription}
        onOpenChange={() => setDetailPrescription(null)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESCRIPTION CARD
   ═══════════════════════════════════════════════════════════ */

function PrescriptionCard({
  prescription: p,
  expanded,
  onToggleExpand,
  onDetail,
  onDuplicate,
}: {
  prescription: DisplayPrescription;
  expanded: boolean;
  onToggleExpand: () => void;
  onDetail: () => void;
  onDuplicate: () => void;
}) {
  const deptName = p.doctor?.department?.name;
  const deptColor = p.doctor?.department?.color || "#0d9488";
  const followUpSoon = isFollowUpDue(p);

  const handlePrint = () => {
    printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p));
  };

  const visibleItems = expanded ? p.items : p.items?.slice(0, 3);
  const hasMore = (p.items?.length || 0) > 3;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full group">
      {/* Status-dependent accent bar */}
      <div className={`h-1 ${
        p.status === "active" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
        p.status === "completed" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
        p.status === "archived" ? "bg-gradient-to-r from-gray-400 to-gray-500" :
        "bg-gradient-to-r from-teal-500 to-teal-600"
      }`} />

      <CardContent className="p-4 space-y-3">
        {/* Top row: code + date + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300 truncate">
              {p.code}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">· {timeAgo(p.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {followUpSoon && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                <CalendarClock className="w-2.5 h-2.5 mr-0.5" /> Follow-up
              </Badge>
            )}
            <Badge className={`text-[10px] ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabel(p.status)}
            </Badge>
          </div>
        </div>

        {/* Patient + Doctor */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 dark:bg-muted/20 px-3 py-2.5">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold">
              {p.patient?.name?.charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.patient?.name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{p.patient?.patientCode}</span>
              {" · "}
              {p.patient?.age}y
              {" · "}
              <span className="capitalize">{p.patient?.gender}</span>
            </p>
          </div>
          <div className="text-right shrink-0 max-w-[45%]">
            <p className="text-xs font-medium flex items-center gap-1 justify-end truncate">
              <Stethoscope className="w-3 h-3 text-teal-600 shrink-0" />
              <span className="truncate">{p.doctor?.name}</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 justify-end">
              {deptName ? (
                <>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: deptColor }}
                  />
                  <span className="truncate">{deptName}</span>
                </>
              ) : (
                <span className="truncate">{p.doctor?.specialization}</span>
              )}
            </p>
          </div>
        </div>

        {/* Diagnosis + symptoms + vitals */}
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-xs text-muted-foreground">Diagnosis: </span>
            <span className="font-semibold">{p.diagnosis || "—"}</span>
          </p>
          {p.symptoms && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Symptoms:</span> {p.symptoms}
            </p>
          )}
          {p.vitals && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-500" />
              {p.vitals}
            </p>
          )}
        </div>

        {/* Medicines */}
        {p.items?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Pill className="w-3 h-3" /> Medicines ({p.items.length})
            </p>
            <div className="space-y-1.5">
              {visibleItems.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border bg-card px-2.5 py-1.5 text-xs hover:border-teal-200 dark:hover:border-teal-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{it.medicineName}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900 shrink-0"
                    >
                      {it.dosage}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                    <span>{it.frequency}</span>
                    <span aria-hidden>·</span>
                    <span>{it.duration}</span>
                    <span aria-hidden>·</span>
                    <span>Qty: {it.quantity}</span>
                    {it.instructions && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="italic">{it.instructions}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-[11px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  {expanded ? (
                    <><ChevronDown className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronRight className="w-3 h-3" /> +{(p.items.length - 3)} more</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Advice + Follow-up */}
        {(p.advice || p.followUp) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {p.advice && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Advice
                </p>
                <p className="text-xs mt-0.5 line-clamp-2">{p.advice}</p>
              </div>
            )}
            {p.followUp && (
              <div className={`rounded-lg px-2.5 py-1.5 border ${followUpSoon ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50" : "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${followUpSoon ? "text-amber-700 dark:text-amber-300" : "text-teal-700 dark:text-teal-300"}`}>
                  <CalendarClock className="w-3 h-3" /> Follow-up
                </p>
                <p className="text-xs mt-0.5">{p.followUp}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={onDetail}>
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESCRIPTION DETAIL DIALOG
   ═══════════════════════════════════════════════════════════ */

function PrescriptionDetailDialog({
  prescription,
  onOpenChange,
}: {
  prescription: DisplayPrescription | null;
  onOpenChange: () => void;
}) {
  if (!prescription) return null;
  const p = prescription;

  return (
    <Dialog open={!!prescription} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Prescription {p.code}
          </DialogTitle>
          <DialogDescription>{formatDate(p.createdAt)} · {timeAgo(p.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient + Doctor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Patient</p>
              <p className="text-sm font-medium">{p.patient?.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.patient?.patientCode} · {p.patient?.age}y · {p.patient?.gender}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Doctor</p>
              <p className="text-sm font-medium">{p.doctor?.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.doctor?.specialization}
                {p.doctor?.department && (
                  <span className="ml-1">· {p.doctor.department.name}</span>
                )}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge className={`text-[10px] ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabel(p.status)}
            </Badge>
          </div>

          {/* Status Workflow */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {["active", "completed", "archived"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={p.status === s ? "default" : "outline"}
                  className={`h-7 text-xs capitalize ${p.status === s ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                  disabled={p.status === s}
                  onClick={async () => {
                    const res = await fetchAPI(`/api/prescriptions/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: s }),
                    });
                    if (res.ok) {
                      toast.success(`Prescription marked as ${s}`);
                    }
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Diagnosis + Symptoms + Vitals */}
          {(p.diagnosis || p.symptoms || p.vitals) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</p>
              {p.diagnosis && (
                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 p-2.5">
                  <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 uppercase">Diagnosis</p>
                  <p className="text-sm font-medium">{p.diagnosis}</p>
                </div>
              )}
              {p.symptoms && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Symptoms</p>
                  <p className="text-sm">{p.symptoms}</p>
                </div>
              )}
              {p.vitals && (
                <div className="rounded-lg bg-muted/40 p-2.5 flex items-start gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Vitals</p>
                    <p className="text-sm">{p.vitals}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medicines */}
          {p.items?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Pill className="w-3 h-3" /> Medicines ({p.items.length})
              </p>
              <div className="space-y-1.5">
                {p.items.map((it, idx) => (
                  <div key={it.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2">
                    <span className="text-xs font-mono text-teal-600 dark:text-teal-400 mt-0.5 shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{it.medicineName}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">{it.dosage}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                        <span>{it.frequency}</span>
                        <span>·</span>
                        <span>{it.duration}</span>
                        <span>·</span>
                        <span>Qty: {it.quantity}</span>
                        {it.instructions && (
                          <><span>·</span><span className="italic">{it.instructions}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advice + Follow-up */}
          {(p.advice || p.followUp) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {p.advice && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2.5">
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Advice</p>
                  <p className="text-xs mt-0.5">{p.advice}</p>
                </div>
              )}
              {p.followUp && (
                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 p-2.5">
                  <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> Follow-up
                  </p>
                  <p className="text-xs mt-0.5">{p.followUp}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p))} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEW PRESCRIPTION DIALOG
   ═══════════════════════════════════════════════════════════ */

function NewPrescriptionDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { data: patients } = useFetch<PatientOption[]>("/api/patients");
  const { data: doctors } = useFetch<DoctorOption[]>("/api/doctors");
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    diagnosis: "",
    symptoms: "",
    vitals: "",
    advice: "",
    followUp: "",
  });
  const [clinical, setClinical] = useState({
    chiefComplaints: "",
    presentIllness: "",
    historyDuration: "",
    severity: "Moderate",
    associatedSymptoms: "",
    pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
    surgicalHistory: "",
    allergies: { drug: "", food: "", latex: false, none: false },
    personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
    obstetricHistory: { lmp: "", gravida: "", para: "" },
    familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
    generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
    systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
    diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
    clinicalNotes: "",
    investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
    procedures: [{ name: "", date: "", notes: "" }],
    adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
    followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
    referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
    vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
  });
  const [items, setItems] = useState<MedicineItemDraft[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(["history", "examination", "diagnosis", "investigations", "advice", "referral"]));
  const toggleSection = (id: string) => setCollapsedSections(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const reset = () => {
    setForm({ patientId: "", doctorId: "", diagnosis: "", symptoms: "", vitals: "", advice: "", followUp: "" });
    setItems([emptyItem()]);
    setClinical({
      chiefComplaints: "", presentIllness: "", historyDuration: "", severity: "Moderate", associatedSymptoms: "",
      pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
      surgicalHistory: "",
      allergies: { drug: "", food: "", latex: false, none: false },
      personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
      obstetricHistory: { lmp: "", gravida: "", para: "" },
      familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
      generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
      systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
      diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
      clinicalNotes: "",
      investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
      procedures: [{ name: "", date: "", notes: "" }],
      adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
      followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
      referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
      vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
    });
  };

  const updateItem = (idx: number, patch: Partial<MedicineItemDraft>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems((arr) => [...arr, emptyItem()]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setForm((f) => ({ ...f, diagnosis: template.diagnosis }));
    setClinical((c) => ({ ...c, diagnosisDetail: { ...c.diagnosisDetail, primary: template.diagnosis } }));
    setItems(template.medicines.map((m) => ({ ...m })));
    toast.success(`Applied template: ${template.name}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId) {
      toast.error("Please select a patient and a doctor");
      return;
    }
    const validItems = items
      .filter((it) => it.medicineName.trim())
      .map((it) => ({
        medicineName: it.medicineName.trim(),
        dosage: it.dosage.trim() || "—",
        frequency: it.frequency,
        duration: it.duration.trim() || "—",
        quantity: Number(it.quantity) || 1,
        instructions: it.instructions.trim() || null,
      }));

    const clinicalData = {
      chiefComplaints: clinical.chiefComplaints.split("\n").filter(Boolean).map(s => s.startsWith("•") ? s : `• ${s}`),
      presentIllness: clinical.presentIllness,
      historyDuration: clinical.historyDuration,
      severity: clinical.severity,
      associatedSymptoms: clinical.associatedSymptoms,
      pastMedical: clinical.pastMedical,
      surgicalHistory: clinical.surgicalHistory.split(",").map(s => s.trim()).filter(Boolean),
      allergies: clinical.allergies,
      personalHistory: clinical.personalHistory,
      obstetricHistory: { ...clinical.obstetricHistory, applicable: true },
      familyHistory: clinical.familyHistory,
      generalAppearance: {
        pallor: clinical.generalAppearance.pallor || "—",
        icterus: clinical.generalAppearance.icterus || "—",
        cyanosis: clinical.generalAppearance.cyanosis || "—",
        clubbing: clinical.generalAppearance.clubbing || "—",
        edema: clinical.generalAppearance.edema || "—",
        lymphNodes: clinical.generalAppearance.lymphNodes || "—",
      },
      systemicExamination: {
        cvs: clinical.systemicExamination.cvs || "—",
        rs: clinical.systemicExamination.rs || "—",
        cns: clinical.systemicExamination.cns || "—",
        abdomen: clinical.systemicExamination.abdomen || "—",
        ent: clinical.systemicExamination.ent || "—",
        eye: clinical.systemicExamination.eye || "—",
        skin: clinical.systemicExamination.skin || "—",
      },
      diagnosis: {
        primary: clinical.diagnosisDetail.primary || form.diagnosis,
        secondary: clinical.diagnosisDetail.secondary,
        icd10: clinical.diagnosisDetail.icd10,
        icd11: clinical.diagnosisDetail.icd11,
      },
      clinicalNotes: clinical.clinicalNotes || form.advice,
      investigations: clinical.investigations.filter(i => i.name.trim()),
      procedures: clinical.procedures.filter(p => p.name.trim()),
      advice: clinical.adviceDetail,
      followUp: {
        date: clinical.followUpDetail.date ? new Date(clinical.followUpDetail.date) : new Date(Date.now() + 7 * 86400000),
        department: clinical.followUpDetail.department || form.doctorId,
        doctor: clinical.followUpDetail.doctor,
        nextReason: clinical.followUpDetail.nextReason || form.followUp,
      },
      referral: {
        referredTo: clinical.referral.referredTo || "—",
        hospital: clinical.referral.hospital || "—",
        doctor: clinical.referral.doctor || "—",
        reason: clinical.referral.reason || "—",
      },
    };

    setSaving(true);
    try {
      const res = await fetchAPI("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          doctorId: form.doctorId,
          diagnosis: form.diagnosis.trim() || clinical.diagnosisDetail.primary || null,
          symptoms: form.symptoms.trim() || clinical.chiefComplaints.trim() || null,
          vitals: form.vitals.trim() || null,
          advice: form.advice.trim() || null,
          followUp: form.followUp.trim() || null,
          items: validItems,
          clinicalData,
        }),
      });
      if (!res.ok) throw new Error("Failed to save prescription");
      const saved = await res.json();
      toast.success("Prescription saved successfully");
      reset();
      onSaved();
    } catch {
      toast.error("Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" /> New OPD Prescription
          </DialogTitle>
          <DialogDescription>
            Comprehensive clinical prescription matching the A4 print template. Fill all sections — saved data flows directly to the printable OPD prescription.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Templates */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0">Quick Fill:</span>
          {QUICK_TEMPLATES.map((t) => (
            <Button
              key={t.name}
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] shrink-0 gap-1"
              onClick={() => applyTemplate(t)}
            >
              <Sparkles className="w-2.5 h-2.5" /> {t.name}
            </Button>
          ))}
        </div>

        {/* Section nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border text-[10px]">
          {[
            { id: "patient", label: "Patient", icon: User },
            { id: "vitals", label: "Vitals", icon: Activity },
            { id: "complaints", label: "Complaints", icon: MessageSquare },
            { id: "history", label: "History", icon: Clock },
            { id: "examination", label: "Exam", icon: Stethoscope },
            { id: "diagnosis", label: "Dx", icon: FileCheck },
            { id: "investigations", label: "Labs", icon: FlaskConical },
            { id: "medication", label: "Rx", icon: Pill },
            { id: "advice", label: "Advice", icon: ClipboardList },
            { id: "referral", label: "Referral", icon: Send },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSection(s.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                collapsedSections.has(s.id) ? "bg-muted/60 text-muted-foreground hover:bg-muted" : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
              }`}
            >
              <s.icon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-2">
          {/* ============== PATIENT & VISIT ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("patient")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Patient & Visit</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("patient") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("patient") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Patient *">
                  <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {(patients || []).slice(0, 200).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.patientCode}) · {p.age}y</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Consultant Doctor *">
                  <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      {(doctors || []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialization}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Chief Complaints Summary (for card)">
                  <Input value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="e.g. Abdominal pain, fever, vomiting" />
                </Field>
                <Field label="Follow-up (short)">
                  <Input value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} placeholder="e.g. Review in 7 days" />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground italic">Fill sections below — patient, vitals, complaints, then medication. Other sections are optional.</p>
            </div>
            )}
          </div>

          {/* ============== VITALS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("vitals")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Vitals</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("vitals") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("vitals") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Vital Signs (10 parameters)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {([
                  ["bp", "Blood Pressure", "120/80 mmHg"],
                  ["pulse", "Pulse", "78 /min"],
                  ["temperature", "Temperature", "98.6 °F"],
                  ["respiration", "Respiration", "18 /min"],
                  ["spo2", "SpO₂", "98%"],
                  ["height", "Height", "170 cm"],
                  ["weight", "Weight", "65 kg"],
                  ["bmi", "BMI", "22.5"],
                  ["bloodSugar", "Blood Sugar", "94 mg/dL"],
                  ["painScore", "Pain Score", "2 / 10"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input
                      value={(clinical.vitalsDetail as Record<string, string>)[key]}
                      onChange={(e) => setClinical(c => ({ ...c, vitalsDetail: { ...c.vitalsDetail, [key]: e.target.value } }))}
                      placeholder={ph}
                      className="h-8 text-xs"
                    />
                  </Field>
                ))}
              </div>
              <Field label="Vitals Summary (for card)">
                <Input value={form.vitals} onChange={(e) => setForm({ ...form, vitals: e.target.value })} placeholder="BP 120/80, T 98.6°F, HR 78, SpO₂ 98%" />
              </Field>
            </div>
            )}
          </div>

          {/* ============== COMPLAINTS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("complaints")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Complaints</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("complaints") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("complaints") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <Field label="Chief Complaints (one per line)">
                <Textarea
                  value={clinical.chiefComplaints}
                  onChange={(e) => setClinical(c => ({ ...c, chiefComplaints: e.target.value }))}
                  placeholder={"Abdominal Pain\nVomiting\nFever\nConstipation\nLoss of Appetite"}
                  rows={5}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Duration">
                  <Input value={clinical.historyDuration} onChange={(e) => setClinical(c => ({ ...c, historyDuration: e.target.value }))} placeholder="3 days" />
                </Field>
                <Field label="Severity">
                  <Select value={clinical.severity} onValueChange={(v) => setClinical(c => ({ ...c, severity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Mild", "Moderate", "Severe"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Associated Symptoms">
                  <Input value={clinical.associatedSymptoms} onChange={(e) => setClinical(c => ({ ...c, associatedSymptoms: e.target.value }))} placeholder="Nausea, loss of appetite" />
                </Field>
              </div>
              <Field label="History of Present Illness">
                <Textarea
                  value={clinical.presentIllness}
                  onChange={(e) => setClinical(c => ({ ...c, presentIllness: e.target.value }))}
                  placeholder="Detailed narrative of the present illness — onset, progression, aggravating/relieving factors…"
                  rows={4}
                />
              </Field>
            </div>
            )}
          </div>

          {/* ============== HISTORY ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("history")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">History</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("history") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("history") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Past Medical History</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["asthma", "Asthma"], ["thyroid", "Thyroid"],
                  ["tuberculosis", "Tuberculosis"], ["heartDisease", "Heart Disease"], ["kidneyDisease", "Kidney Disease"], ["cancer", "Cancer"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs rounded-md border p-1.5 cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={(clinical.pastMedical as Record<string, boolean | string>)[key] as boolean}
                      onChange={(e) => setClinical(c => ({ ...c, pastMedical: { ...c.pastMedical, [key]: e.target.checked } }))}
                      className="rounded"
                    /> {label}
                  </label>
                ))}
              </div>
              <Field label="Others (past medical)">
                <Input value={clinical.pastMedical.others} onChange={(e) => setClinical(c => ({ ...c, pastMedical: { ...c.pastMedical, others: e.target.value } }))} placeholder="e.g. GERD — 2 years ago" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Surgical History (comma-separated)">
                  <Input value={clinical.surgicalHistory} onChange={(e) => setClinical(c => ({ ...c, surgicalHistory: e.target.value }))} placeholder="Appendectomy (2019), C-Section (2020)" />
                </Field>
                <Field label="Drug Allergy">
                  <Input value={clinical.allergies.drug} onChange={(e) => setClinical(c => ({ ...c, allergies: { ...c.allergies, drug: e.target.value } }))} placeholder="Penicillin (rash) or None" />
                </Field>
                <Field label="Food Allergy">
                  <Input value={clinical.allergies.food} onChange={(e) => setClinical(c => ({ ...c, allergies: { ...c.allergies, food: e.target.value } }))} placeholder="None" />
                </Field>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.latex} onChange={(e) => setClinical(c => ({ ...c, allergies: { ...c.allergies, latex: e.target.checked } }))} className="rounded" /> Latex Allergy</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.none} onChange={(e) => setClinical(c => ({ ...c, allergies: { ...c.allergies, none: e.target.checked } }))} className="rounded" /> No Known Allergies</label>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Personal / Family History</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["smoking", "Smoking", "Non-smoker"], ["alcohol", "Alcohol", "Occasional"], ["tobacco", "Tobacco", "No"],
                  ["exercise", "Exercise", "Regular"], ["diet", "Diet", "Mixed"], ["sleep", "Sleep", "7-8 hours"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.personalHistory as Record<string, string>)[key]} onChange={(e) => setClinical(c => ({ ...c, personalHistory: { ...c.personalHistory, [key]: e.target.value } }))} placeholder={ph} className="h-8 text-xs" />
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Field label="Father's History"><Input value={clinical.familyHistory.father} onChange={(e) => setClinical(c => ({ ...c, familyHistory: { ...c.familyHistory, father: e.target.value } }))} placeholder="Diabetes, HTN" className="h-8 text-xs" /></Field>
                <Field label="Mother's History"><Input value={clinical.familyHistory.mother} onChange={(e) => setClinical(c => ({ ...c, familyHistory: { ...c.familyHistory, mother: e.target.value } }))} placeholder="HTN" className="h-8 text-xs" /></Field>
                <Field label="Genetic Disease"><Input value={clinical.familyHistory.geneticDisease} onChange={(e) => setClinical(c => ({ ...c, familyHistory: { ...c.familyHistory, geneticDisease: e.target.value } }))} placeholder="None" className="h-8 text-xs" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== EXAMINATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("examination")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Examination</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("examination") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("examination") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">General Appearance</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["pallor", "Pallor"], ["icterus", "Icterus"], ["cyanosis", "Cyanosis"],
                  ["clubbing", "Clubbing"], ["edema", "Edema"], ["lymphNodes", "Lymph Nodes"],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.generalAppearance as Record<string, string>)[key]} onChange={(e) => setClinical(c => ({ ...c, generalAppearance: { ...c.generalAppearance, [key]: e.target.value } }))} placeholder="Absent / Mild / Present" className="h-8 text-xs" />
                  </Field>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Systemic Examination</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="CVS"><Textarea value={clinical.systemicExamination.cvs} onChange={(e) => setClinical(c => ({ ...c, systemicExamination: { ...c.systemicExamination, cvs: e.target.value } }))} placeholder="S1, S2 normal. No murmur." rows={2} className="text-xs" /></Field>
                <Field label="RS"><Textarea value={clinical.systemicExamination.rs} onChange={(e) => setClinical(c => ({ ...c, systemicExamination: { ...c.systemicExamination, rs: e.target.value } }))} placeholder="Bilateral air entry equal." rows={2} className="text-xs" /></Field>
                <Field label="CNS"><Textarea value={clinical.systemicExamination.cns} onChange={(e) => setClinical(c => ({ ...c, systemicExamination: { ...c.systemicExamination, cns: e.target.value } }))} placeholder="Conscious, oriented. GCS 15/15." rows={2} className="text-xs" /></Field>
                <Field label="Abdomen"><Textarea value={clinical.systemicExamination.abdomen} onChange={(e) => setClinical(c => ({ ...c, systemicExamination: { ...c.systemicExamination, abdomen: e.target.value } }))} placeholder="Soft, no organomegaly." rows={2} className="text-xs" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== DIAGNOSIS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("diagnosis")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Diagnosis</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("diagnosis") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("diagnosis") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Primary Diagnosis *">
                  <Input value={clinical.diagnosisDetail.primary} onChange={(e) => { setClinical(c => ({ ...c, diagnosisDetail: { ...c.diagnosisDetail, primary: e.target.value } })); setForm(f => ({ ...f, diagnosis: e.target.value })); }} placeholder="Acute Gastritis" />
                </Field>
                <Field label="Secondary Diagnosis">
                  <Input value={clinical.diagnosisDetail.secondary} onChange={(e) => setClinical(c => ({ ...c, diagnosisDetail: { ...c.diagnosisDetail, secondary: e.target.value } }))} placeholder="Mild Dehydration" />
                </Field>
                <Field label="ICD-10 Code">
                  <Input value={clinical.diagnosisDetail.icd10} onChange={(e) => setClinical(c => ({ ...c, diagnosisDetail: { ...c.diagnosisDetail, icd10: e.target.value } }))} placeholder="K29.7" className="font-mono" />
                </Field>
                <Field label="ICD-11 Code">
                  <Input value={clinical.diagnosisDetail.icd11} onChange={(e) => setClinical(c => ({ ...c, diagnosisDetail: { ...c.diagnosisDetail, icd11: e.target.value } }))} placeholder="DA42" className="font-mono" />
                </Field>
              </div>
              <Field label="Clinical Notes">
                <Textarea value={clinical.clinicalNotes} onChange={(e) => { setClinical(c => ({ ...c, clinicalNotes: e.target.value })); setForm(f => ({ ...f, advice: e.target.value })); }} placeholder="Patient counseled about condition and treatment plan…" rows={3} />
              </Field>
            </div>
            )}
          </div>

          {/* ============== INVESTIGATIONS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("investigations")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Investigations</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("investigations") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("investigations") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Investigation Advice</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical(c => ({ ...c, investigations: [...c.investigations, { name: "", reason: "", priority: "Routine", status: "Ordered" }] }))}>
                  <Plus className="w-3 h-3" /> Add Investigation
                </Button>
              </div>
              {clinical.investigations.map((inv, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Investigation #${idx + 1}`}><Input value={inv.name} onChange={(e) => setClinical(c => ({ ...c, investigations: c.investigations.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} placeholder="CBC / LFT / USG" className="h-8 text-xs" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Reason"><Input value={inv.reason} onChange={(e) => setClinical(c => ({ ...c, investigations: c.investigations.map((x, i) => i === idx ? { ...x, reason: e.target.value } : x) }))} placeholder="Rule out infection" className="h-8 text-xs" /></Field></div>
                  <div><Field label="Priority">
                    <Select value={inv.priority} onValueChange={(v) => setClinical(c => ({ ...c, investigations: c.investigations.map((x, i) => i === idx ? { ...x, priority: v } : x) }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Routine", "Urgent", "STAT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field></div>
                  {clinical.investigations.length > 1 && (
                    <div className="sm:col-span-5 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical(c => ({ ...c, investigations: c.investigations.filter((_, i) => i !== idx) }))}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Procedures</p>
              {clinical.procedures.map((proc, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Procedure #${idx + 1}`}><Input value={proc.name} onChange={(e) => setClinical(c => ({ ...c, procedures: c.procedures.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} placeholder="IV Fluids / Dressing / Nebulization" className="h-8 text-xs" /></Field></div>
                  <div><Field label="Date"><Input type="date" value={proc.date} onChange={(e) => setClinical(c => ({ ...c, procedures: c.procedures.map((x, i) => i === idx ? { ...x, date: e.target.value } : x) }))} className="h-8 text-xs" /></Field></div>
                  <div><Field label="Notes"><Input value={proc.notes} onChange={(e) => setClinical(c => ({ ...c, procedures: c.procedures.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x) }))} placeholder="1 pint over 4h" className="h-8 text-xs" /></Field></div>
                  {clinical.procedures.length > 1 && (
                    <div className="sm:col-span-4 flex justify-end"><Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical(c => ({ ...c, procedures: c.procedures.filter((_, i) => i !== idx) }))}><X className="w-3.5 h-3.5" /></Button></div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical(c => ({ ...c, procedures: [...c.procedures, { name: "", date: "", notes: "" }] }))}><Plus className="w-3 h-3" /> Add Procedure</Button>
            </div>
            )}
          </div>

          {/* ============== MEDICATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("medication")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Medication</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("medication") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("medication") && (
              <div className="space-y-2 animate-fade-in px-1 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Medication (℞)</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}><Plus className="w-3 h-3" /> Add Medicine</Button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border p-2.5 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Medicine #{idx + 1}</span>
                    {items.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => removeItem(idx)}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Field label="Medicine Name"><Input value={it.medicineName} onChange={(e) => updateItem(idx, { medicineName: e.target.value })} placeholder="Pantoprazole 40mg" className="h-8 text-xs" /></Field>
                    <Field label="Dosage"><Input value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} placeholder="1 Tablet" className="h-8 text-xs" /></Field>
                    <Field label="Frequency">
                      <Select value={it.frequency} onValueChange={(v) => updateItem(idx, { frequency: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Duration"><Input value={it.duration} onChange={(e) => updateItem(idx, { duration: e.target.value })} placeholder="7 days" className="h-8 text-xs" /></Field>
                    <Field label="Quantity"><Input type="number" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} placeholder="14" className="h-8 text-xs" /></Field>
                    <Field label="Instructions"><Input value={it.instructions} onChange={(e) => updateItem(idx, { instructions: e.target.value })} placeholder="Before breakfast" className="h-8 text-xs" /></Field>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* ============== ADVICE & FOLLOW-UP ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("advice")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Advice & Follow-up</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("advice") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("advice") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Advice</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Diet Advice"><Textarea value={clinical.adviceDetail.diet} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, diet: e.target.value } }))} placeholder="Bland diet, avoid spicy food" rows={2} className="text-xs" /></Field>
                <Field label="Lifestyle"><Textarea value={clinical.adviceDetail.lifestyle} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, lifestyle: e.target.value } }))} placeholder="Adequate rest, stress management" rows={2} className="text-xs" /></Field>
                <Field label="Exercise"><Input value={clinical.adviceDetail.exercise} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, exercise: e.target.value } }))} placeholder="Light walking" className="h-8 text-xs" /></Field>
                <Field label="Hydration"><Input value={clinical.adviceDetail.hydration} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, hydration: e.target.value } }))} placeholder="3L/day, ORS if dehydrated" className="h-8 text-xs" /></Field>
                <Field label="Restrictions"><Input value={clinical.adviceDetail.restrictions} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, restrictions: e.target.value } }))} placeholder="Avoid alcohol, NSAIDs" className="h-8 text-xs" /></Field>
                <Field label="Travel Advice"><Input value={clinical.adviceDetail.travel} onChange={(e) => setClinical(c => ({ ...c, adviceDetail: { ...c.adviceDetail, travel: e.target.value } }))} placeholder="No restrictions" className="h-8 text-xs" /></Field>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Follow-up</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Follow-up Date"><Input type="date" value={clinical.followUpDetail.date} onChange={(e) => setClinical(c => ({ ...c, followUpDetail: { ...c.followUpDetail, date: e.target.value } }))} className="h-8 text-xs" /></Field>
                <Field label="Department"><Input value={clinical.followUpDetail.department} onChange={(e) => setClinical(c => ({ ...c, followUpDetail: { ...c.followUpDetail, department: e.target.value } }))} placeholder="General Medicine" className="h-8 text-xs" /></Field>
                <Field label="Doctor"><Input value={clinical.followUpDetail.doctor} onChange={(e) => setClinical(c => ({ ...c, followUpDetail: { ...c.followUpDetail, doctor: e.target.value } }))} placeholder="Dr. Sharma" className="h-8 text-xs" /></Field>
                <Field label="Next Visit Reason"><Input value={clinical.followUpDetail.nextReason} onChange={(e) => setClinical(c => ({ ...c, followUpDetail: { ...c.followUpDetail, nextReason: e.target.value } }))} placeholder="Review symptoms & lab reports" className="h-8 text-xs" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== REFERRAL ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("referral")}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-semibold">Referral</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("referral") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("referral") && (
              <div className="space-y-3 animate-fade-in px-1 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Referral (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Referred To (Specialty)"><Input value={clinical.referral.referredTo} onChange={(e) => setClinical(c => ({ ...c, referral: { ...c.referral, referredTo: e.target.value } }))} placeholder="Cardiology" className="h-8 text-xs" /></Field>
                  <Field label="Hospital"><Input value={clinical.referral.hospital} onChange={(e) => setClinical(c => ({ ...c, referral: { ...c.referral, hospital: e.target.value } }))} placeholder="XYZ Hospital" className="h-8 text-xs" /></Field>
                  <Field label="Doctor"><Input value={clinical.referral.doctor} onChange={(e) => setClinical(c => ({ ...c, referral: { ...c.referral, doctor: e.target.value } }))} placeholder="Dr. Referral" className="h-8 text-xs" /></Field>
                  <Field label="Reason"><Input value={clinical.referral.reason} onChange={(e) => setClinical(c => ({ ...c, referral: { ...c.referral, reason: e.target.value } }))} placeholder="Further evaluation" className="h-8 text-xs" /></Field>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-200 mt-3">
                  <p className="font-semibold">Ready to save?</p>
                  <p>Click <strong>Save &amp; Print Preview</strong> below to save the prescription and open the A4 printable template in a new tab. The template includes all clinical sections, QR code, barcode, and digital signature.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Saving…" : <><FileText className="w-4 h-4" /> Save &amp; Print Preview</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}