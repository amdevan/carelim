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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate, timeAgo, statusColors } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Download, Plus, Search, MoreVertical, Eye, CheckCircle2, Users, Building2,
  CalendarClock, Megaphone, UserCheck, Percent, Wallet, Phone, Target,
  TrendingUp, Activity, Network, Stethoscope, FileText, Settings as SettingsIcon,
  ShieldCheck, Save, X, Clock, ChevronRight, Sparkles, ArrowUpRight,
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
interface Branch { id: string; name: string; code: string; }

const SOURCE_LABELS: Record<string, string> = {
  website: "Website", mobile_app: "Mobile App", call_center: "Call Center", whatsapp: "WhatsApp",
  facebook: "Facebook", google: "Google Ads", landing_page: "Landing Page", partner: "Partner",
  walk_in: "Walk-in", reception: "Reception", phone: "Phone", hospital_website: "Hospital Website", existing: "Existing",
};
const LEAD_SOURCES = ["facebook", "google", "whatsapp", "website", "instagram", "call_center", "referral"];
const LEAD_STATUSES = ["new", "contacted", "interested", "appointment_booked", "treatment_started", "completed", "lost"];
const REFERRAL_STATUSES = ["pending", "earned", "settled", "cancelled"];
const INTERESTS = ["IVF & Fertility", "Dental", "Cardiology", "Orthopedics", "General Medicine", "Pediatrics", "Gynecology", "Dermatology"];

function useRefresh() { const [r, setR] = useState(0); return [r, () => setR(v => v + 1)] as const; }
function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`text-[9px] capitalize ${statusColors[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"}`}>{status.replace(/_/g, " ")}</Badge>;
}
function PatientTypeBadge({ type }: { type: string }) {
  return type === "carelim"
    ? <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> CARELIM</Badge>
    : <Badge className="text-[9px] bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> CLINIC</Badge>;
}

// ============================================================
// 1. Patients (with Carelim/Clinic badges + source + journey timeline)
// ============================================================
interface PatientSource {
  id: string; patientId: string; sourceType: string; sourceName: string;
  campaignId: string | null; clinicId: string | null; trackingId: string;
  createdBy: string | null; createdAt: string;
  patient: { id: string; name: string; patientCode: string; phone: string; age: number; gender: string } | null;
  clinicName: string; campaignName: string;
}
interface ActivityLog { id: string; patientId: string; appointmentId: string | null; activity: string; description: string | null; performedBy: string | null; createdAt: string; }

