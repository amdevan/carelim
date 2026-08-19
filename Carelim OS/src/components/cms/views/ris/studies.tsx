"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search, Plus, Download, Scan, Image as ImageIcon, FileText, Play, CheckCircle2, Send,
} from "lucide-react";
import { formatRs, formatDate, statusLabel } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";

interface Study {
  id: string; studyUid: string; bodyPart: string; status: string; priority: string;
  scheduledAt: string | null; performedAt: string | null; reportedAt: string | null; releasedAt: string | null;
  technicianName: string | null; radiologistName: string | null; contrastUsed: boolean;
  clinicalHistory: string | null; imageCount: number; createdAt: string;
  patient: { id: string; patientCode: string; name: string; age: number; gender: string };
  modality: { id: string; name: string; code: string; baseFee: number; contrastFee: number };
  images: { id: string; imageUrl: string; thumbnailUrl: string | null; instanceNumber: number; description: string | null }[];
  report: { id: string; examination: string | null; findings: string | null; impression: string | null; technique: string | null; status: string; radiologistName: string | null } | null;
}

interface PatientLite {
  id: string;
  patientCode: string;
  name: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  urgent: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  stat: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  "in-progress": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  completed: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  reported: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  released: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const MODALITIES = ["X-Ray", "CT", "MRI", "Ultrasound", "ECG", "Mammography", "Fluoroscopy", "Nuclear Medicine", "PET"];

export function RisStudies() {
  const [refresh, setRefresh] = useState(0);
  const { data: studies, loading } = useFetch<Study[]>(refresh ? `/api/radiology-studies?_r=${refresh}` : "/api/radiology-studies");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Study | null>(null);
  const [reportOpen, setReportOpen] = useState<Study | null>(null);
  const [reportForm, setReportForm] = useState({ findings: "", impression: "", technique: "" });
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!studies) return [];
    const q = search.toLowerCase();
    return studies.filter(s => {
      if (q && !s.patient.name.toLowerCase().includes(q) && !s.studyUid.toLowerCase().includes(q) && !s.bodyPart.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [studies, search, statusFilter]);

  const pagination = usePagination<Study>(filtered, 10);
  const doRefresh = () => setRefresh(r => r + 1);

  const pending = (studies || []).filter(s => s.status === "scheduled").length;
  const inProgress = (studies || []).filter(s => s.status === "in-progress").length;
  const revenue = (studies || []).reduce((sum, s) => sum + s.modality.baseFee + (s.contrastUsed ? s.modality.contrastFee : 0), 0);

  const handleAction = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/radiology-studies/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Study ${status}`); doRefresh(); }
  };

  const handleSaveReport = async () => {
    if (!reportOpen?.report) return;
    const res = await fetchAPI(`/api/radiology-studies/${reportOpen.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reported" }),
    });
    if (res.ok) { toast.success("Report saved"); setReportOpen(null); doRefresh(); }
  };

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("radiology-studies", ["Study UID", "Patient", "Modality", "Body Part", "Status", "Priority", "Scheduled", "Revenue"],
      filtered.map(s => [s.studyUid, s.patient.name, s.modality.name, s.bodyPart, s.status, s.priority, s.scheduledAt ? formatDate(s.scheduledAt) : "", s.modality.baseFee + (s.contrastUsed ? s.modality.contrastFee : 0)]));
    toast.success("Exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Radiology Studies</h3>
          <p className="text-sm text-muted-foreground">{studies?.length || 0} studies · RIS + PACS workflow</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> New Study</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Studies" value={studies?.length || 0} icon={Scan} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Play} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="In Progress" value={inProgress} icon={ImageIcon} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Revenue" value={formatRs(revenue)} icon={FileText} accent="from-emerald-500 to-emerald-600" index={3} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patient, study UID, body part…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reported">Reported</SelectItem>
                <SelectItem value="released">Released</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Study UID</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Modality</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Body Part</TableHead>
                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden lg:table-cell">Images</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paged.map((s) => (
                  <TableRow key={s.id} className="table-row-hover cursor-pointer" onClick={() => setSelected(s)}>
                    <TableCell className="font-mono text-[10px]">{s.studyUid.substring(0, 20)}…</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{s.patient.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.patient.patientCode} · {s.patient.age}y</p>
                    </TableCell>
                    <TableCell><Badge className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">{s.modality.name}</Badge></TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{s.bodyPart}</TableCell>
                    <TableCell><Badge className={`text-[9px] ${PRIORITY_COLORS[s.priority] || ""}`}>{s.priority}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[s.status] || ""}`}>{statusLabel(s.status)}</Badge></TableCell>
                    <TableCell className="text-sm tabular-nums hidden lg:table-cell">{s.imageCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {s.status === "scheduled" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction(s.id, "in-progress")}><Play className="w-3 h-3" /> Start</Button>}
                        {s.status === "in-progress" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction(s.id, "completed")}><CheckCircle2 className="w-3 h-3" /> Done</Button>}
                        {s.status === "completed" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setReportOpen(s); setReportForm({ findings: s.report?.findings || "", impression: s.report?.impression || "", technique: s.report?.technique || "" }); }}><FileText className="w-3 h-3" /> Report</Button>}
                        {s.status === "reported" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-emerald-50 text-emerald-700" onClick={() => handleAction(s.id, "released")}><Send className="w-3 h-3" /> Release</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination.total > 0 && <Pagination {...pagination} />}
          {pagination.total === 0 && <EmptyState icon={Scan} title="No studies found" description="Try adjusting filters" />}
        </CardContent>
      </Card>

      {/* Study Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <StudyDetail study={selected} />}
        </SheetContent>
      </Sheet>

      {/* Report Dialog */}
      <Sheet open={!!reportOpen} onOpenChange={o => !o && setReportOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin p-0">
          {reportOpen && (
            <div className="p-6 space-y-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Radiology Report</SheetTitle>
              </SheetHeader>
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3 text-sm">
                <p><strong>{reportOpen.modality.name} — {reportOpen.bodyPart}</strong></p>
                <p className="text-xs text-muted-foreground mt-1">Patient: {reportOpen.patient.name} ({reportOpen.patient.patientCode})</p>
                <p className="text-xs text-muted-foreground">Clinical History: {reportOpen.clinicalHistory || "N/A"}</p>
              </div>
              <div className="space-y-3">
                <div><Label className="text-xs">Technique</Label><Textarea value={reportForm.technique} onChange={e => setReportForm({ ...reportForm, technique: e.target.value })} className="mt-1 h-16" placeholder="Imaging technique used…" /></div>
                <div><Label className="text-xs">Findings</Label><Textarea value={reportForm.findings} onChange={e => setReportForm({ ...reportForm, findings: e.target.value })} className="mt-1 h-24" placeholder="Radiological findings…" /></div>
                <div><Label className="text-xs">Impression</Label><Textarea value={reportForm.impression} onChange={e => setReportForm({ ...reportForm, impression: e.target.value })} className="mt-1 h-16" placeholder="Clinical impression…" /></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReportOpen(null)}>Cancel</Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveReport}>Save & Mark Reported</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Study Dialog */}
      <NewStudyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); doRefresh(); }} />
    </div>
  );
}

/* ---------- Create Study Dialog ---------- */

interface NewStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function NewStudyDialog({ open, onOpenChange, onCreated }: NewStudyDialogProps) {
  const { data: patients, loading: patientsLoading } = useFetch<PatientLite[]>(
    open ? "/api/patients" : null,
  );

  const [patientId, setPatientId] = useState("");
  const [modality, setModality] = useState("X-Ray");
  const [bodyPart, setBodyPart] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState("normal");
  const [orderedBy, setOrderedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPatientId("");
      setModality("X-Ray");
      setBodyPart("");
      setClinicalIndication("");
      setPriority("normal");
      setOrderedBy("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }
    if (!bodyPart.trim()) {
      toast.error("Body part is required");
      return;
    }
    if (!orderedBy.trim()) {
      toast.error("Ordered By is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/radiology-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          modality,
          bodyPart: bodyPart.trim(),
          clinicalHistory: clinicalIndication.trim() || null,
          priority,
          orderedBy: orderedBy.trim(),
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
      }
      toast.success("Radiology study created");
      onCreated();
    } catch (e) {
      toast.error(`Failed to create study: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" /> New Radiology Study
          </DialogTitle>
          <DialogDescription>
            Create a new radiology study order.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="patient">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger id="patient" disabled={patientsLoading}>
                <SelectValue placeholder={patientsLoading ? "Loading patients…" : "Select patient"} />
              </SelectTrigger>
              <SelectContent>
                {(patients || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.patientCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="modality">Modality *</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger id="modality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bodyPart">Body Part *</Label>
            <Input
              id="bodyPart"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="e.g. Chest, Abdomen, Left Knee"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinicalIndication">Clinical Indication</Label>
            <Textarea
              id="clinicalIndication"
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              className="h-16"
              placeholder="Clinical reason for the study…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orderedBy">Ordered By *</Label>
            <Input
              id="orderedBy"
              value={orderedBy}
              onChange={(e) => setOrderedBy(e.target.value)}
              placeholder="e.g. Dr. Sharma"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16"
              placeholder="Additional notes…"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              disabled={saving}
            >
              {saving ? "Creating…" : (<><Plus className="w-4 h-4" /> Create Study</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudyDetail({ study }: { study: Study }) {
  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shrink-0">
            <Scan className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <SheetTitle className="text-lg">{study.modality.name} — {study.bodyPart}</SheetTitle>
            <p className="text-sm text-muted-foreground font-mono">{study.studyUid}</p>
          </div>
          <Badge className={`text-[10px] ${STATUS_COLORS[study.status] || ""}`}>{statusLabel(study.status)}</Badge>
        </div>
      </SheetHeader>
      <div className="p-6 space-y-4">
        {/* Patient info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Patient</p><p className="font-medium">{study.patient.name}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Patient ID</p><p className="font-medium font-mono">{study.patient.patientCode}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Age / Gender</p><p className="font-medium">{study.patient.age}y · {study.patient.gender}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Priority</p><p className="font-medium capitalize">{study.priority}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Technician</p><p className="font-medium">{study.technicianName || "—"}</p></div>
          <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Radiologist</p><p className="font-medium">{study.radiologistName || "—"}</p></div>
        </div>

        {/* DICOM Images */}
        {study.images.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-teal-600" /> PACS Images ({study.images.length})</h4>
            <div className="grid grid-cols-3 gap-2">
              {study.images.map(img => (
                <div key={img.id} className="rounded-lg border bg-muted/30 aspect-square flex flex-col items-center justify-center p-2 hover:border-teal-300 cursor-pointer transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-1" />
                  <p className="text-[10px] text-muted-foreground text-center truncate">{img.description || `Image ${img.instanceNumber}`}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {study.report && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-teal-600" /> Radiology Report</h4>
            <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
              {study.report.technique && <div><p className="text-[10px] text-muted-foreground uppercase">Technique</p><p>{study.report.technique}</p></div>}
              {study.report.findings && <div><p className="text-[10px] text-muted-foreground uppercase">Findings</p><p>{study.report.findings}</p></div>}
              {study.report.impression && <div><p className="text-[10px] text-muted-foreground uppercase">Impression</p><p className="font-medium">{study.report.impression}</p></div>}
              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>By: {study.report.radiologistName || "—"}</span>
                <span>Status: {study.report.status}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5" onClick={() => {
              const body = `${docHeader(study.studyUid.substring(0, 20), "RADIOLOGY REPORT", formatDate(study.createdAt))}
              <div class="info-grid"><div><div class="label">Patient</div><div>${study.patient.name}</div></div><div><div class="label">Modality</div><div>${study.modality.name}</div></div></div>
              <h2>Findings</h2><p>${study.report?.findings || "N/A"}</p>
              <h2>Impression</h2><p>${study.report?.impression || "N/A"}</p>`;
              printHTML("Radiology Report", body);
            }}><FileText className="w-4 h-4" /> Print Report</Button>
          </div>
        )}
      </div>
    </div>
  );
}
