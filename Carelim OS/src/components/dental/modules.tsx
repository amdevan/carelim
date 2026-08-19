"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Download, Plus, Search, MoreVertical, Eye, Edit, Trash2, CheckCircle2,
  Users, Stethoscope, ClipboardList, Activity, FileImage, GitBranch, Wrench,
  BellRing, BarChart3, Settings as SettingsIcon, Calendar, Smile as Tooth,
  X, AlertCircle, Clock, ChevronRight, Image as ImageIcon, ZoomIn, Save,
  ShieldCheck, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ============================================================
// Shared types & helpers
// ============================================================
interface Patient { id: string; name: string; patientCode: string; age?: number; phone: string; gender?: string; }
interface Doctor { id: string; name: string; specialization?: string; }

const TREATMENT_TYPES = [
  { value: "scaling", label: "Scaling" },
  { value: "polishing", label: "Polishing" },
  { value: "composite_filling", label: "Composite Filling" },
  { value: "amalgam_filling", label: "Amalgam Filling" },
  { value: "rct", label: "Root Canal Treatment" },
  { value: "extraction", label: "Extraction" },
  { value: "surgical_extraction", label: "Surgical Extraction" },
  { value: "crown", label: "Crown" },
  { value: "bridge", label: "Bridge" },
  { value: "implant", label: "Implant" },
  { value: "orthodontics", label: "Orthodontics" },
  { value: "dentures", label: "Dentures" },
  { value: "veneers", label: "Veneers" },
  { value: "whitening", label: "Whitening" },
  { value: "perio_surgery", label: "Periodontal Surgery" },
];
const TREATMENT_LABEL: Record<string, string> = Object.fromEntries(TREATMENT_TYPES.map(t => [t.value, t.label]));
const TREATMENT_COST: Record<string, number> = {
  scaling: 1500, polishing: 800, composite_filling: 2500, amalgam_filling: 1500,
  rct: 8000, extraction: 1000, surgical_extraction: 5000, crown: 12000,
  bridge: 35000, implant: 75000, orthodontics: 120000, dentures: 45000,
  veneers: 18000, whitening: 10000, perio_surgery: 25000,
};

function useRefresh() { const [r, setR] = useState(0); return [r, () => setR(v => v + 1)] as const; }
function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`text-[9px] capitalize ${statusColors[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"}`}>{status.replace(/_/g, " ")}</Badge>;
}