export function CMSPatients() {
  const [refresh, setRefresh] = useRefresh();
  const { data: sources, loading } = useFetch<PatientSource[]>(`/api/cms-patient-sources?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detail, setDetail] = useState<PatientSource | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  const filtered = useMemo(() => {
    let list = sources || [];
    if (typeFilter !== "all") list = list.filter(s => s.sourceType === typeFilter);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(s => s.patient?.name.toLowerCase().includes(ql) || s.trackingId.toLowerCase().includes(ql) || s.patient?.phone.includes(q) || s.patient?.patientCode.toLowerCase().includes(ql));
    }
    return list;
  }, [sources, q, typeFilter]);
  const pagination = usePagination(filtered, 10);

  const openDetail = async (s: PatientSource) => {
    setDetail(s);
    const res = await fetchAPI(`/api/cms-activity-logs?patientId=${s.patientId}`);
    if (res.ok) setActivity(await res.json());
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Patients</h2><p className="text-xs text-muted-foreground">{sources?.length || 0} patients · Carelim vs Clinic attribution</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (sources?.length) { exportToCSV("cms-patients", ["Tracking ID","Name","Code","Type","Source","Clinic","Phone","Campaign"], sources.map(s => [s.trackingId, s.patient?.name || "", s.patient?.patientCode || "", s.sourceType, s.sourceName, s.clinicName, s.patient?.phone || "", s.campaignName])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Patients" value={sources?.length || 0} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Carelim Patients" value={sources?.filter(s => s.sourceType === "carelim").length || 0} icon={ShieldCheck} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Clinic Patients" value={sources?.filter(s => s.sourceType === "clinic").length || 0} icon={Building2} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Tracking IDs" value={sources?.length || 0} icon={Network} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, tracking ID…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1">{["all", "carelim", "clinic"].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${typeFilter === t ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{t}</button>)}</div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Users} title="No patients found" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Source</TableHead>
                  <TableHead className="text-[11px] uppercase">Clinic</TableHead>
                  <TableHead className="text-[11px] uppercase">Tracking ID</TableHead>
                  <TableHead className="text-[11px] uppercase">Campaign</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(s => (
                    <TableRow key={s.id} className="table-row-hover cursor-pointer" onClick={() => openDetail(s)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[10px]">{s.patient?.name?.split(" ").map(n => n[0]).slice(0, 2).join("") || "P"}</AvatarFallback></Avatar>
                          <div><p className="text-xs font-semibold">{s.patient?.name || "—"}</p><p className="text-[10px] text-muted-foreground">{s.patient?.patientCode} · {s.patient?.phone}</p></div>
                        </div>
                      </TableCell>
                      <TableCell><PatientTypeBadge type={s.sourceType} /></TableCell>
                      <TableCell className="text-xs capitalize">{SOURCE_LABELS[s.sourceName] || s.sourceName}</TableCell>
                      <TableCell className="text-xs">{s.clinicName}</TableCell>
                      <TableCell className="font-mono text-[11px] text-teal-700 dark:text-teal-300">{s.trackingId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.campaignName}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(s)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Patient detail drawer with journey timeline */}
      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> {detail.patient?.name}</SheetTitle>
                <SheetDescription>{detail.patient?.patientCode} · {detail.trackingId}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Patient Type</p><div className="mt-1"><PatientTypeBadge type={detail.sourceType} /></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Source</p><p className="text-xs font-semibold capitalize">{SOURCE_LABELS[detail.sourceName] || detail.sourceName}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Current Clinic</p><p className="text-xs font-semibold">{detail.clinicName}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Campaign</p><p className="text-xs font-semibold">{detail.campaignName}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Phone</p><p className="text-xs font-semibold">{detail.patient?.phone}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Age / Gender</p><p className="text-xs font-semibold">{detail.patient?.age}y · {detail.patient?.gender}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Patient Journey Timeline</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {activity.length === 0 ? <EmptyState icon={Activity} title="No activity" className="py-4" /> : (
                      <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                        {activity.map((a, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0"><p className="text-xs font-semibold capitalize">{a.activity.replace(/_/g, " ")}</p><p className="text-[10px] text-muted-foreground">{a.description} · {timeAgo(a.createdAt)}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
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
// 2. Appointments (extension table)
// ============================================================
interface ApptExt {
  id: string; appointmentId: string; bookingSource: string; bookingChannel: string;
  carelimPatient: boolean; commissionEligible: boolean; trackingId: string | null;
  status: string; createdAt: string;
  appointment: { date: string; time: string; tokenNo: number; reason: string; patientName: string; patientCode: string; patientPhone: string; doctorName: string; } | null;
}
export function CMSAppointments() {
  const [refresh, setRefresh] = useRefresh();
  const { data: exts, loading } = useFetch<ApptExt[]>(`/api/cms-appointments-ext?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const filtered = useMemo(() => {
    let list = exts || [];
    if (sourceFilter !== "all") list = list.filter(e => e.bookingSource === sourceFilter);
    if (q) { const ql = q.toLowerCase(); list = list.filter(e => e.appointment?.patientName.toLowerCase().includes(ql) || e.trackingId?.toLowerCase().includes(ql) || e.appointment?.doctorName.toLowerCase().includes(ql)); }
    return list;
  }, [exts, q, sourceFilter]);
  const pagination = usePagination(filtered, 10);

  const advanceStatus = async (id: string, status: string) => {
    await fetchAPI(`/api/cms-appointments-ext/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Appointment → ${status.replace(/_/g, " ")}`);
    setRefresh();
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Appointments</h2><p className="text-xs text-muted-foreground">{exts?.length || 0} appointments · with booking source &amp; commission tracking</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (exts?.length) { exportToCSV("cms-appointments", ["Tracking","Patient","Doctor","Source","Channel","Commission","Status"], exts.map(e => [e.trackingId || "", e.appointment?.patientName || "", e.appointment?.doctorName || "", e.bookingSource, e.bookingChannel, e.commissionEligible ? "Yes" : "No", e.status])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Appointments" value={exts?.length || 0} icon={CalendarClock} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Carelim Bookings" value={exts?.filter(e => e.bookingSource === "CARELIM").length || 0} icon={ShieldCheck} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Clinic Bookings" value={exts?.filter(e => e.bookingSource === "CLINIC").length || 0} icon={Building2} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Commission Eligible" value={exts?.filter(e => e.commissionEligible).length || 0} icon={Percent} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient, doctor, tracking…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1">{["all", "CARELIM", "CLINIC"].map(t => <button key={t} onClick={() => setSourceFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-md ${sourceFilter === t ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{t}</button>)}</div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={CalendarClock} title="No appointments" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Doctor</TableHead>
                  <TableHead className="text-[11px] uppercase">Date / Time</TableHead>
                  <TableHead className="text-[11px] uppercase">Source</TableHead>
                  <TableHead className="text-[11px] uppercase">Channel</TableHead>
                  <TableHead className="text-[11px] uppercase">Commission</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(e => (
                    <TableRow key={e.id} className="table-row-hover">
                      <TableCell><p className="text-xs font-semibold">{e.appointment?.patientName || "—"}</p><p className="text-[10px] text-muted-foreground">{e.appointment?.patientCode}</p></TableCell>
                      <TableCell className="text-xs">{e.appointment?.doctorName || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.appointment ? `${formatDate(e.appointment.date)} · ${e.appointment.time}` : "—"}</TableCell>
                      <TableCell>{e.bookingSource === "CARELIM" ? <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">CARELIM</Badge> : <Badge className="text-[9px] bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">CLINIC</Badge>}</TableCell>
                      <TableCell className="text-xs capitalize">{SOURCE_LABELS[e.bookingChannel] || e.bookingChannel}</TableCell>
                      <TableCell>{e.commissionEligible ? <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Eligible</Badge> : <span className="text-[10px] text-muted-foreground">—</span>}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => advanceStatus(e.id, "confirmed")}>Confirm</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(e.id, "checked_in")}>Check In</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(e.id, "consultation")}>Start Consultation</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(e.id, "billing")}>Send to Billing</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(e.id, "completed")}>Complete</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={() => advanceStatus(e.id, "cancelled")}>Cancel</DropdownMenuItem>
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
    </div>
  );
}

// ============================================================
// 3. Leads
// ============================================================
interface MSLead {
  id: string; leadNo: string; patientName: string; phone: string; email: string | null;
  source: string; campaignId: string | null; clinicId: string | null; doctorId: string | null;
  interest: string | null; status: string; convertedPatientId: string | null; convertedAt: string | null;
  notes: string | null; assignedTo: string | null; createdAt: string;
}
export function CMSLeads() {
  const [refresh, setRefresh] = useRefresh();
  const { data: leads, loading } = useFetch<MSLead[]>(`/api/cms-leads?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientName: "", phone: "", email: "", source: "facebook", interest: "General Medicine", assignedTo: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = leads || [];
    if (statusFilter !== "all") list = list.filter(l => l.status === statusFilter);
    if (q) { const ql = q.toLowerCase(); list = list.filter(l => l.patientName.toLowerCase().includes(ql) || l.phone.includes(q) || l.leadNo.toLowerCase().includes(ql)); }
    return list;
  }, [leads, q, statusFilter]);
  const pagination = usePagination(filtered, 10);

  const advanceStatus = async (id: string, status: string) => {
    await fetchAPI(`/api/cms-leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Lead → ${status.replace(/_/g, " ")}`);
    setRefresh();
  };

  const create = async () => {
    if (!form.patientName || !form.phone) { toast.error("Name and phone required"); return; }
    setSaving(true);
    try { await fetchAPI("/api/cms-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); toast.success("Lead created"); setAddOpen(false); setForm({ patientName: "", phone: "", email: "", source: "facebook", interest: "General Medicine", assignedTo: "", notes: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Lead Management</h2><p className="text-xs text-muted-foreground">{leads?.length || 0} leads · marketing attribution &amp; conversion</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (leads?.length) { exportToCSV("cms-leads", ["LeadNo","Name","Phone","Source","Interest","Status","Assigned"], leads.map(l => [l.leadNo, l.patientName, l.phone, l.source, l.interest || "", l.status, l.assignedTo || ""])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Lead</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Leads" value={leads?.length || 0} icon={Megaphone} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="New" value={leads?.filter(l => l.status === "new").length || 0} icon={Sparkles} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Converted" value={leads?.filter(l => ["appointment_booked", "treatment_started", "completed"].includes(l.status)).length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Lost" value={leads?.filter(l => l.status === "lost").length || 0} icon={X} accent="from-rose-500 to-rose-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search lead no, name, phone…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1 flex-wrap">{["all", ...LEAD_STATUSES].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize ${statusFilter === s ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{s.replace(/_/g, " ")}</button>)}</div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Megaphone} title="No leads" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Lead No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Source</TableHead>
                  <TableHead className="text-[11px] uppercase">Interest</TableHead>
                  <TableHead className="text-[11px] uppercase">Assigned</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(l => (
                    <TableRow key={l.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{l.leadNo}</TableCell>
                      <TableCell><p className="text-xs font-semibold">{l.patientName}</p><p className="text-[10px] text-muted-foreground">{l.phone}</p></TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{l.source}</Badge></TableCell>
                      <TableCell className="text-xs">{l.interest || "—"}</TableCell>
                      <TableCell className="text-xs">{l.assignedTo || "—"}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => advanceStatus(l.id, "contacted")}>Mark Contacted</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(l.id, "interested")}>Mark Interested</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(l.id, "appointment_booked")}>Book Appointment</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(l.id, "treatment_started")}>Start Treatment</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => advanceStatus(l.id, "completed")}>Complete</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={() => advanceStatus(l.id, "lost")}>Mark Lost</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>New Lead</DialogTitle><DialogDescription>Capture a marketing lead from any source.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98XXXXXXXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Source</Label><Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Interest</Label><Select value={form.interest} onValueChange={v => setForm({ ...form, interest: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERESTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Coordinator name" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create Lead"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 4. Partner Clinics (uses Branch data)
// ============================================================
export function CMSClinics() {
  const { data: branches, loading } = useFetch<Branch[]>("/api/branches");
  const { data: sources } = useFetch<PatientSource[]>("/api/cms-patient-sources");
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const clinicCounts: Record<string, number> = {};
  sources?.forEach(s => { if (s.clinicId) clinicCounts[s.clinicId] = (clinicCounts[s.clinicId] || 0) + 1; });
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">Partner Clinics</h2><p className="text-xs text-muted-foreground">{branches?.length || 0} partner clinics · multi-tenant isolation</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Clinics" value={branches?.length || 0} icon={Building2} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active Clinics" value={branches?.filter(b => b.name).length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Total Patients" value={sources?.length || 0} icon={Users} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Avg Patients/Clinic" value={branches?.length ? Math.round((sources?.length || 0) / branches.length) : 0} icon={TrendingUp} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(branches || []).map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
            <Card className="card-hover"><CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0"><Building2 className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{b.code}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{clinicCounts[b.id] || 0} patients</Badge>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 5. Doctors
// ============================================================
export function CMSDoctors() {
  const { data: doctors, loading } = useFetch<Doctor[]>("/api/doctors");
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">Doctors</h2><p className="text-xs text-muted-foreground">{doctors?.length || 0} doctors across all partner clinics</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Doctors" value={doctors?.length || 0} icon={Stethoscope} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Specialties" value={new Set(doctors?.map(d => d.specialization)).size || 0} icon={UserCheck} accent="from-emerald-500 to-emerald-600" index={1} />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Doctor</TableHead>
            <TableHead className="text-[11px] uppercase">Specialization</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(doctors || []).map(d => (
              <TableRow key={d.id} className="table-row-hover">
                <TableCell><div className="flex items-center gap-2.5"><Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[10px]">{d.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><span className="text-xs font-semibold">{d.name}</span></div></TableCell>
                <TableCell className="text-xs">{d.specialization || "—"}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info(`Doctor profile: ${d.name}`)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ============================================================
// 6. Referral Tracking
// ============================================================
interface Referral {
  id: string; referralNo: string; patientId: string; clinicId: string | null; doctorId: string | null;
  referralSource: string; campaignId: string | null; commissionRate: number; commissionAmount: number;
  billAmount: number; status: string; settledAt: string | null; createdAt: string;
  patientName: string; doctorName: string; clinicName: string;
}
export function CMSReferrals() {
  const [refresh, setRefresh] = useRefresh();
  const { data: referrals, loading } = useFetch<Referral[]>(`/api/cms-referrals?_r=${refresh}`);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return referrals || [];
    const ql = q.toLowerCase();
    return (referrals || []).filter(r => r.referralNo.toLowerCase().includes(ql) || r.patientName.toLowerCase().includes(ql) || r.doctorName.toLowerCase().includes(ql));
  }, [referrals, q]);
  const pagination = usePagination(filtered, 10);
  const settle = async (r: Referral) => { await fetchAPI(`/api/cms-referrals/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "settled" }) }); toast.success(`Referral ${r.referralNo} settled`); setRefresh(); };
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Referral Tracking</h2><p className="text-xs text-muted-foreground">{referrals?.length || 0} referrals · commission engine</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (referrals?.length) { exportToCSV("cms-referrals", ["RefNo","Patient","Doctor","Clinic","Source","Bill","Rate","Commission","Status"], referrals.map(r => [r.referralNo, r.patientName, r.doctorName, r.clinicName, r.referralSource, r.billAmount, r.commissionRate, r.commissionAmount, r.status])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Referrals" value={referrals?.length || 0} icon={Network} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={referrals?.filter(r => r.status === "pending").length || 0} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Earned" value={referrals?.filter(r => r.status === "earned").length || 0} icon={Percent} accent="from-violet-500 to-violet-600" index={2} />
        <KpiCard label="Settled" value={referrals?.filter(r => r.status === "settled").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        <div className="p-3 border-b border-border"><div className="relative max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search referral no, patient, doctor…" className="pl-8 h-9 text-sm" /></div></div>
        {filtered.length === 0 ? <EmptyState icon={Network} title="No referrals" className="py-10" /> : (
          <>
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead className="text-[11px] uppercase">Ref No</TableHead>
                <TableHead className="text-[11px] uppercase">Patient</TableHead>
                <TableHead className="text-[11px] uppercase">Doctor / Clinic</TableHead>
                <TableHead className="text-[11px] uppercase">Source</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Bill</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Rate</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Commission</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
                <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pagination.paged.map(r => (
                  <TableRow key={r.id} className="table-row-hover">
                    <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{r.referralNo}</TableCell>
                    <TableCell className="text-xs font-medium">{r.patientName}</TableCell>
                    <TableCell className="text-xs">{r.doctorName}<p className="text-[10px] text-muted-foreground">{r.clinicName}</p></TableCell>
                    <TableCell className="text-xs capitalize">{r.referralSource}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatRs(r.billAmount)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{r.commissionRate}%</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-violet-700 dark:text-violet-300">{formatRs(r.commissionAmount)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">{r.status === "earned" && <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => settle(r)}><CheckCircle2 className="w-3 h-3" /> Settle</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination {...pagination} />
          </>
        )}
      </CardContent></Card>
    </div>
  );
}

// ============================================================
// 7. Commission
// ============================================================
interface CommissionData {
  summary: { totalCommission: number; pendingCommission: number; paidCommission: number; monthCommission: number; totalReferrals: number; totalSettlements: number; };
  byClinic: { clinicId: string; clinicName: string; count: number; amount: number; pending: number }[];
  byDoctor: { doctorId: string; doctorName: string; count: number; amount: number }[];
  settlements: { id: string; settlementNo: string; amount: number; status: string; paidAt: string | null; month: string }[];
}
export function CMSCommission() {
  const { data, loading } = useFetch<CommissionData>("/api/cms-commission");
  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const { summary, byClinic, byDoctor, settlements } = data;
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">Commission Engine</h2><p className="text-xs text-muted-foreground">Auto-calculated commissions · settlement tracking</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Commission" value={formatRs(summary.totalCommission)} icon={Percent} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={formatRs(summary.pendingCommission)} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Paid" value={formatRs(summary.paidCommission)} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="This Month" value={formatRs(summary.monthCommission)} icon={Wallet} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Commission by Clinic</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {byClinic.length === 0 ? <EmptyState icon={Building2} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byClinic} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="clinicName" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip formatter={(v: number) => formatRs(v)} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="amount" name="Commission" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Settlements</CardTitle></CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {settlements.length === 0 ? <EmptyState icon={Wallet} title="No settlements" className="py-6" /> : (
              <div className="space-y-2">{settlements.slice(0, 12).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0"><Wallet className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold font-mono">{s.settlementNo}</p><p className="text-[10px] text-muted-foreground">{s.month}</p></div>
                  <div className="text-right"><p className="text-xs font-bold tabular-nums">{formatRs(s.amount)}</p><Badge variant="outline" className={`text-[9px] ${s.status === "paid" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{s.status}</Badge></div>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 8. Care Coordinators
// ============================================================
interface Coordinator {
  id: string; patientId: string; coordinatorId: string | null; coordinatorName: string | null;
  status: string; nextFollowup: string | null; remarks: string | null; createdAt: string;
  patientName: string; patientCode: string; patientPhone: string;
}
export function CMSCoordinators() {
  const [refresh, setRefresh] = useRefresh();
  const { data: coordinators, loading } = useFetch<Coordinator[]>(`/api/cms-care-coordinators?_r=${refresh}`);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", coordinatorName: "", nextFollowup: "", remarks: "" });
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [saving, setSaving] = useState(false);
  const pagination = usePagination(coordinators || [], 10);
  const COORDINATORS = ["Sita Sharma", "Ramesh Thapa", "Anjali Gurung", "Dipesh Magar", "Pooja Shrestha"];

  const create = async () => {
    if (!form.patientId || !form.coordinatorName) { toast.error("Patient and coordinator required"); return; }
    setSaving(true);
    try { await fetchAPI("/api/cms-care-coordinators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); toast.success("Coordinator assigned"); setAddOpen(false); setForm({ patientId: "", coordinatorName: "", nextFollowup: "", remarks: "" }); setRefresh(); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Care Coordinators</h2><p className="text-xs text-muted-foreground">{coordinators?.length || 0} assignments · patient follow-up &amp; coordination</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Assign Coordinator</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Assignments" value={coordinators?.length || 0} icon={UserCheck} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active" value={coordinators?.filter(c => c.status === "active").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Follow-up Due" value={coordinators?.filter(c => c.nextFollowup && new Date(c.nextFollowup) <= new Date(Date.now() + 3 * 86400000) && c.status === "active").length || 0} icon={Phone} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Coordinators" value={new Set(coordinators?.map(c => c.coordinatorName)).size || 0} icon={Users} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(coordinators || []).length === 0 ? <EmptyState icon={UserCheck} title="No coordinators" className="py-10" /> : (
          <>
            <Table>
              <TableHeader><TableRow className="bg-muted/40">
                <TableHead className="text-[11px] uppercase">Patient</TableHead>
                <TableHead className="text-[11px] uppercase">Coordinator</TableHead>
                <TableHead className="text-[11px] uppercase">Next Follow-up</TableHead>
                <TableHead className="text-[11px] uppercase">Remarks</TableHead>
                <TableHead className="text-[11px] uppercase">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pagination.paged.map(c => (
                  <TableRow key={c.id} className="table-row-hover">
                    <TableCell><p className="text-xs font-semibold">{c.patientName}</p><p className="text-[10px] text-muted-foreground">{c.patientCode} · {c.patientPhone}</p></TableCell>
                    <TableCell className="text-xs">{c.coordinatorName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.nextFollowup ? formatDate(c.nextFollowup) : "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{c.remarks || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination {...pagination} />
          </>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Assign Care Coordinator</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label><Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent className="max-h-60">{(patients || []).slice(0, 100).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.patientCode}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Coordinator *</Label><Select value={form.coordinatorName} onValueChange={v => setForm({ ...form, coordinatorName: v })}><SelectTrigger><SelectValue placeholder="Select coordinator" /></SelectTrigger><SelectContent>{COORDINATORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Next Follow-up</Label><Input type="date" value={form.nextFollowup} onChange={e => setForm({ ...form, nextFollowup: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remarks</Label><Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="min-h-[50px]" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Assign"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 9. Reports
// ============================================================
interface ReportData {
  summary: { totalPatients: number; carelimPatients: number; clinicPatients: number; totalRevenue: number; totalCommission: number; pendingCommission: number; paidCommission: number; totalLeads: number; convertedLeads: number; leadConversion: number; apptConversion: number; retentionRate: number; activeCampaigns: number; activeCoordinators: number; };
  bySource: Record<string, number>;
  campaignPerformance: { name: string; platform: string; budget: number; spent: number; leads: number; conversions: number; cpl: number; cpa: number; roi: number }[];
  leadsByStatus: Record<string, number>;
}
export function CMSReports() {
  const { data, loading } = useFetch<ReportData>("/api/cms-reports");
  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const { summary, bySource, campaignPerformance, leadsByStatus } = data;
  const sourceChart = Object.entries(bySource).map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v }));
  const COLORS = ["#0d9488","#10b981","#06b6d4","#f59e0b","#8b5cf6","#ec4899","#ef4444","#84cc16","#0891b2","#d97706","#a855f7","#db2777"];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Reports</h2><p className="text-xs text-muted-foreground">Patient attribution, revenue, commission &amp; campaign analytics</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("cms-report-summary", ["Metric","Value"], Object.entries(summary).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()), v])); toast.success("Report exported"); }}><Download className="w-4 h-4" /> Export Summary</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Patients" value={summary.totalPatients} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Carelim" value={summary.carelimPatients} icon={ShieldCheck} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Clinic" value={summary.clinicPatients} icon={Building2} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Revenue" value={formatRs(summary.totalRevenue)} icon={Wallet} accent="from-amber-500 to-orange-500" index={3} />
        <KpiCard label="Commission" value={formatRs(summary.totalCommission)} icon={Percent} accent="from-violet-500 to-violet-600" index={4} />
        <KpiCard label="Lead Conv." value={`${summary.leadConversion}%`} icon={Target} accent="from-pink-500 to-rose-500" index={5} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Patient Source Breakdown</CardTitle></CardHeader>
          <CardContent>{sourceChart.length === 0 ? <EmptyState icon={Users} title="No data" className="py-6" /> : <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={sourceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={(e: { name?: string }) => e.name || ""} labelLine={false}>{sourceChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart></ResponsiveContainer>}</CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Campaign Performance</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {campaignPerformance.length === 0 ? <EmptyState icon={Megaphone} title="No campaigns" className="py-6" /> : (
              <Table><TableHeader><TableRow className="bg-muted/40"><TableHead className="text-[11px] uppercase">Campaign</TableHead><TableHead className="text-[11px] uppercase text-right">Leads</TableHead><TableHead className="text-[11px] uppercase text-right">Conv.</TableHead><TableHead className="text-[11px] uppercase text-right">CPL</TableHead><TableHead className="text-[11px] uppercase text-right">ROI</TableHead></TableRow></TableHeader>
                <TableBody>{campaignPerformance.map((c, i) => (<TableRow key={i}><TableCell className="text-xs font-medium">{c.name}</TableCell><TableCell className="text-right text-xs tabular-nums">{c.leads}</TableCell><TableCell className="text-right text-xs tabular-nums">{c.conversions}</TableCell><TableCell className="text-right text-xs tabular-nums">{formatRs(c.cpl)}</TableCell><TableCell className="text-right"><Badge variant="outline" className={`text-[9px] ${c.roi >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>{c.roi >= 0 ? "+" : ""}{c.roi}%</Badge></TableCell></TableRow>))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 10. Settings
// ============================================================
export function CMSSettings() {
  const [settings, setSettings] = useState({
    defaultCommissionRate: "10", autoGenerateFollowup: true, multiTenantIsolation: true,
    carelimBrandColor: "#10b981", clinicBrandColor: "#06b6d4", smsNotifications: true,
    whatsappNotifications: true, emailNotifications: true, pushNotifications: false,
    dentalFollowupDays: "7", ivfFollowupDays: "30", surgeryFollowupDays: "15",
  });
  const [saving, setSaving] = useState(false);
  const save = () => { setSaving(true); setTimeout(() => { setSaving(false); toast.success("Carelim MS settings saved"); }, 600); };
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">Carelim MS Settings</h2><p className="text-xs text-muted-foreground">Configure commission rates, follow-up schedules &amp; notifications</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Commission &amp; Follow-up</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">Default Commission Rate (%)</Label><Input type="number" value={settings.defaultCommissionRate} onChange={e => setSettings({ ...settings, defaultCommissionRate: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Dental (days)</Label><Input type="number" value={settings.dentalFollowupDays} onChange={e => setSettings({ ...settings, dentalFollowupDays: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">IVF (days)</Label><Input type="number" value={settings.ivfFollowupDays} onChange={e => setSettings({ ...settings, ivfFollowupDays: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Surgery (days)</Label><Input type="number" value={settings.surgeryFollowupDays} onChange={e => setSettings({ ...settings, surgeryFollowupDays: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.autoGenerateFollowup} onChange={e => setSettings({ ...settings, autoGenerateFollowup: e.target.checked })} className="rounded" /> Auto-generate follow-ups after procedures</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.multiTenantIsolation} onChange={e => setSettings({ ...settings, multiTenantIsolation: e.target.checked })} className="rounded" /> Multi-tenant data isolation (clinic sees only own data)</label>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Notifications &amp; Branding</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Carelim Color</Label><div className="flex items-center gap-2"><input type="color" value={settings.carelimBrandColor} onChange={e => setSettings({ ...settings, carelimBrandColor: e.target.value })} className="w-10 h-8 rounded border" /><span className="text-xs font-mono">{settings.carelimBrandColor}</span></div></div>
              <div className="space-y-1.5"><Label className="text-xs">Clinic Color</Label><div className="flex items-center gap-2"><input type="color" value={settings.clinicBrandColor} onChange={e => setSettings({ ...settings, clinicBrandColor: e.target.value })} className="w-10 h-8 rounded border" /><span className="text-xs font-mono">{settings.clinicBrandColor}</span></div></div>
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.smsNotifications} onChange={e => setSettings({ ...settings, smsNotifications: e.target.checked })} className="rounded" /> SMS Notifications</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.whatsappNotifications} onChange={e => setSettings({ ...settings, whatsappNotifications: e.target.checked })} className="rounded" /> WhatsApp Notifications</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.emailNotifications} onChange={e => setSettings({ ...settings, emailNotifications: e.target.checked })} className="rounded" /> Email Notifications</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.pushNotifications} onChange={e => setSettings({ ...settings, pushNotifications: e.target.checked })} className="rounded" /> Push Notifications</label>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-100 dark:border-teal-900/50 p-3">
        <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-teal-600" /><p className="text-xs font-semibold text-teal-800 dark:text-teal-200">Role-Based Permissions</p></div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          {["Super Admin", "Carelim Admin", "Care Coordinator", "Call Center", "Marketing Team", "Finance", "Clinic Admin", "Doctor", "Reception"].map(r => <div key={r} className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> {r}</div>)}
        </div>
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => toast.info("Reset to defaults")}>Reset</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={save}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}</Button></div>
    </div>
  );
}
