"use client";
import { fetchAPI } from "@/lib/api";

import { useState, useMemo, useCallback } from "react";
import { useFetch } from "@/lib/use-fetch";
import { KpiCard } from "@/components/cms/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/cms/empty-state";
import { exportToCSV } from "@/lib/export-utils";
import { formatDate, timeAgo } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Smile as Tooth, Search, Plus, Save, History, Activity,
  AlertTriangle, CheckCircle2, XCircle, Stethoscope, FileImage, GitBranch,
} from "lucide-react";

// ============================================================
// Tooth status definitions (color-coded)
// ============================================================
type ToothStatus =
  | "sound" | "missing" | "decayed" | "filled" | "crown" | "bridge"
  | "implant" | "root_canal" | "extraction" | "fracture" | "mobility"
  | "sealant" | "impacted";

interface ToothConditionEntry { type: ToothStatus; date: string; note: string; }

interface Tooth {
  id: string;
  toothNumber: string;
  isPrimary: boolean;
  status: ToothStatus;
  surfaces: string | null;
  conditions: string | null;
  notes: string | null;
  updatedAt: string;
}

interface Odontogram {
  id: string;
  patientId: string;
  numberingSystem: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  teeth: Tooth[];
}

const STATUS_META: Record<ToothStatus, { label: string; color: string; bg: string; border: string; text: string }> = {
  sound:        { label: "Sound",        color: "#94a3b8", bg: "bg-slate-50 dark:bg-slate-900/40",    border: "border-slate-200 dark:border-slate-800",    text: "text-slate-600 dark:text-slate-300" },
  missing:      { label: "Missing",      color: "#64748b", bg: "bg-slate-100 dark:bg-slate-900/60",   border: "border-slate-300 dark:border-slate-700",    text: "text-slate-700 dark:text-slate-200" },
  decayed:      { label: "Decayed",      color: "#f43f5e", bg: "bg-rose-50 dark:bg-rose-950/40",      border: "border-rose-200 dark:border-rose-900/60",   text: "text-rose-700 dark:text-rose-300" },
  filled:       { label: "Filled",       color: "#0d9488", bg: "bg-teal-50 dark:bg-teal-950/40",      border: "border-teal-200 dark:border-teal-900/60",   text: "text-teal-700 dark:text-teal-300" },
  crown:        { label: "Crown",        color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/40",    border: "border-amber-200 dark:border-amber-900/60", text: "text-amber-700 dark:text-amber-300" },
  bridge:       { label: "Bridge",       color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-950/40",  border: "border-violet-200 dark:border-violet-900/60", text: "text-violet-700 dark:text-violet-300" },
  implant:      { label: "Implant",      color: "#ec4899", bg: "bg-pink-50 dark:bg-pink-950/40",      border: "border-pink-200 dark:border-pink-900/60",   text: "text-pink-700 dark:text-pink-300" },
  root_canal:   { label: "Root Canal",   color: "#06b6d4", bg: "bg-cyan-50 dark:bg-cyan-950/40",      border: "border-cyan-200 dark:border-cyan-900/60",   text: "text-cyan-700 dark:text-cyan-300" },
  extraction:   { label: "Extraction",   color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/40",        border: "border-red-200 dark:border-red-900/60",     text: "text-red-700 dark:text-red-300" },
  fracture:     { label: "Fracture",     color: "#f97316", bg: "bg-orange-50 dark:bg-orange-950/40",  border: "border-orange-200 dark:border-orange-900/60", text: "text-orange-700 dark:text-orange-300" },
  mobility:     { label: "Mobility",     color: "#a855f7", bg: "bg-purple-50 dark:bg-purple-950/40",  border: "border-purple-200 dark:border-purple-900/60", text: "text-purple-700 dark:text-purple-300" },
  sealant:      { label: "Sealant",      color: "#84cc16", bg: "bg-lime-50 dark:bg-lime-950/40",      border: "border-lime-200 dark:border-lime-900/60",   text: "text-lime-700 dark:text-lime-300" },
  impacted:     { label: "Impacted",     color: "#6b7280", bg: "bg-gray-50 dark:bg-gray-950/40",      border: "border-gray-200 dark:border-gray-800",      text: "text-gray-700 dark:text-gray-300" },
};

// FDI tooth quadrants (Permanent)
const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT  = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_LEFT  = ["31", "32", "33", "34", "35", "36", "37", "38"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];

// Universal numbering conversion (FDI -> Universal) for adult permanent teeth
const FDI_TO_UNIVERSAL: Record<string, string> = {
  "18":"1","17":"2","16":"3","15":"4","14":"5","13":"6","12":"7","11":"8",
  "21":"9","22":"10","23":"11","24":"12","25":"13","26":"14","27":"15","28":"16",
  "48":"32","47":"31","46":"30","45":"29","44":"28","43":"27","42":"26","41":"25",
  "31":"24","32":"23","33":"22","34":"21","35":"20","36":"19","37":"18","38":"17",
};

interface Patient {
  id: string; name: string; patientCode: string; age?: number; phone: string;
}

export function DentalOdontogram() {
  const [search, setSearch] = useState("");
  const [numbering, setNumbering] = useState<"fdi" | "universal">("fdi");
  const [refresh, setRefresh] = useState(0);

  // Patient list
  const { data: patients, loading: pLoading } = useFetch<Patient[]>(`/api/patients?_r=${refresh}`);
  const filtered = useMemo(() => {
    if (!patients) return [];
    const q = search.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.patientCode.toLowerCase().includes(q) || p.phone.includes(q));
  }, [patients, search]);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Odontograms for selected patient
  const { data: odontograms, loading: oLoading } = useFetch<Odontogram[]>(
    selectedPatientId ? `/api/dental-odontograms?patientId=${selectedPatientId}&_r=${refresh}` : null
  );

  const activeOdo = odontograms && odontograms.length > 0 ? odontograms[0] : null;
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const stats = useMemo(() => {
    if (!activeOdo) return { total: 0, sound: 0, issues: 0, byStatus: {} as Record<string, number> };
    const byStatus: Record<string, number> = {};
    activeOdo.teeth.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
    return {
      total: activeOdo.teeth.length,
      sound: byStatus.sound || 0,
      issues: activeOdo.teeth.length - (byStatus.sound || 0),
      byStatus,
    };
  }, [activeOdo]);

  const handleToothUpdate = useCallback(async (toothNumber: string, status: ToothStatus, note?: string) => {
    if (!activeOdo) return;
    try {
      const existing = activeOdo.teeth.find(t => t.toothNumber === toothNumber);
      const prevConditions: ToothConditionEntry[] = existing?.conditions ? JSON.parse(existing.conditions) : [];
      const newConditions = status !== "sound"
        ? [...prevConditions, { type: status, date: new Date().toISOString().slice(0, 10), note: note || "Updated via odontogram" }]
        : prevConditions;
      const res = await fetchAPI(`/api/dental-odontograms/${activeOdo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toothNumber, status, conditions: newConditions, notes: note || existing?.notes }),
      });
      if (!res.ok) throw new Error("Failed to update tooth");
      toast.success(`Tooth ${toothNumber} marked as ${STATUS_META[status].label}`);
      setRefresh(r => r + 1);
      setSelectedTooth(toothNumber);
    } catch (e) {
      toast.error("Could not update tooth: " + (e as Error).message);
    }
  }, [activeOdo]);

  const handleCreateOdontogram = async (patientId: string) => {
    try {
      const res = await fetchAPI("/api/dental-odontograms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, numberingSystem: "fdi", notes: "Initial charting" }),
      });
      if (!res.ok) throw new Error("Failed to create odontogram");
      toast.success("Odontogram created");
      setShowCreate(false);
      setSelectedPatientId(patientId);
      setRefresh(r => r + 1);
    } catch (e) {
      toast.error("Could not create: " + (e as Error).message);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold leading-tight">Interactive Odontogram</h2>
          <p className="text-xs text-muted-foreground">FDI / Universal numbering · click any tooth to chart conditions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setNumbering("fdi")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${numbering === "fdi" ? "bg-teal-600 text-white" : "bg-background hover:bg-accent"}`}
            >FDI</button>
            <button
              onClick={() => setNumbering("universal")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${numbering === "universal" ? "bg-teal-600 text-white" : "bg-background hover:bg-accent"}`}
            >Universal</button>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Chart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Patient selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Select Patient</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, phone…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <ScrollArea className="h-[420px] -mx-1 px-1">
              {pLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={Search} title="No patients" className="py-6" />
              ) : (
                <div className="space-y-1">
                  {filtered.slice(0, 40).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatientId(p.id); setSelectedTooth(null); }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${selectedPatientId === p.id ? "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900" : "border-transparent hover:bg-accent/50"}`}
                    >
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.patientCode} · {p.age || "—"}y · {p.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Odontogram chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tooth className="w-4 h-4 text-teal-500" /> Dental Chart
              </CardTitle>
              {activeOdo && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <History className="w-3 h-3" /> Updated {timeAgo(activeOdo.updatedAt)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {!selectedPatientId ? (
              <EmptyState
                icon={Tooth}
                title="Select a patient to view odontogram"
                description="Pick a patient from the left to chart their tooth conditions, view treatment history, and track dental health over time."
                className="py-12"
              />
            ) : oLoading ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : !activeOdo ? (
              <EmptyState
                icon={Tooth}
                title="No odontogram yet"
                description="Create the initial tooth chart for this patient."
                action={<Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => handleCreateOdontogram(selectedPatientId)}><Plus className="w-4 h-4" /> Create Odontogram</Button>}
                className="py-10"
              />
            ) : (
              <div className="space-y-4">
                {/* KPI strip */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Teeth</p>
                    <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Sound</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{stats.sound}</p>
                  </div>
                  <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3">
                    <p className="text-[10px] text-rose-700 dark:text-rose-300 uppercase tracking-wide">With Issues</p>
                    <p className="text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{stats.issues}</p>
                  </div>
                </div>

                {/* Upper jaw */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 text-center">Upper Jaw (Maxillary)</p>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {[...UPPER_RIGHT, ...UPPER_LEFT].map(num => (
                      <ToothSquare
                        key={num}
                        number={numbering === "fdi" ? num : FDI_TO_UNIVERSAL[num] || num}
                        tooth={activeOdo.teeth.find(t => t.toothNumber === num)}
                        onClick={() => setSelectedTooth(num)}
                        selected={selectedTooth === num}
                      />
                    ))}
                  </div>
                </div>

                {/* Lower jaw */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 text-center">Lower Jaw (Mandibular)</p>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {[...LOWER_RIGHT, ...LOWER_LEFT].map(num => (
                      <ToothSquare
                        key={num}
                        number={numbering === "fdi" ? num : FDI_TO_UNIVERSAL[num] || num}
                        tooth={activeOdo.teeth.find(t => t.toothNumber === num)}
                        onClick={() => setSelectedTooth(num)}
                        selected={selectedTooth === num}
                        lower
                      />
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {Object.entries(STATUS_META).filter(([k]) => k !== "sound").map(([k, m]) => (
                    <span key={k} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${m.bg} ${m.border} border ${m.text}`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tooth detail drawer */}
      <ToothDetailDrawer
        toothNumber={selectedTooth}
        numbering={numbering}
        odontogram={activeOdo}
        onClose={() => setSelectedTooth(null)}
        onUpdate={handleToothUpdate}
      />

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Odontogram</DialogTitle>
            <DialogDescription>Select a patient to start a fresh dental chart.</DialogDescription>
          </DialogHeader>
          <PatientPicker patients={patients || []} loading={pLoading} onPick={(pid) => handleCreateOdontogram(pid)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tooth square (single tooth visualization)
// ============================================================
function ToothSquare({
  number, tooth, onClick, selected, lower,
}: {
  number: string;
  tooth: Tooth | undefined;
  onClick: () => void;
  selected: boolean;
  lower?: boolean;
}) {
  const status: ToothStatus = tooth?.status || "sound";
  const meta = STATUS_META[status];
  const hasIssue = status !== "sound";

  return (
    <button
      onClick={onClick}
      title={`Tooth ${number} — ${meta.label}${tooth?.notes ? ": " + tooth.notes : ""}`}
      className={`relative w-9 h-12 sm:w-10 sm:h-14 rounded-md border-2 flex flex-col items-center justify-center transition-all duration-150 hover:scale-110 hover:shadow-md ${
        selected ? "ring-2 ring-teal-500 ring-offset-1 scale-110" : ""
      } ${hasIssue ? `${meta.bg} ${meta.border}` : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
    >
      {/* Tooth body — top (crown) / bottom (root) split */}
      <div className="flex-1 w-full flex items-center justify-center">
        {status === "missing" ? (
          <span className="text-slate-400 text-lg">✕</span>
        ) : status === "implant" ? (
          <span className="text-pink-600 text-xs">⟁</span>
        ) : status === "crown" ? (
          <span className="text-amber-600 text-[10px] font-bold">C</span>
        ) : status === "bridge" ? (
          <span className="text-violet-600 text-[10px] font-bold">B</span>
        ) : status === "root_canal" ? (
          <span className="text-cyan-600 text-[10px] font-bold">RCT</span>
        ) : status === "decayed" ? (
          <span className="text-rose-600 text-[10px] font-bold">C</span>
        ) : status === "extraction" ? (
          <span className="text-red-600 text-[10px] font-bold">X</span>
        ) : status === "fracture" ? (
          <span className="text-orange-600 text-[10px] font-bold">F</span>
        ) : status === "mobility" ? (
          <span className="text-purple-600 text-[10px] font-bold">M</span>
        ) : status === "sealant" ? (
          <span className="text-lime-600 text-[10px] font-bold">S</span>
        ) : status === "impacted" ? (
          <span className="text-gray-600 text-[10px] font-bold">I</span>
        ) : (
          <span className="text-slate-300 text-[8px]">○</span>
        )}
      </div>
      {/* Number label */}
      <span className={`text-[9px] font-bold tabular-nums ${lower ? "order-first" : ""} ${hasIssue ? meta.text : "text-slate-500 dark:text-slate-400"}`}>
        {number}
      </span>
    </button>
  );
}

// ============================================================
// Tooth detail drawer (history + status editor)
// ============================================================
function ToothDetailDrawer({
  toothNumber, numbering, odontogram, onClose, onUpdate,
}: {
  toothNumber: string | null;
  numbering: "fdi" | "universal";
  odontogram: Odontogram | null;
  onClose: () => void;
  onUpdate: (toothNumber: string, status: ToothStatus, note?: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<ToothStatus>("decayed");
  const [note, setNote] = useState("");

  const tooth = useMemo(() => {
    if (!toothNumber || !odontogram) return null;
    return odontogram.teeth.find(t => t.toothNumber === toothNumber) || null;
  }, [toothNumber, odontogram]);

  const history: ToothConditionEntry[] = useMemo(() => {
    if (!tooth?.conditions) return [];
    try { return JSON.parse(tooth.conditions); } catch { return []; }
  }, [tooth]);

  const displayNumber = numbering === "universal" && toothNumber ? (FDI_TO_UNIVERSAL[toothNumber] || toothNumber) : toothNumber;

  return (
    <Sheet open={!!toothNumber} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tooth className="w-5 h-5 text-teal-500" /> Tooth {displayNumber}
            {tooth && (
              <Badge variant="outline" className={`text-[10px] ${STATUS_META[tooth.status].bg} ${STATUS_META[tooth.status].border} border ${STATUS_META[tooth.status].text}`}>
                {STATUS_META[tooth.status].label}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {tooth ? `Last updated ${timeAgo(tooth.updatedAt)}` : "No data for this tooth yet."}
          </SheetDescription>
        </SheetHeader>

        {toothNumber && (
          <div className="space-y-4 mt-4">
            {/* Current status */}
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_META[tooth?.status || "sound"].color }} />
                  <span className="text-sm font-semibold">{STATUS_META[tooth?.status || "sound"].label}</span>
                </div>
                {tooth?.notes && <p className="text-xs text-muted-foreground mt-2">{tooth.notes}</p>}
              </CardContent>
            </Card>

            {/* Update status */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Mark Tooth Condition</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ToothStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Clinical note (optional)…"
                className="text-xs min-h-[60px]"
              />
              <Button
                size="sm"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                onClick={() => { onUpdate(toothNumber, newStatus, note); setNote(""); }}
              >
                <Save className="w-4 h-4" /> Update Tooth {displayNumber}
              </Button>
            </div>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-muted-foreground" /> Treatment History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {history.length === 0 ? (
                  <EmptyState icon={History} title="No history" description="Treatment events will appear here." className="py-4" />
                ) : (
                  <div className="space-y-2">
                    {history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-accent/40">
                        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: STATUS_META[h.type as ToothStatus]?.color || "#94a3b8" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{STATUS_META[h.type as ToothStatus]?.label || h.type}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(h.date)} · {h.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Patient picker (used in create dialog)
// ============================================================
function PatientPicker({ patients, loading, onPick }: { patients: Patient[]; loading: boolean; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.patientCode.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…" className="h-9" />
      <ScrollArea className="h-64 -mx-1 px-1">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No patients" className="py-6" />
        ) : (
          <div className="space-y-1">
            {filtered.slice(0, 30).map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                className="w-full text-left p-2.5 rounded-lg border border-border hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors"
              >
                <p className="text-xs font-semibold">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.patientCode} · {p.age || "—"}y</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