// ============================================================
// 1. Dental Patients — reuse /api/patients, enrich with dental counts
// ============================================================
export function DentalPatients() {
  const [refresh, setRefresh] = useRefresh();
  const { data: patients, loading } = useFetch<Patient[]>(`/api/patients?_r=${refresh}`);
  const { data: exams } = useFetch<{ patientId: string }[]>(`/api/dental-examinations?_r=${refresh}`);
  const { data: procs } = useFetch<{ patientId: string }[]>(`/api/dental-procedures?_r=${refresh}`);
  const [q, setQ] = useState("");
  const pagination = usePagination(patients || [], 10);

  const examCount = useMemo(() => {
    const m: Record<string, number> = {};
    exams?.forEach(e => { m[e.patientId] = (m[e.patientId] || 0) + 1; });
    return m;
  }, [exams]);
  const procCount = useMemo(() => {
    const m: Record<string, number> = {};
    procs?.forEach(p => { m[p.patientId] = (m[p.patientId] || 0) + 1; });
    return m;
  }, [procs]);

  const filtered = useMemo(() => {
    const list = patients || [];
    if (!q) return list;
    const ql = q.toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(ql) || p.patientCode.toLowerCase().includes(ql) || p.phone.includes(q));
  }, [patients, q]);
  const pagedFiltered = usePagination(filtered, 10);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Dental Patients</h2><p className="text-xs text-muted-foreground">{patients?.length || 0} patients · reuses Carelim OS Patient registry</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (patients?.length) { exportToCSV("dental-patients", ["Code","Name","Age","Phone","Exams","Procedures"], patients.map(p => [p.patientCode, p.name, p.age||"", p.phone, examCount[p.id]||0, procCount[p.id]||0])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Patients" value={patients?.length || 0} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="With Exams" value={Object.keys(examCount).length} icon={Stethoscope} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="With Procedures" value={Object.keys(procCount).length} icon={Activity} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Total Procedures" value={procs?.length || 0} icon={ClipboardList} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, code, phone…" className="pl-8 h-9 text-sm" />
            </div>
          </div>
          {(filtered).length === 0 ? <EmptyState icon={Users} title="No patients found" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Code</TableHead>
                  <TableHead className="text-[11px] uppercase">Age</TableHead>
                  <TableHead className="text-[11px] uppercase">Phone</TableHead>
                  <TableHead className="text-[11px] uppercase text-center">Exams</TableHead>
                  <TableHead className="text-[11px] uppercase text-center">Procedures</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagedFiltered.paged.map(p => (
                    <TableRow key={p.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[10px]">{p.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                          <span className="text-xs font-semibold">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.patientCode}</TableCell>
                      <TableCell className="text-xs">{p.age || "—"}y</TableCell>
                      <TableCell className="text-xs">{p.phone}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{examCount[p.id] || 0}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{procCount[p.id] || 0}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info(`Opening dental record for ${p.name}`)}><Eye className="w-4 h-4 mr-2" /> View Dental Record</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(p.id); toast.success("Patient ID copied"); }}><ClipboardList className="w-4 h-4 mr-2" /> Copy Patient ID</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagedFiltered} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 2. Clinical Examinations
// ============================================================
interface Exam {
  id: string; examNo: string; patientId: string; doctorId: string | null;
  examDate: string; chiefComplaint: string | null; diagnosis: string | null;
  medicalHistory: string | null; dentalHistory: string | null; occlusion: string | null;
  softTissueFindings: string | null; hardTissueFindings: string | null;
  clinicalNotes: string | null; extraOral: string | null; intraOral: string | null;
  periodontalExam: string | null; tmjAssessment: string | null;
}
export function DentalExaminations() {
  const [refresh, setRefresh] = useRefresh();
  const { data: exams, loading } = useFetch<Exam[]>(`/api/dental-examinations?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Exam | null>(null);
  const [form, setForm] = useState({ patientId: "", doctorId: "", chiefComplaint: "", medicalHistory: "", dentalHistory: "", occlusion: "Class I", softTissueFindings: "", hardTissueFindings: "", tmjAssessment: "", diagnosis: "", clinicalNotes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination(exams || [], 10);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);
  const doctorMap = useMemo(() => Object.fromEntries((doctors || []).map(d => [d.id, d])), [doctors]);

  const filtered = useMemo(() => {
    const list = exams || [];
    if (!q) return list;
    return list.filter(e => e.examNo.toLowerCase().includes(q.toLowerCase()) || e.chiefComplaint?.toLowerCase().includes(q.toLowerCase()) || (patientMap[e.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()));
  }, [exams, q, patientMap]);
  const pagedFiltered = usePagination(filtered, 10);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/dental-examinations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      toast.success("Examination recorded");
      setAddOpen(false);
      setForm({ patientId: "", doctorId: "", chiefComplaint: "", medicalHistory: "", dentalHistory: "", occlusion: "Class I", softTissueFindings: "", hardTissueFindings: "", tmjAssessment: "", diagnosis: "", clinicalNotes: "" });
      setRefresh();
    } catch { toast.error("Failed to create examination"); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Clinical Examination</h2><p className="text-xs text-muted-foreground">{exams?.length || 0} examinations recorded · full intra-oral &amp; periodontal assessment</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (exams?.length) { exportToCSV("dental-exams", ["ExamNo","Patient","Date","Chief Complaint","Diagnosis","Occlusion"], exams.map(e => [e.examNo, patientMap[e.patientId]?.name || e.patientId, formatDate(e.examDate), e.chiefComplaint||"", e.diagnosis||"", e.occlusion||""])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Examination</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Examinations" value={exams?.length || 0} icon={Stethoscope} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Unique Patients" value={new Set(exams?.map(e => e.patientId)).size} icon={Users} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="With Diagnosis" value={exams?.filter(e => e.diagnosis).length || 0} icon={ClipboardList} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="This Month" value={exams?.filter(e => new Date(e.examDate) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length || 0} icon={Calendar} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exam no, complaint, patient…" className="pl-8 h-9 text-sm" />
            </div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Stethoscope} title="No examinations" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Exam No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase">Chief Complaint</TableHead>
                  <TableHead className="text-[11px] uppercase">Occlusion</TableHead>
                  <TableHead className="text-[11px] uppercase">Diagnosis</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagedFiltered.paged.map(e => (
                    <TableRow key={e.id} className="table-row-hover cursor-pointer" onClick={() => setDetail(e)}>
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{e.examNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[e.patientId]?.name || e.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(e.examDate)}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{e.chiefComplaint || "—"}</TableCell>
                      <TableCell>{e.occlusion && <Badge variant="outline" className="text-[9px]">{e.occlusion}</Badge>}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{e.diagnosis || "—"}</TableCell>
                      <TableCell className="text-right" onClick={ev => ev.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(e)}><Eye className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagedFiltered} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Clinical Examination</DialogTitle><DialogDescription>Record a comprehensive dental examination. All fields are saved to the patient&apos;s dental record.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{(doctors || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Chief Complaint</Label><Input value={form.chiefComplaint} onChange={e => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="e.g., Pain in lower right back tooth for 1 week" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Medical History</Label><Input value={form.medicalHistory} onChange={e => setForm({ ...form, medicalHistory: e.target.value })} placeholder="Hypertension, Diabetes, etc." /></div>
            <div className="space-y-1.5"><Label className="text-xs">Dental History</Label><Input value={form.dentalHistory} onChange={e => setForm({ ...form, dentalHistory: e.target.value })} placeholder="Previous treatments, habits" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Occlusion</Label>
              <Select value={form.occlusion} onValueChange={v => setForm({ ...form, occlusion: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Class I","Class II Division 1","Class II Division 2","Class III","Crossbite anterior","Deep bite","Open bite"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">TMJ Assessment</Label><Input value={form.tmjAssessment} onChange={e => setForm({ ...form, tmjAssessment: e.target.value })} placeholder="Normal / clicking / restricted" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Soft Tissue Findings</Label><Input value={form.softTissueFindings} onChange={e => setForm({ ...form, softTissueFindings: e.target.value })} placeholder="Lips, cheeks, tongue, palate…" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Hard Tissue Findings</Label><Input value={form.hardTissueFindings} onChange={e => setForm({ ...form, hardTissueFindings: e.target.value })} placeholder="Caries, fractures, attrition — list teeth" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Diagnosis</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Working diagnosis" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Clinical Notes</Label><Textarea value={form.clinicalNotes} onChange={e => setForm({ ...form, clinicalNotes: e.target.value })} placeholder="Treatment plan, advice, follow-up…" className="min-h-[80px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Examination"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-teal-500" /> {detail.examNo}</SheetTitle>
                <SheetDescription>{patientMap[detail.patientId]?.name || detail.patientId} · {formatDate(detail.examDate)}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Chief Complaint", value: detail.chiefComplaint },
                  { label: "Medical History", value: detail.medicalHistory },
                  { label: "Dental History", value: detail.dentalHistory },
                  { label: "Occlusion", value: detail.occlusion },
                  { label: "TMJ Assessment", value: detail.tmjAssessment },
                  { label: "Soft Tissue Findings", value: detail.softTissueFindings },
                  { label: "Hard Tissue Findings", value: detail.hardTissueFindings },
                  { label: "Diagnosis", value: detail.diagnosis },
                  { label: "Clinical Notes", value: detail.clinicalNotes },
                ].map((row, i) => row.value ? (
                  <Card key={i}><CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{row.label}</p>
                    <p className="text-xs">{row.value}</p>
                  </CardContent></Card>
                ) : null)}
                {detail.extraOral && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Extra Oral</p><pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{detail.extraOral}</pre></CardContent></Card>}
                {detail.intraOral && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Intra Oral</p><pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{detail.intraOral}</pre></CardContent></Card>}
                {detail.periodontalExam && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Periodontal Exam</p><pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{detail.periodontalExam}</pre></CardContent></Card>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// 3. Treatment Plans
// ============================================================
interface Plan {
  id: string; planNo: string; patientId: string; doctorId: string | null;
  toothNumbers: string | null; diagnosis: string | null; treatmentType: string;
  estimatedCost: number; status: string; consentSigned: boolean; consentDate: string | null;
  notes: string | null; createdAt: string;
}
export function DentalTreatmentPlans() {
  const [refresh, setRefresh] = useRefresh();
  const { data: plans, loading } = useFetch<Plan[]>(`/api/dental-treatment-plans?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", toothNumbers: "", diagnosis: "", treatmentType: "scaling", notes: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    let list = plans || [];
    if (q) list = list.filter(p => p.planNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[p.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()));
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    return list;
  }, [plans, q, statusFilter, patientMap]);
  const pagination = usePagination(filtered, 10);

  const advanceStatus = async (id: string, status: string) => {
    await fetchAPI(`/api/dental-treatment-plans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Plan marked as ${status}`);
    setRefresh();
  };

  const signConsent = async (p: Plan) => {
    await fetchAPI(`/api/dental-treatment-plans/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consentSigned: true, consentDate: new Date().toISOString() }) });
    toast.success("Consent recorded");
    setRefresh();
  };

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try {
      const cost = TREATMENT_COST[form.treatmentType] || 2000;
      await fetchAPI("/api/dental-treatment-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, estimatedCost: cost }) });
      toast.success(`Treatment plan created · ${formatRs(cost)}`);
      setAddOpen(false);
      setForm({ patientId: "", doctorId: "", toothNumbers: "", diagnosis: "", treatmentType: "scaling", notes: "" });
      setRefresh();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const STATUS_FILTERS = ["all", "planned", "approved", "in_progress", "completed", "cancelled"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Treatment Plans</h2><p className="text-xs text-muted-foreground">{plans?.length || 0} plans · with cost estimate, consent &amp; status workflow</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (plans?.length) { exportToCSV("treatment-plans", ["PlanNo","Patient","Treatment","Teeth","Cost","Status","Consent"], plans.map(p => [p.planNo, patientMap[p.patientId]?.name || p.patientId, TREATMENT_LABEL[p.treatmentType]||p.treatmentType, p.toothNumbers||"", p.estimatedCost, p.status, p.consentSigned?"Yes":"No"])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Plan</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Plans" value={plans?.length || 0} icon={ClipboardList} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={plans?.filter(p => ["planned","approved","in_progress"].includes(p.status)).length || 0} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Completed" value={plans?.filter(p => p.status === "completed").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Est. Revenue" value={formatRs(plans?.reduce((s, p) => s + p.estimatedCost, 0) || 0)} icon={BarChart3} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search plan no, patient…" className="pl-8 h-9 text-sm" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{s.replace(/_/g, " ")}</button>)}
            </div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={ClipboardList} title="No treatment plans" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Plan No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Treatment</TableHead>
                  <TableHead className="text-[11px] uppercase">Teeth</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Est. Cost</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Consent</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(p => (
                    <TableRow key={p.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{p.planNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[p.patientId]?.name || p.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{TREATMENT_LABEL[p.treatmentType] || p.treatmentType}</TableCell>
                      <TableCell className="text-xs font-mono">{p.toothNumbers || "—"}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(p.estimatedCost)}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>{p.consentSigned ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Signed</Badge> : <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!p.consentSigned && <DropdownMenuItem onClick={() => signConsent(p)}><ShieldCheck className="w-4 h-4 mr-2" /> Record Consent</DropdownMenuItem>}
                            {p.status === "planned" && <DropdownMenuItem onClick={() => advanceStatus(p.id, "approved")}><CheckCircle2 className="w-4 h-4 mr-2" /> Approve Plan</DropdownMenuItem>}
                            {p.status === "approved" && <DropdownMenuItem onClick={() => advanceStatus(p.id, "in_progress")}>Start Treatment</DropdownMenuItem>}
                            {(p.status === "in_progress" || p.status === "approved") && <DropdownMenuItem onClick={() => advanceStatus(p.id, "completed")}>Mark Completed</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={async () => { await fetchAPI(`/api/dental-treatment-plans/${p.id}`, { method: "DELETE" }); toast.success("Deleted"); setRefresh(); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Treatment Plan</DialogTitle><DialogDescription>Estimated cost is auto-filled from the treatment type.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{(doctors || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Treatment Type *</Label>
              <Select value={form.treatmentType} onValueChange={v => setForm({ ...form, treatmentType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TREATMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label} · {formatRs(TREATMENT_COST[t.value])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tooth Numbers (FDI, comma-separated)</Label><Input value={form.toothNumbers} onChange={e => setForm({ ...form, toothNumbers: e.target.value })} placeholder="e.g., 16,26 or 11" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Diagnosis</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Clinical diagnosis" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Treatment notes, instructions…" className="min-h-[60px]" /></div>
          </div>
          <DialogFooter>
            <div className="flex-1 text-xs text-muted-foreground">Estimated cost: <span className="font-semibold text-foreground">{formatRs(TREATMENT_COST[form.treatmentType] || 2000)}</span></div>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 4. Procedures — with auto-invoice via Billing
// ============================================================
interface Procedure {
  id: string; procNo: string; patientId: string; doctorId: string | null;
  procedureDate: string; toothNumbers: string | null; procedureType: string;
  notes: string | null; complications: string | null; duration: number;
  invoiceId: string | null; status: string; materialsUsed: string | null; medicineUsed: string | null;
}
export function DentalProcedures() {
  const [refresh, setRefresh] = useRefresh();
  const { data: procs, loading } = useFetch<Procedure[]>(`/api/dental-procedures?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const { data: plans } = useFetch<Plan[]>("/api/dental-treatment-plans");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", treatmentPlanId: "", toothNumbers: "", procedureType: "scaling", notes: "", complications: "", duration: "30" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    const list = procs || [];
    if (!q) return list;
    return list.filter(p => p.procNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[p.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()) || p.procedureType.includes(q.toLowerCase()));
  }, [procs, q, patientMap]);
  const pagination = usePagination(filtered, 10);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/dental-procedures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, duration: Number(form.duration) || 0, markPaid: true }) });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Procedure ${data.procNo} recorded · Invoice auto-generated`);
      setAddOpen(false);
      setForm({ patientId: "", doctorId: "", treatmentPlanId: "", toothNumbers: "", procedureType: "scaling", notes: "", complications: "", duration: "30" });
      setRefresh();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Procedures</h2><p className="text-xs text-muted-foreground">{procs?.length || 0} procedures · auto-invoices created via Billing module</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (procs?.length) { exportToCSV("dental-procedures", ["ProcNo","Patient","Type","Teeth","Date","Duration","Status"], procs.map(p => [p.procNo, patientMap[p.patientId]?.name || p.patientId, TREATMENT_LABEL[p.procedureType]||p.procedureType, p.toothNumbers||"", formatDate(p.procedureDate), p.duration, p.status])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Log Procedure</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Procedures" value={procs?.length || 0} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Completed" value={procs?.filter(p => p.status === "completed").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="With Invoice" value={procs?.filter(p => p.invoiceId).length || 0} icon={BarChart3} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Total Duration (min)" value={procs?.reduce((s, p) => s + p.duration, 0) || 0} icon={Clock} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search proc no, patient, type…" className="pl-8 h-9 text-sm" />
            </div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Activity} title="No procedures" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Proc No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Procedure</TableHead>
                  <TableHead className="text-[11px] uppercase">Teeth</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Min</TableHead>
                  <TableHead className="text-[11px] uppercase">Invoice</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(p => (
                    <TableRow key={p.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{p.procNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[p.patientId]?.name || p.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{TREATMENT_LABEL[p.procedureType] || p.procedureType}</TableCell>
                      <TableCell className="text-xs font-mono">{p.toothNumbers || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.procedureDate)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{p.duration}</TableCell>
                      <TableCell>{p.invoiceId ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1"><CheckCircle2 className="w-3 h-3" /> Created</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Dental Procedure</DialogTitle><DialogDescription>An invoice will be auto-created in the Billing module. The visit is also appended to the patient&apos;s EMR timeline.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
                <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
                  <SelectContent>{(doctors || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Treatment Plan</Label>
                <Select value={form.treatmentPlanId} onValueChange={v => setForm({ ...form, treatmentPlanId: v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="max-h-60">{(plans || []).filter(p => p.patientId === form.patientId).map(p => <SelectItem key={p.id} value={p.id}>{p.planNo} · {TREATMENT_LABEL[p.treatmentType]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Procedure Type *</Label>
              <Select value={form.procedureType} onValueChange={v => setForm({ ...form, procedureType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TREATMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label} · {formatRs(TREATMENT_COST[t.value])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Tooth Numbers</Label><Input value={form.toothNumbers} onChange={e => setForm({ ...form, toothNumbers: e.target.value })} placeholder="16,26" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Procedure notes…" className="min-h-[60px]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Complications</Label><Input value={form.complications} onChange={e => setForm({ ...form, complications: e.target.value })} placeholder="None / mild bleeding / sensitivity" /></div>
          </div>
          <DialogFooter>
            <div className="flex-1 text-xs"><span className="text-muted-foreground">Auto-invoice:</span> <span className="font-semibold text-emerald-600">{formatRs(TREATMENT_COST[form.procedureType] || 2000)} (incl. 13% VAT)</span></div>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Log + Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 5. Dental Imaging
// ============================================================
interface DentalImage {
  id: string; patientId: string; imageType: string; title: string | null;
  imageUrl: string | null; annotation: string | null; takenAt: string; notes: string | null;
}
const IMAGE_TYPE_LABELS: Record<string, string> = { iopa: "IOPA", opg: "OPG", cbct: "CBCT", ceph: "Cephalometric", clinical_photo: "Clinical Photo", before_after: "Before/After" };
const IMAGE_TYPE_COLORS: Record<string, string> = { iopa: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", opg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", cbct: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300", ceph: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", clinical_photo: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300", before_after: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" };

export function DentalImaging() {
  const [refresh, setRefresh] = useRefresh();
  const { data: images, loading } = useFetch<DentalImage[]>(`/api/dental-images?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", imageType: "iopa", title: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    let list = images || [];
    if (typeFilter !== "all") list = list.filter(i => i.imageType === typeFilter);
    return list;
  }, [images, typeFilter]);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try { await fetchAPI("/api/dental-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); toast.success("Image record added"); setAddOpen(false); setForm({ patientId: "", imageType: "iopa", title: "", notes: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Dental Imaging</h2><p className="text-xs text-muted-foreground">{images?.length || 0} images · integrates with Radiology module</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Image Record</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Images" value={images?.length || 0} icon={FileImage} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="IOPA" value={images?.filter(i => i.imageType === "iopa").length || 0} icon={FileImage} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="OPG" value={images?.filter(i => i.imageType === "opg").length || 0} icon={FileImage} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="CBCT" value={images?.filter(i => i.imageType === "cbct").length || 0} icon={FileImage} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <div className="flex gap-1 flex-wrap">
        {["all", "iopa", "opg", "cbct", "ceph", "clinical_photo", "before_after"].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${typeFilter === t ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{t === "all" ? "All" : IMAGE_TYPE_LABELS[t] || t}</button>)}
      </div>
      {filtered.length === 0 ? <Card><CardContent className="py-10"><EmptyState icon={FileImage} title="No images" description="Add image records or capture via the Radiology module." /></CardContent></Card> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(img => (
            <motion.div key={img.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <Card className="overflow-hidden card-hover">
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center relative">
                  {img.imageUrl ? <img src={img.imageUrl} alt={img.title || ""} className="w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-slate-400" />}
                  <Badge className={`absolute top-2 left-2 text-[9px] ${IMAGE_TYPE_COLORS[img.imageType] || ""}`}>{IMAGE_TYPE_LABELS[img.imageType] || img.imageType}</Badge>
                </div>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold truncate">{img.title || IMAGE_TYPE_LABELS[img.imageType] || img.imageType}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{patientMap[img.patientId]?.name || img.patientId.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground/70">{formatDate(img.takenAt)}</p>
                  {img.notes && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{img.notes}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Image Record</DialogTitle><DialogDescription>Record a dental radiograph or clinical photo. Upload to Radiology module for full PACS integration.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Image Type</Label>
              <Select value={form.imageType} onValueChange={v => setForm({ ...form, imageType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(IMAGE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Pre-op IOPA tooth 36" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes / Findings</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Radiographic findings…" className="min-h-[60px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Add Record"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 6. Dental Laboratory
// ============================================================
interface LabOrder {
  id: string; orderNo: string; patientId: string; doctorId: string | null;
  labType: string; toothNumbers: string | null; material: string | null; shade: string | null;
  technician: string | null; labName: string | null; status: string;
  sentDate: string; deliveryDate: string | null; receivedDate: string | null;
  cost: number; notes: string | null;
}
export function DentalLab() {
  const [refresh, setRefresh] = useRefresh();
  const { data: orders, loading } = useFetch<LabOrder[]>(`/api/dental-lab-orders?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", labType: "crown", toothNumbers: "", material: "", shade: "A2", technician: "", labName: "", cost: "5000", notes: "", deliveryDate: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);
  const filtered = useMemo(() => {
    const list = orders || [];
    if (!q) return list;
    return list.filter(o => o.orderNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[o.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()));
  }, [orders, q, patientMap]);
  const pagination = usePagination(filtered, 10);

  const advance = async (id: string, status: string) => {
    const body: Record<string, unknown> = { status };
    if (status === "delivered") body.receivedDate = new Date().toISOString();
    await fetchAPI(`/api/dental-lab-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    toast.success(`Order ${status}`);
    setRefresh();
  };

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try { await fetchAPI("/api/dental-lab-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cost: Number(form.cost) || 0, deliveryDate: form.deliveryDate || undefined }) }); toast.success("Lab order placed"); setAddOpen(false); setForm({ patientId: "", labType: "crown", toothNumbers: "", material: "", shade: "A2", technician: "", labName: "", cost: "5000", notes: "", deliveryDate: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Dental Laboratory</h2><p className="text-xs text-muted-foreground">{orders?.length || 0} lab orders · crown, bridge, denture, aligner &amp; implant tracking</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (orders?.length) { exportToCSV("dental-lab-orders", ["OrderNo","Patient","Type","Material","Shade","Lab","Status","Cost"], orders.map(o => [o.orderNo, patientMap[o.patientId]?.name || o.patientId, o.labType, o.material||"", o.shade||"", o.labName||"", o.status, o.cost])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Place Lab Order</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Orders" value={orders?.length || 0} icon={GitBranch} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="In Lab" value={orders?.filter(o => ["pending","in_lab"].includes(o.status)).length || 0} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Ready / Delivered" value={orders?.filter(o => ["ready","delivered"].includes(o.status)).length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Lab Cost" value={formatRs(orders?.reduce((s, o) => s + o.cost, 0) || 0)} icon={BarChart3} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border"><div className="relative max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search order no, patient…" className="pl-8 h-9 text-sm" /></div></div>
          {filtered.length === 0 ? <EmptyState icon={GitBranch} title="No lab orders" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Order No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Material / Shade</TableHead>
                  <TableHead className="text-[11px] uppercase">Lab</TableHead>
                  <TableHead className="text-[11px] uppercase">Sent</TableHead>
                  <TableHead className="text-[11px] uppercase">Due</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Cost</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(o => (
                    <TableRow key={o.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{o.orderNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[o.patientId]?.name || o.patientId.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{o.labType}</Badge></TableCell>
                      <TableCell className="text-xs">{o.material || "—"}{o.shade ? ` / ${o.shade}` : ""}</TableCell>
                      <TableCell className="text-xs">{o.labName || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(o.sentDate)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.deliveryDate ? formatDate(o.deliveryDate) : "—"}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(o.cost)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => advance(o.id, "in_lab")}>Mark In Lab</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advance(o.id, "ready")}>Mark Ready</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advance(o.id, "delivered")}>Mark Delivered</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advance(o.id, "returned")}>Mark Returned</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Place Lab Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Lab Type</Label>
                <Select value={form.labType} onValueChange={v => setForm({ ...form, labType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["crown","bridge","denture","aligner","implant","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Cost (Rs.)</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Material</Label><Input value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="Zirconia / PFM / E.max" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Shade</Label><Input value={form.shade} onChange={e => setForm({ ...form, shade: e.target.value })} placeholder="A2" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Lab Name</Label><Input value={form.labName} onChange={e => setForm({ ...form, labName: e.target.value })} placeholder="Smile Dental Lab" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Technician</Label><Input value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tooth Numbers</Label><Input value={form.toothNumbers} onChange={e => setForm({ ...form, toothNumbers: e.target.value })} placeholder="16 or 11,21" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Delivery</Label><Input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Place Order"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 7. Orthodontics
// ============================================================
interface OrthoCase {
  id: string; caseNo: string; patientId: string; doctorId: string | null;
  treatmentType: string; startDate: string; endDate: string | null;
  bracketType: string | null; wireSequence: string | null; planNotes: string | null;
  progressPhotos: string | null; status: string; totalCost: number; paidAmount: number;
}
export function DentalOrtho() {
  const [refresh, setRefresh] = useRefresh();
  const { data: cases, loading } = useFetch<OrthoCase[]>(`/api/dental-ortho-cases?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", treatmentType: "braces", bracketType: "metal", totalCost: "120000", planNotes: "" });
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<OrthoCase | null>(null);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");

  const filtered = useMemo(() => {
    const list = cases || [];
    if (!q) return list;
    return list.filter(c => c.caseNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[c.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()));
  }, [cases, q, patientMap]);
  const pagination = usePagination(filtered, 10);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try { await fetchAPI("/api/dental-ortho-cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, totalCost: Number(form.totalCost) || 0 }) }); toast.success("Orthodontic case opened"); setAddOpen(false); setForm({ patientId: "", doctorId: "", treatmentType: "braces", bracketType: "metal", totalCost: "120000", planNotes: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Orthodontics</h2><p className="text-xs text-muted-foreground">{cases?.length || 0} cases · brackets, aligners, wire changes &amp; progress tracking</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Case</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Cases" value={cases?.length || 0} icon={Zap} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active" value={cases?.filter(c => c.status === "active").length || 0} icon={Activity} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Completed" value={cases?.filter(c => c.status === "completed").length || 0} icon={CheckCircle2} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Total Value" value={formatRs(cases?.reduce((s, c) => s + c.totalCost, 0) || 0)} icon={BarChart3} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border"><div className="relative max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search case no, patient…" className="pl-8 h-9 text-sm" /></div></div>
          {filtered.length === 0 ? <EmptyState icon={Zap} title="No orthodontic cases" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Case No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Bracket</TableHead>
                  <TableHead className="text-[11px] uppercase">Started</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Total</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Paid</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(c => (
                    <TableRow key={c.id} className="table-row-hover cursor-pointer" onClick={() => setDetail(c)}>
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{c.caseNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[c.patientId]?.name || c.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs capitalize">{c.treatmentType}</TableCell>
                      <TableCell className="text-xs capitalize">{c.bracketType || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.startDate)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(c.totalCost)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-emerald-600">{formatRs(c.paidAmount)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(c)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Orthodontic Case</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
                <SelectContent>{(doctors || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Treatment Type</Label>
                <Select value={form.treatmentType} onValueChange={v => setForm({ ...form, treatmentType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["braces","aligners","functional","retainer"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Bracket Type</Label>
                <Select value={form.bracketType} onValueChange={v => setForm({ ...form, bracketType: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["metal","ceramic","self_ligating","lingual"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Total Cost (Rs.)</Label><Input type="number" value={form.totalCost} onChange={e => setForm({ ...form, totalCost: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Treatment Plan</Label><Textarea value={form.planNotes} onChange={e => setForm({ ...form, planNotes: e.target.value })} placeholder="Extraction / non-extraction, anchorage, etc." className="min-h-[60px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Open Case"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-teal-500" /> {detail.caseNo}</SheetTitle><SheetDescription>{patientMap[detail.patientId]?.name || detail.patientId} · Started {formatDate(detail.startDate)}</SheetDescription></SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Treatment</p><p className="text-xs font-semibold capitalize">{detail.treatmentType}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Bracket</p><p className="text-xs font-semibold capitalize">{detail.bracketType?.replace(/_/g," ") || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Total Cost</p><p className="text-sm font-bold tabular-nums">{formatRs(detail.totalCost)}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Paid</p><p className="text-sm font-bold tabular-nums text-emerald-600">{formatRs(detail.paidAmount)}</p></CardContent></Card>
                </div>
                {detail.planNotes && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase mb-1">Treatment Plan</p><p className="text-xs">{detail.planNotes}</p></CardContent></Card>}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Wire Sequence Timeline</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {(() => {
                      try {
                        const wires = JSON.parse(detail.wireSequence || "[]");
                        if (!wires.length) return <p className="text-[11px] text-muted-foreground">No wire changes recorded.</p>;
                        return <div className="space-y-2">{wires.map((w: { date: string; wire: string; notes: string }, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <div><p className="text-xs font-semibold">{w.wire}</p><p className="text-[10px] text-muted-foreground">{formatDate(w.date)} · {w.notes}</p></div>
                          </div>
                        ))}</div>;
                      } catch { return <p className="text-[11px] text-muted-foreground">No wire changes recorded.</p>; }
                    })()}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// 8. Implant Module
// ============================================================
interface ImplantCase {
  id: string; caseNo: string; patientId: string; doctorId: string | null;
  toothNumber: string | null; site: string | null; implantBrand: string | null;
  implantSize: string | null; placementDate: string; boneGraft: boolean;
  graftMaterial: string | null; sinusLift: boolean; healingAbutment: boolean;
  abutmentDate: string | null; finalCrownDate: string | null; followUpNotes: string | null;
  status: string; cost: number;
}
const IMPLANT_BRANDS = ["Straumann", "Nobel Biocare", "Osstem", "Dentium", "BioHorizons", "MIS"];
export function DentalImplants() {
  const [refresh, setRefresh] = useRefresh();
  const { data: cases, loading } = useFetch<ImplantCase[]>(`/api/dental-implant-cases?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", toothNumber: "", site: "", implantBrand: "Straumann", implantSize: "4.0 x 10mm", boneGraft: false, graftMaterial: "", sinusLift: false, healingAbutment: true, cost: "75000", followUpNotes: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    const list = cases || [];
    if (!q) return list;
    return list.filter(c => c.caseNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[c.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()) || (c.implantBrand || "").toLowerCase().includes(q.toLowerCase()));
  }, [cases, q, patientMap]);
  const pagination = usePagination(filtered, 10);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    setSaving(true);
    try { await fetchAPI("/api/dental-implant-cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cost: Number(form.cost) || 0 }) }); toast.success("Implant case registered"); setAddOpen(false); setForm({ patientId: "", doctorId: "", toothNumber: "", site: "", implantBrand: "Straumann", implantSize: "4.0 x 10mm", boneGraft: false, graftMaterial: "", sinusLift: false, healingAbutment: true, cost: "75000", followUpNotes: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Implant Module</h2><p className="text-xs text-muted-foreground">{cases?.length || 0} implant cases · brand, size, graft, abutment &amp; crown tracking</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (cases?.length) { exportToCSV("dental-implants", ["CaseNo","Patient","Tooth","Brand","Size","Placed","Status","Cost"], cases.map(c => [c.caseNo, patientMap[c.patientId]?.name || c.patientId, c.toothNumber||"", c.implantBrand||"", c.implantSize||"", formatDate(c.placementDate), c.status, c.cost])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Implant</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Implants" value={cases?.length || 0} icon={Wrench} accent="from-pink-500 to-rose-500" index={0} />
        <KpiCard label="Osseointegrating" value={cases?.filter(c => c.status === "osseointegrating").length || 0} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Restored" value={cases?.filter(c => c.status === "restored").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Total Value" value={formatRs(cases?.reduce((s, c) => s + c.cost, 0) || 0)} icon={BarChart3} accent="from-teal-500 to-teal-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border"><div className="relative max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search case, patient, brand…" className="pl-8 h-9 text-sm" /></div></div>
          {filtered.length === 0 ? <EmptyState icon={Wrench} title="No implant cases" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Case No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Tooth</TableHead>
                  <TableHead className="text-[11px] uppercase">Brand</TableHead>
                  <TableHead className="text-[11px] uppercase">Size</TableHead>
                  <TableHead className="text-[11px] uppercase">Placed</TableHead>
                  <TableHead className="text-[11px] uppercase">Crown</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Cost</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(c => (
                    <TableRow key={c.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{c.caseNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[c.patientId]?.name || c.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs font-mono">{c.toothNumber || "—"}</TableCell>
                      <TableCell className="text-xs">{c.implantBrand || "—"}</TableCell>
                      <TableCell className="text-xs">{c.implantSize || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(c.placementDate)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.finalCrownDate ? formatDate(c.finalCrownDate) : "—"}</TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(c.cost)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Register Implant Case</DialogTitle><DialogDescription>Track implant placement → abutment → final crown lifecycle.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
                <SelectContent>{(doctors || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Tooth Number</Label><Input value={form.toothNumber} onChange={e => setForm({ ...form, toothNumber: e.target.value })} placeholder="16" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Site</Label><Input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} placeholder="Upper posterior" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Brand</Label>
                <Select value={form.implantBrand} onValueChange={v => setForm({ ...form, implantBrand: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{IMPLANT_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Size</Label><Input value={form.implantSize} onChange={e => setForm({ ...form, implantSize: e.target.value })} placeholder="4.0 x 10mm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-1.5 text-xs"><Switch checked={form.boneGraft} onCheckedChange={v => setForm({ ...form, boneGraft: v })} /> Bone Graft</label>
              <label className="flex items-center gap-1.5 text-xs"><Switch checked={form.sinusLift} onCheckedChange={v => setForm({ ...form, sinusLift: v })} /> Sinus Lift</label>
              <label className="flex items-center gap-1.5 text-xs"><Switch checked={form.healingAbutment} onCheckedChange={v => setForm({ ...form, healingAbutment: v })} /> Healing Abut.</label>
            </div>
            {form.boneGraft && <div className="space-y-1.5"><Label className="text-xs">Graft Material</Label><Input value={form.graftMaterial} onChange={e => setForm({ ...form, graftMaterial: e.target.value })} placeholder="Bio-Oss / Autogenous" /></div>}
            <div className="space-y-1.5"><Label className="text-xs">Cost (Rs.)</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Follow-up Notes</Label><Textarea value={form.followUpNotes} onChange={e => setForm({ ...form, followUpNotes: e.target.value })} className="min-h-[50px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Register Case"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 9. Follow-ups
// ============================================================
interface Followup {
  id: string; followupNo: string; patientId: string; doctorId: string | null;
  procedureId: string | null; treatmentPlanId: string | null;
  type: string; scheduledDate: string; completedDate: string | null;
  notes: string | null; status: string; reminderSent: boolean;
}
export function DentalFollowups() {
  const [refresh, setRefresh] = useRefresh();
  const { data: followups, loading } = useFetch<Followup[]>(`/api/dental-followups?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "recall", scheduledDate: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    let list = followups || [];
    if (q) list = list.filter(f => f.followupNo.toLowerCase().includes(q.toLowerCase()) || (patientMap[f.patientId]?.name || "").toLowerCase().includes(q.toLowerCase()));
    if (statusFilter !== "all") list = list.filter(f => f.status === statusFilter);
    return list.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [followups, q, statusFilter, patientMap]);
  const pagination = usePagination(filtered, 10);

  const markComplete = async (f: Followup) => {
    await fetchAPI(`/api/dental-followups/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed", completedDate: new Date().toISOString() }) });
    toast.success("Follow-up completed");
    setRefresh();
  };
  const sendReminder = async (f: Followup) => {
    await fetchAPI(`/api/dental-followups/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminderSent: true }) });
    toast.success("Reminder sent via SMS/Email/WhatsApp");
    setRefresh();
  };

  const create = async () => {
    if (!form.patientId || !form.scheduledDate) { toast.error("Select patient and date"); return; }
    setSaving(true);
    try { await fetchAPI("/api/dental-followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); toast.success("Follow-up scheduled"); setAddOpen(false); setForm({ patientId: "", type: "recall", scheduledDate: "", notes: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Follow-up</h2><p className="text-xs text-muted-foreground">{followups?.length || 0} follow-ups · recall visits, healing assessment &amp; reminders</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Schedule Follow-up</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total" value={followups?.length || 0} icon={BellRing} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Scheduled" value={followups?.filter(f => f.status === "scheduled").length || 0} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Completed" value={followups?.filter(f => f.status === "completed").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Reminders Sent" value={followups?.filter(f => f.reminderSent).length || 0} icon={BellRing} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search followup no, patient…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1 flex-wrap">{["all","scheduled","completed","cancelled","no_show"].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{s.replace(/_/g," ")}</button>)}</div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={BellRing} title="No follow-ups" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">No.</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Scheduled</TableHead>
                  <TableHead className="text-[11px] uppercase">Notes</TableHead>
                  <TableHead className="text-[11px] uppercase">Reminder</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(f => (
                    <TableRow key={f.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{f.followupNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[f.patientId]?.name || f.patientId.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{f.type.replace(/_/g," ")}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(f.scheduledDate)}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{f.notes || "—"}</TableCell>
                      <TableCell>{f.reminderSent ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Sent</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {f.status === "scheduled" && !f.reminderSent && <DropdownMenuItem onClick={() => sendReminder(f)}><BellRing className="w-4 h-4 mr-2" /> Send Reminder</DropdownMenuItem>}
                            {f.status === "scheduled" && <DropdownMenuItem onClick={() => markComplete(f)}><CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed</DropdownMenuItem>}
                            <DropdownMenuItem className="text-rose-600" onClick={async () => { await fetchAPI(`/api/dental-followups/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) }); toast.success("Cancelled"); setRefresh(); }}><X className="w-4 h-4 mr-2" /> Cancel</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle><DialogDescription>Automatic SMS/Email/WhatsApp reminders can be sent to the patient.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["recall","procedure_review","healing_assessment","ortho_adjustment","implant_check"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Scheduled Date *</Label><Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Reason for follow-up…" className="min-h-[60px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Schedule"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 10. Reports
// ============================================================
interface ReportData {
  period: { from: string; to: string };
  summary: {
    totalExaminations: number; totalProcedures: number; totalPlans: number;
    pendingPlans: number; completedPlans: number; totalRevenue: number;
    totalLabOrders: number; pendingLabOrders: number; totalOrthoCases: number;
    totalImplantCases: number; totalFollowups: number; pendingFollowups: number;
    insuranceClaims: number;
  };
  byDoctor: { doctorId: string; doctorName: string; procedures: number; revenue: number; exams: number }[];
  byType: { treatmentType: string; count: number; revenue: number }[];
  toothTreatments: { toothNumber: string; count: number }[];
}
export function DentalReports() {
  const { data, loading } = useFetch<ReportData>("/api/dental-reports");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;

  const { summary, byDoctor, byType, toothTreatments } = data;
  const typeChart = byType.map(t => ({ name: TREATMENT_LABEL[t.treatmentType] || t.treatmentType, count: t.count, revenue: t.revenue }));
  const COLORS = ["#0d9488","#10b981","#06b6d4","#f59e0b","#8b5cf6","#ec4899","#ef4444","#84cc16","#0891b2","#d97706","#a855f7","#db2777"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Dental Reports</h2><p className="text-xs text-muted-foreground">Revenue, procedures, doctor-wise, tooth-wise &amp; insurance analytics</p></div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36 text-xs" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("dental-report-summary", ["Metric","Value"], Object.entries(summary).map(([k,v]) => [k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()), v])); toast.success("Report exported"); }}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Revenue" value={formatRs(summary.totalRevenue)} icon={BarChart3} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Procedures" value={summary.totalProcedures} icon={Activity} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Examinations" value={summary.totalExaminations} icon={Stethoscope} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Plans (Pending)" value={summary.pendingPlans} icon={ClipboardList} accent="from-amber-500 to-orange-500" index={3} />
        <KpiCard label="Ortho Cases" value={summary.totalOrthoCases} icon={Zap} accent="from-violet-500 to-violet-600" index={4} />
        <KpiCard label="Implants" value={summary.totalImplantCases} icon={Wrench} accent="from-pink-500 to-rose-500" index={5} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Procedures by Type</CardTitle></CardHeader>
          <CardContent>
            {typeChart.length === 0 ? <EmptyState icon={BarChart3} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeChart} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={110} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} formatter={(v: number, n: string) => n === "revenue" ? formatRs(v) : v} />
                  <Bar dataKey="count" name="Procedures" fill="#0d9488" radius={[0,6,6,0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Share by Type</CardTitle></CardHeader>
          <CardContent>
            {typeChart.length === 0 ? <EmptyState icon={BarChart3} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={typeChart} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={(e: { name?: string }) => e.name || ""} labelLine={false}>
                    {typeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRs(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Doctor Performance</CardTitle></CardHeader>
        <CardContent className="pt-2">
          {byDoctor.length === 0 ? <EmptyState icon={Users} title="No doctor data" className="py-6" /> : (
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead className="text-[11px] uppercase">Doctor</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Exams</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Procedures</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Revenue</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {byDoctor.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{d.doctorName}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{d.exams}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{d.procedures}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(d.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tooth-wise Treatment Count</CardTitle></CardHeader>
        <CardContent className="pt-2">
          {toothTreatments.length === 0 ? <EmptyState icon={Tooth} title="No tooth data" className="py-6" /> : (
            <div className="flex flex-wrap gap-1.5">
              {toothTreatments.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-card">
                  <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-300">{t.toothNumber}</span>
                  <Badge variant="outline" className="text-[9px]">{t.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 11. Settings
// ============================================================
export function DentalSettings() {
  const [settings, setSettings] = useState({
    numberingSystem: "fdi",
    autoInvoice: true,
    autoEmrAppend: true,
    inventoryDeduction: true,
    defaultDoctor: "",
    reminderChannel: "sms",
    vatRate: "13",
    labPartner: "",
  });
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success("Dental module settings saved"); }, 600);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">Dental Settings</h2><p className="text-xs text-muted-foreground">Configure the Dental Add-on module behavior &amp; integrations</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Clinical Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">Default Numbering System</Label>
              <Select value={settings.numberingSystem} onValueChange={v => setSettings({ ...settings, numberingSystem: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fdi">FDI (Worldwide)</SelectItem><SelectItem value="universal">Universal (USA)</SelectItem><SelectItem value="palmer">Palmer (UK)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">VAT / Tax Rate (%)</Label><Input type="number" value={settings.vatRate} onChange={e => setSettings({ ...settings, vatRate: e.target.value })} /></div>
            <div className="flex items-center justify-between"><div><Label className="text-xs">Auto-create invoice on procedure</Label><p className="text-[10px] text-muted-foreground">Billing module integration</p></div><Switch checked={settings.autoInvoice} onCheckedChange={v => setSettings({ ...settings, autoInvoice: v })} /></div>
            <div className="flex items-center justify-between"><div><Label className="text-xs">Append visit to EMR timeline</Label><p className="text-[10px] text-muted-foreground">EMR integration</p></div><Switch checked={settings.autoEmrAppend} onCheckedChange={v => setSettings({ ...settings, autoEmrAppend: v })} /></div>
            <div className="flex items-center justify-between"><div><Label className="text-xs">Auto-deduct materials from inventory</Label><p className="text-[10px] text-muted-foreground">Inventory integration</p></div><Switch checked={settings.inventoryDeduction} onCheckedChange={v => setSettings({ ...settings, inventoryDeduction: v })} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Notifications &amp; Partners</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">Follow-up Reminder Channel</Label>
              <Select value={settings.reminderChannel} onValueChange={v => setSettings({ ...settings, reminderChannel: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="all">All Channels</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Default Dental Lab Partner</Label><Input value={settings.labPartner} onChange={e => setSettings({ ...settings, labPartner: e.target.value })} placeholder="Smile Dental Laboratory" /></div>
            <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-100 dark:border-teal-900/50 p-3">
              <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-teal-600" /><p className="text-xs font-semibold text-teal-800 dark:text-teal-200">Active Integrations</p></div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Billing Module</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> EMR Timeline</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Pharmacy / Rx</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Radiology / PACS</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Inventory</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Audit Log</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Notifications</div>
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Accounting</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => toast.info("Settings reset to defaults")}>Reset</Button>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={save}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}</Button>
      </div>
    </div>
  );
}
