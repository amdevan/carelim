"use client";
import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/cms/kpi-card";
import { PatientSearch } from "@/components/ui/patient-search";
import { DoctorSearch } from "@/components/ui/doctor-search";
import { EmptyState } from "@/components/cms/empty-state";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  Download, Plus, Search, CheckCircle2, Activity, Clock, BarChart3, Save,
} from "lucide-react";

interface Patient { id: string; name: string; patientCode: string; }
interface Procedure {
  id: string; procNo: string; patientId: string; doctorId: string | null;
  procedureName: string; category: string | null; procedureDate: string;
  fee: number; duration: number; notes: string | null; complications: string | null;
  invoiceId: string | null; status: string;
}

const CATEGORIES = [
  { value: "minor_surgery", label: "Minor Surgery" },
  { value: "injection", label: "Injection / IV" },
  { value: "dressing", label: "Dressing / Wound Care" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "therapy", label: "Therapy" },
  { value: "diagnostic", label: "Diagnostic Procedure" },
  { value: "other", label: "Other" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

function useRefresh() { const [r, setR] = useState(0); return [r, () => setR(v => v + 1)] as const; }
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  };
  return <Badge variant="outline" className={`text-[9px] capitalize ${map[status] || ""}`}>{status.replace(/_/g, " ")}</Badge>;
}

/** Procedures module for the General clinic type — clinical procedure log
 * with auto-invoice via Billing and EMR timeline notes. */
export function ProceduresView() {
  const [refresh, setRefresh] = useRefresh();
  const { data: procs, loading } = useFetch<Procedure[]>(`/api/procedures?_r=${refresh}`);
  const { data: patients } = useFetch<Patient[]>("/api/patients?limit=200");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", doctorId: "", procedureName: "", category: "other", fee: "1000", duration: "30", procedureDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const patientMap = useMemo(() => Object.fromEntries((patients || []).map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    const list = procs || [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(p =>
      p.procNo.toLowerCase().includes(s) ||
      p.procedureName.toLowerCase().includes(s) ||
      (patientMap[p.patientId]?.name || "").toLowerCase().includes(s)
    );
  }, [procs, q, patientMap]);
  const pagination = usePagination(filtered, 10);

  const totalRevenue = (procs || []).reduce((s, p) => s + (p.fee || 0), 0);

  const create = async () => {
    if (!form.patientId) { toast.error("Select a patient"); return; }
    if (!form.procedureName.trim()) { toast.error("Enter the procedure name"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/procedures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, fee: Number(form.fee) || 0, duration: Number(form.duration) || 0, markPaid: true }) });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Procedure ${data.procNo} recorded · Invoice auto-generated`);
      setAddOpen(false);
      setForm({ patientId: "", doctorId: "", procedureName: "", category: "other", fee: "1000", duration: "30", procedureDate: new Date().toISOString().slice(0, 10), notes: "" });
      setRefresh();
    } catch { toast.error("Failed to record procedure"); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Procedures</h2><p className="text-xs text-muted-foreground">{procs?.length || 0} procedures · auto-invoices created via Billing module</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (procs?.length) { exportToCSV("procedures", ["ProcNo", "Patient", "Procedure", "Category", "Date", "Fee", "Status"], procs.map(p => [p.procNo, patientMap[p.patientId]?.name || p.patientId, p.procedureName, CATEGORY_LABEL[p.category || ""] || p.category || "", formatDate(p.procedureDate), p.fee, p.status])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Log Procedure</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Procedures" value={procs?.length || 0} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Completed" value={procs?.filter(p => p.status === "completed").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Revenue" value={formatRs(totalRevenue)} icon={BarChart3} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Total Duration (min)" value={(procs || []).reduce((s, p) => s + p.duration, 0)} icon={Clock} accent="from-pink-500 to-rose-500" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search proc no, patient, procedure…" className="pl-8 h-9 text-sm" />
            </div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Activity} title="No procedures" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Proc No</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Procedure</TableHead>
                  <TableHead className="text-[11px] uppercase">Category</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Fee</TableHead>
                  <TableHead className="text-[11px] uppercase">Invoice</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(p => (
                    <TableRow key={p.id} className="table-row-hover">
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{p.procNo}</TableCell>
                      <TableCell className="text-xs font-medium">{patientMap[p.patientId]?.name || p.patientId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{p.procedureName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{CATEGORY_LABEL[p.category || ""] || p.category || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.procedureDate)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatRs(p.fee)}</TableCell>
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
          <DialogHeader><DialogTitle>Log Procedure</DialogTitle><DialogDescription>An invoice will be auto-created in the Billing module. The visit is also appended to the patient&apos;s EMR timeline.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Patient *</Label>
              <PatientSearch value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })} label="" required />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Doctor</Label>
              <DoctorSearch value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })} label="" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Procedure Name *</Label><Input value={form.procedureName} onChange={e => setForm({ ...form, procedureName: e.target.value })} placeholder="e.g. Wound dressing" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Fee (Rs)</Label><Input type="number" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.procedureDate} onChange={e => setForm({ ...form, procedureDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Procedure notes…" className="min-h-[60px]" /></div>
          </div>
          <DialogFooter>
            <div className="flex-1 text-xs"><span className="text-muted-foreground">Auto-invoice:</span> <span className="font-semibold text-emerald-600">{formatRs((Number(form.fee) || 0) + Math.round((Number(form.fee) || 0) * 0.13))} (incl. 13% VAT)</span></div>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Log + Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}