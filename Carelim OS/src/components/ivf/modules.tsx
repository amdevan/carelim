"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { Download, Plus, Search, Activity, FlaskConical, Snowflake, Baby, HeartPulse, FileText, Users, Package, Microscope, Syringe } from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ============== Couple Management (Fertility Assessments) ==============
interface FertilityAssessment { id: string; patientId: string; assessmentDate: string; femaleWorkup: string | null; maleWorkup: string | null; diagnosis: string | null; amh: number | null; fsh: number | null; lh: number | null; e2: number | null; afc: number | null; bmi: number | null; prognosis: string | null; recommendations: string | null; doctorId: string | null }

export function IvfAssessments() {
  const [refresh, setRefresh] = useState(0);
  const { data: assessments, loading } = useFetch<FertilityAssessment[]>(refresh ? `/api/fertility-assessments?_r=${refresh}` : "/api/fertility-assessments");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", diagnosis: "", amh: "", fsh: "", lh: "", e2: "", afc: "", bmi: "", prognosis: "good" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<FertilityAssessment>(assessments || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => {
    setSaving(true);
    try { await fetchAPI("/api/fertility-assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amh: Number(form.amh)||0, fsh: Number(form.fsh)||0, lh: Number(form.lh)||0, e2: Number(form.e2)||0, afc: Number(form.afc)||0, bmi: Number(form.bmi)||0 }) }); toast.success("Assessment created"); setAddOpen(false); setRefresh(r=>r+1); }
    catch { toast.error("Failed"); } finally { setSaving(false); }
  };
  const PROGNOSIS_COLORS: Record<string,string> = { good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", fair: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", poor: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Couple Management</h3><p className="text-sm text-muted-foreground">{assessments?.length||0} fertility assessments</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if(assessments?.length){ exportToCSV("fertility-assessments",["Patient","Date","AMH","FSH","LH","E2","AFC","BMI","Prognosis","Diagnosis"],assessments.map(a=>[a.patientId,formatDate(a.assessmentDate),a.amh||"",a.fsh||"",a.lh||"",a.e2||"",a.afc||"",a.bmi||"",a.prognosis||"",a.diagnosis||""])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Assessment</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Assessments" value={assessments?.length||0} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Good Prognosis" value={(assessments||[]).filter(a=>a.prognosis==="good").length} icon={HeartPulse} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Fair Prognosis" value={(assessments||[]).filter(a=>a.prognosis==="fair").length} icon={Activity} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Poor Prognosis" value={(assessments||[]).filter(a=>a.prognosis==="poor").length} icon={Activity} accent="from-rose-500 to-rose-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(assessments||[]).length===0 ? <EmptyState icon={Activity} title="No assessments" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Patient ID</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase text-right">AMH</TableHead>
            <TableHead className="text-[11px] uppercase text-right">FSH</TableHead>
            <TableHead className="text-[11px] uppercase text-right">AFC</TableHead>
            <TableHead className="text-[11px] uppercase text-right">BMI</TableHead>
            <TableHead className="text-[11px] uppercase">Prognosis</TableHead>
            <TableHead className="text-[11px] uppercase">Diagnosis</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(a => (
              <TableRow key={a.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{a.patientId.substring(0,12)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(a.assessmentDate)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{a.amh||"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{a.fsh||"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{a.afc||"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{a.bmi||"—"}</TableCell>
                <TableCell>{a.prognosis && <Badge className={`text-[9px] ${PROGNOSIS_COLORS[a.prognosis]||""}`}>{a.prognosis}</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.diagnosis||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Fertility Assessment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Patient ID</Label><Input value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})} placeholder="Patient ID" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>AMH</Label><Input type="number" step="0.01" value={form.amh} onChange={e=>setForm({...form,amh:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>FSH</Label><Input type="number" step="0.01" value={form.fsh} onChange={e=>setForm({...form,fsh:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>LH</Label><Input type="number" step="0.01" value={form.lh} onChange={e=>setForm({...form,lh:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>E2</Label><Input type="number" step="0.01" value={form.e2} onChange={e=>setForm({...form,e2:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>AFC</Label><Input type="number" value={form.afc} onChange={e=>setForm({...form,afc:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>BMI</Label><Input type="number" step="0.1" value={form.bmi} onChange={e=>setForm({...form,bmi:e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Prognosis</Label><Select value={form.prognosis} onValueChange={v=>setForm({...form,prognosis:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})} placeholder="PCOS, Male factor, etc." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Treatment Protocols ==============
interface Protocol { id: string; name: string; code: string; description: string | null; type: string; duration: number; isActive: boolean }

export function IvfProtocols() {
  const { data: protocols, loading } = useFetch<Protocol[]>("/api/ivf-protocols");
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const TYPE_COLORS: Record<string,string> = { antagonist: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", agonist: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", natural: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", mild: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h3 className="text-lg font-bold">Treatment Protocols</h3><p className="text-sm text-muted-foreground">{protocols?.length||0} protocols</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(protocols||[]).map((p,i) => (
          <motion.div key={p.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.04 }}>
            <Card className="card-hover"><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center"><FileText className="w-4 h-4 text-teal-600" /></div>
                <Badge className={`text-[9px] ${TYPE_COLORS[p.type]||""}`}>{p.type}</Badge>
              </div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.code} · {p.duration} days</p>
              <p className="text-xs text-muted-foreground mt-1">{p.description||"Treatment protocol"}</p>
              <div className="mt-2 pt-2 border-t flex items-center justify-between">
                <Badge className={`text-[9px] ${p.isActive?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300":"bg-gray-100 text-gray-600"}`}>{p.isActive?"Active":"Inactive"}</Badge>
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={()=>toast.info("Edit protocol")}>Edit</Button>
              </div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============== Follicular Monitoring ==============
interface FollicularRecord { id: string; cycleId: string; monitoringDate: string; day: number; endometrium: number | null; e2: number | null; lh: number | null; p4: number | null; notes: string | null }

export function IvfFollicular() {
  const [refresh, setRefresh] = useState(0);
  const { data: records, loading } = useFetch<FollicularRecord[]>(refresh ? `/api/follicular-monitoring?_r=${refresh}` : "/api/follicular-monitoring");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", day: "1", endometrium: "", e2: "", lh: "", p4: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<FollicularRecord>(records || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/follicular-monitoring",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,day:Number(form.day),endometrium:Number(form.endometrium)||0,e2:Number(form.e2)||0,lh:Number(form.lh)||0,p4:Number(form.p4)||0})}); toast.success("Record added"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Follicular Monitoring</h3><p className="text-sm text-muted-foreground">{records?.length||0} records</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Record</Button>
      </div>
      <Card><CardContent className="p-0">
        {(records||[]).length===0 ? <EmptyState icon={Activity} title="No monitoring records" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Cycle ID</TableHead>
            <TableHead className="text-[11px] uppercase">Day</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Endometrium</TableHead>
            <TableHead className="text-[11px] uppercase text-right">E2</TableHead>
            <TableHead className="text-[11px] uppercase text-right">LH</TableHead>
            <TableHead className="text-[11px] uppercase text-right">P4</TableHead>
            <TableHead className="text-[11px] uppercase">Notes</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(r => (
              <TableRow key={r.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{r.cycleId.substring(0,12)}…</TableCell>
                <TableCell><Badge className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">Day {r.day}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(r.monitoringDate)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.endometrium?`${r.endometrium}mm`:"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.e2||"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.lh||"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.p4||"—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.notes||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Follicular Monitoring Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Day</Label><Input type="number" value={form.day} onChange={e=>setForm({...form,day:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Endometrium (mm)</Label><Input type="number" step="0.1" value={form.endometrium} onChange={e=>setForm({...form,endometrium:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>E2</Label><Input type="number" value={form.e2} onChange={e=>setForm({...form,e2:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>LH</Label><Input type="number" step="0.1" value={form.lh} onChange={e=>setForm({...form,lh:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>P4</Label><Input type="number" step="0.1" value={form.p4} onChange={e=>setForm({...form,p4:e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="h-16" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Egg Retrieval (OPU) ==============
interface EggRetrieval { id: string; cycleId: string; opuDate: string; folliclesPunctured: number; oocytesRetrieved: number; matureOocytes: number; immatureOocytes: number; atreticOocytes: number; embryologist: string | null; complications: string | null; notes: string | null }

export function IvfOPU() {
  const [refresh, setRefresh] = useState(0);
  const { data: retrievals, loading } = useFetch<EggRetrieval[]>(refresh ? `/api/egg-retrievals?_r=${refresh}` : "/api/egg-retrievals");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", folliclesPunctured: "", oocytesRetrieved: "", matureOocytes: "", immatureOocytes: "", atreticOocytes: "", embryologist: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<EggRetrieval>(retrievals || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/egg-retrievals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,folliclesPunctured:Number(form.folliclesPunctured)||0,oocytesRetrieved:Number(form.oocytesRetrieved)||0,matureOocytes:Number(form.matureOocytes)||0,immatureOocytes:Number(form.immatureOocytes)||0,atreticOocytes:Number(form.atreticOocytes)||0})}); toast.success("OPU record created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Egg Retrieval (OPU)</h3><p className="text-sm text-muted-foreground">{retrievals?.length||0} procedures</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New OPU</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total OPU" value={retrievals?.length||0} icon={Syringe} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Total Oocytes" value={(retrievals||[]).reduce((s,r)=>s+r.oocytesRetrieved,0)} icon={FlaskConical} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Mature" value={(retrievals||[]).reduce((s,r)=>s+r.matureOocytes,0)} icon={Activity} accent="from-violet-500 to-purple-600" index={2} />
        <KpiCard label="Avg per OPU" value={retrievals?.length?Math.round((retrievals||[]).reduce((s,r)=>s+r.oocytesRetrieved,0)/retrievals.length):0} icon={Activity} accent="from-cyan-500 to-cyan-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(retrievals||[]).length===0 ? <EmptyState icon={Syringe} title="No OPU records" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Cycle ID</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Follicles</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Oocytes</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Mature</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Immature</TableHead>
            <TableHead className="text-[11px] uppercase">Embryologist</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(r => (
              <TableRow key={r.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{r.cycleId.substring(0,12)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(r.opuDate)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.folliclesPunctured}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums text-teal-600">{r.oocytesRetrieved}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-emerald-600">{r.matureOocytes}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-amber-600">{r.immatureOocytes}</TableCell>
                <TableCell className="text-xs">{r.embryologist||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Egg Retrieval (OPU)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Follicles Punctured</Label><Input type="number" value={form.folliclesPunctured} onChange={e=>setForm({...form,folliclesPunctured:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Oocytes Retrieved</Label><Input type="number" value={form.oocytesRetrieved} onChange={e=>setForm({...form,oocytesRetrieved:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Mature</Label><Input type="number" value={form.matureOocytes} onChange={e=>setForm({...form,matureOocytes:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Immature</Label><Input type="number" value={form.immatureOocytes} onChange={e=>setForm({...form,immatureOocytes:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Atretic</Label><Input type="number" value={form.atreticOocytes} onChange={e=>setForm({...form,atreticOocytes:e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Embryologist</Label><Input value={form.embryologist} onChange={e=>setForm({...form,embryologist:e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Andrology (Semen Processing) ==============
interface SemenRecord { id: string; cycleId: string | null; patientId: string | null; collectionDate: string; volume: number | null; concentration: number | null; motility: number | null; morphology: number | null; processingMethod: string | null; postWashConcentration: number | null; viableCount: number | null; notes: string | null }

export function IvfAndrology() {
  const [refresh, setRefresh] = useState(0);
  const { data: records, loading } = useFetch<SemenRecord[]>(refresh ? `/api/semen-processing?_r=${refresh}` : "/api/semen-processing");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", volume: "", concentration: "", motility: "", morphology: "", processingMethod: "swim-up", viableCount: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<SemenRecord>(records || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/semen-processing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,volume:Number(form.volume)||0,concentration:Number(form.concentration)||0,motility:Number(form.motility)||0,morphology:Number(form.morphology)||0,postWashConcentration:0,viableCount:Number(form.viableCount)||0})}); toast.success("Record created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Andrology Lab</h3><p className="text-sm text-muted-foreground">{records?.length||0} semen analyses</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Analysis</Button>
      </div>
      <Card><CardContent className="p-0">
        {(records||[]).length===0 ? <EmptyState icon={Microscope} title="No semen analyses" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Volume</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Conc.</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Motility</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Morphology</TableHead>
            <TableHead className="text-[11px] uppercase">Method</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Viable</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(r => (
              <TableRow key={r.id} className="table-row-hover">
                <TableCell className="text-xs text-muted-foreground">{formatDate(r.collectionDate)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.volume?`${r.volume}ml`:"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.concentration?`${r.concentration}M/ml`:"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.motility?`${r.motility}%`:"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.morphology?`${r.morphology}%`:"—"}</TableCell>
                <TableCell><Badge className="text-[9px] bg-muted text-muted-foreground">{r.processingMethod||"—"}</Badge></TableCell>
                <TableCell className="text-right text-sm tabular-nums">{r.viableCount||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Semen Analysis</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID (optional)</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Volume (ml)</Label><Input type="number" step="0.1" value={form.volume} onChange={e=>setForm({...form,volume:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Concentration (M/ml)</Label><Input type="number" value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Motility (%)</Label><Input type="number" value={form.motility} onChange={e=>setForm({...form,motility:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Morphology (%)</Label><Input type="number" value={form.morphology} onChange={e=>setForm({...form,morphology:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Processing Method</Label><Select value={form.processingMethod} onValueChange={v=>setForm({...form,processingMethod:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="swim-up">Swim-up</SelectItem><SelectItem value="density gradient">Density Gradient</SelectItem><SelectItem value="icsi">ICSI</SelectItem><SelectItem value="pgt">PGT</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Viable Count</Label><Input type="number" value={form.viableCount} onChange={e=>setForm({...form,viableCount:e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Embryology Lab ==============
interface Embryo { id: string; cycleId: string; embryoNo: number; day: number; cellCount: number | null; grade: string | null; quality: string | null; status: string; frozenDate: string | null; notes: string | null }

export function IvfEmbryology() {
  const [refresh, setRefresh] = useState(0);
  const { data: embryos, loading } = useFetch<Embryo[]>(refresh ? `/api/embryos?_r=${refresh}` : "/api/embryos");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", embryoNo: "1", day: "3", cellCount: "8", grade: "1AA", quality: "good", notes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<Embryo>(embryos || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/embryos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,embryoNo:Number(form.embryoNo),day:Number(form.day),cellCount:Number(form.cellCount)||0})}); toast.success("Embryo record created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const STATUS_COLORS: Record<string,string> = { cultured: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300", frozen: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", transferred: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", discarded: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  const QUALITY_COLORS: Record<string,string> = { excellent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", good: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", fair: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", poor: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Embryology Laboratory</h3><p className="text-sm text-muted-foreground">{embryos?.length||0} embryos</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Embryo</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Embryos" value={embryos?.length||0} icon={Microscope} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Frozen" value={(embryos||[]).filter(e=>e.status==="frozen").length} icon={Snowflake} accent="from-cyan-500 to-cyan-600" index={1} />
        <KpiCard label="Transferred" value={(embryos||[]).filter(e=>e.status==="transferred").length} icon={Baby} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Discarded" value={(embryos||[]).filter(e=>e.status==="discarded").length} icon={Activity} accent="from-rose-500 to-rose-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(embryos||[]).length===0 ? <EmptyState icon={Microscope} title="No embryo records" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Cycle ID</TableHead>
            <TableHead className="text-[11px] uppercase">#</TableHead>
            <TableHead className="text-[11px] uppercase">Day</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Cells</TableHead>
            <TableHead className="text-[11px] uppercase">Grade</TableHead>
            <TableHead className="text-[11px] uppercase">Quality</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(e => (
              <TableRow key={e.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{e.cycleId.substring(0,12)}…</TableCell>
                <TableCell className="text-sm font-bold">#{e.embryoNo}</TableCell>
                <TableCell><Badge className="text-[9px] bg-muted text-muted-foreground">Day {e.day}</Badge></TableCell>
                <TableCell className="text-right text-sm tabular-nums">{e.cellCount||"—"}</TableCell>
                <TableCell className="text-sm font-mono font-semibold">{e.grade||"—"}</TableCell>
                <TableCell>{e.quality && <Badge className={`text-[9px] ${QUALITY_COLORS[e.quality]||""}`}>{e.quality}</Badge>}</TableCell>
                <TableCell><Badge className={`text-[9px] ${STATUS_COLORS[e.status]||""}`}>{e.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Embryo Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Embryo #</Label><Input type="number" value={form.embryoNo} onChange={e=>setForm({...form,embryoNo:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Day</Label><Select value={form.day} onValueChange={v=>setForm({...form,day:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Day 1</SelectItem><SelectItem value="3">Day 3</SelectItem><SelectItem value="5">Day 5</SelectItem><SelectItem value="6">Day 6</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Cells</Label><Input type="number" value={form.cellCount} onChange={e=>setForm({...form,cellCount:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Grade</Label><Input value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})} placeholder="1AA, 2BB" /></div>
              <div className="space-y-1.5"><Label>Quality</Label><Select value={form.quality} onValueChange={v=>setForm({...form,quality:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="poor">Poor</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Cryobank ==============
interface CryoItem { id: string; barcode: string; type: string; tankNumber: string | null; canisterPosition: string | null; freezeDate: string; expiryDate: string | null; status: string; quantity: number; notes: string | null }

export function IvfCryobank() {
  const [refresh, setRefresh] = useState(0);
  const { data: items, loading } = useFetch<CryoItem[]>(refresh ? `/api/cryobank?_r=${refresh}` : "/api/cryobank");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: "embryo", tankNumber: "Tank-A", canisterPosition: "1", quantity: "1", notes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<CryoItem>(items || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/cryobank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,quantity:Number(form.quantity)||1})}); toast.success("Cryobank item created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const TYPE_ICONS: Record<string, typeof Snowflake> = { embryo: Baby, oocyte: FlaskConical, sperm: Microscope };
  const STATUS_COLORS: Record<string,string> = { stored: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300", thawed: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", transferred: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", discarded: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Cryobank Storage</h3><p className="text-sm text-muted-foreground">{items?.length||0} items stored</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> Store Item</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Items" value={items?.length||0} icon={Snowflake} accent="from-cyan-500 to-cyan-600" index={0} />
        <KpiCard label="Stored" value={(items||[]).filter(i=>i.status==="stored").length} icon={Snowflake} accent="from-teal-500 to-teal-600" index={1} />
        <KpiCard label="Embryos" value={(items||[]).filter(i=>i.type==="embryo").length} icon={Baby} accent="from-violet-500 to-purple-600" index={2} />
        <KpiCard label="Sperm" value={(items||[]).filter(i=>i.type==="sperm").length} icon={Microscope} accent="from-amber-500 to-orange-500" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(items||[]).length===0 ? <EmptyState icon={Snowflake} title="Cryobank empty" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Barcode</TableHead>
            <TableHead className="text-[11px] uppercase">Type</TableHead>
            <TableHead className="text-[11px] uppercase">Location</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Qty</TableHead>
            <TableHead className="text-[11px] uppercase">Freeze Date</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(item => {
              const Icon = TYPE_ICONS[item.type] || Snowflake;
              return (
                <TableRow key={item.id} className="table-row-hover">
                  <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                  <TableCell><div className="flex items-center gap-1.5"><Icon className="w-3 h-3 text-muted-foreground" /><span className="text-xs capitalize">{item.type}</span></div></TableCell>
                  <TableCell className="text-xs">{item.tankNumber} / {item.canisterPosition}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(item.freezeDate)}</TableCell>
                  <TableCell><Badge className={`text-[9px] ${STATUS_COLORS[item.status]||""}`}>{item.status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Store in Cryobank</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Type</Label><Select value={form.type} onValueChange={v=>setForm({...form,type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="embryo">Embryo</SelectItem><SelectItem value="oocyte">Oocyte</SelectItem><SelectItem value="sperm">Sperm</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tank</Label><Input value={form.tankNumber} onChange={e=>setForm({...form,tankNumber:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Canister</Label><Input value={form.canisterPosition} onChange={e=>setForm({...form,canisterPosition:e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Store"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Embryo Transfer ==============
interface Transfer { id: string; cycleId: string; transferDate: string; transferType: string; embryosTransferred: number; difficulty: string | null; notes: string | null }

export function IvfTransfer() {
  const [refresh, setRefresh] = useState(0);
  const { data: transfers, loading } = useFetch<Transfer[]>(refresh ? `/api/embryo-transfers?_r=${refresh}` : "/api/embryo-transfers");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", transferType: "fresh", embryosTransferred: "1", difficulty: "easy", notes: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<Transfer>(transfers || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/embryo-transfers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,embryosTransferred:Number(form.embryosTransferred)||1})}); toast.success("Transfer recorded"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const TYPE_COLORS: Record<string,string> = { fresh: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300", frozen: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300", donor: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Embryo Transfer</h3><p className="text-sm text-muted-foreground">{transfers?.length||0} transfers</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Transfer</Button>
      </div>
      <Card><CardContent className="p-0">
        {(transfers||[]).length===0 ? <EmptyState icon={Baby} title="No embryo transfers" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Cycle ID</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase">Type</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Embryos</TableHead>
            <TableHead className="text-[11px] uppercase">Difficulty</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(t => (
              <TableRow key={t.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{t.cycleId.substring(0,12)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(t.transferDate)}</TableCell>
                <TableCell><Badge className={`text-[9px] ${TYPE_COLORS[t.transferType]||""}`}>{t.transferType}</Badge></TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">{t.embryosTransferred}</TableCell>
                <TableCell className="text-xs">{t.difficulty||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Embryo Transfer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label><Select value={form.transferType} onValueChange={v=>setForm({...form,transferType:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fresh">Fresh</SelectItem><SelectItem value="frozen">Frozen</SelectItem><SelectItem value="donor">Donor</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Embryos</Label><Input type="number" value={form.embryosTransferred} onChange={e=>setForm({...form,embryosTransferred:e.target.value})} /></div>
            </div>
            <div className="space-y-1.5"><Label>Difficulty</Label><Select value={form.difficulty} onValueChange={v=>setForm({...form,difficulty:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="difficult">Difficult</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Pregnancy Tracking ==============
interface Pregnancy { id: string; cycleId: string; testDate: string; betaHcg: number | null; result: string; sacVisible: boolean; heartbeat: boolean; fetalCount: number; gestationalAge: number; edd: string | null; status: string; complications: string | null }

export function IvfPregnancy() {
  const [refresh, setRefresh] = useState(0);
  const { data: pregnancies, loading } = useFetch<Pregnancy[]>(refresh ? `/api/pregnancy-tracking?_r=${refresh}` : "/api/pregnancy-tracking");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ cycleId: "", betaHcg: "", result: "pending", sacVisible: false, heartbeat: false, fetalCount: "0", gestationalAge: "0" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<Pregnancy>(pregnancies || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/pregnancy-tracking",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,betaHcg:Number(form.betaHcg)||0,fetalCount:Number(form.fetalCount)||0,gestationalAge:Number(form.gestationalAge)||0})}); toast.success("Pregnancy record created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const RESULT_COLORS: Record<string,string> = { positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", negative: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Pregnancy Tracking</h3><p className="text-sm text-muted-foreground">{pregnancies?.length||0} records</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Record</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total" value={pregnancies?.length||0} icon={HeartPulse} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Positive" value={(pregnancies||[]).filter(p=>p.result==="positive").length} icon={Baby} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Heartbeat" value={(pregnancies||[]).filter(p=>p.heartbeat).length} icon={HeartPulse} accent="from-rose-500 to-rose-600" index={2} />
        <KpiCard label="Ongoing" value={(pregnancies||[]).filter(p=>p.status==="ongoing").length} icon={Activity} accent="from-violet-500 to-purple-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(pregnancies||[]).length===0 ? <EmptyState icon={HeartPulse} title="No pregnancy records" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Cycle ID</TableHead>
            <TableHead className="text-[11px] uppercase">Test Date</TableHead>
            <TableHead className="text-[11px] uppercase text-right">βhCG</TableHead>
            <TableHead className="text-[11px] uppercase">Result</TableHead>
            <TableHead className="text-[11px] uppercase text-center">Sac</TableHead>
            <TableHead className="text-[11px] uppercase text-center">Heartbeat</TableHead>
            <TableHead className="text-[11px] uppercase text-right">GA (wk)</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(p => (
              <TableRow key={p.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{p.cycleId.substring(0,12)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.testDate)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{p.betaHcg||"—"}</TableCell>
                <TableCell><Badge className={`text-[9px] ${RESULT_COLORS[p.result]||""}`}>{p.result}</Badge></TableCell>
                <TableCell className="text-center">{p.sacVisible?"✓":"—"}</TableCell>
                <TableCell className="text-center">{p.heartbeat?"✓":"—"}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">{p.gestationalAge||"0"}</TableCell>
                <TableCell><Badge className={`text-[9px] ${statusColors[p.status]||"bg-gray-100"}`}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pregnancy Tracking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Cycle ID</Label><Input value={form.cycleId} onChange={e=>setForm({...form,cycleId:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>βhCG</Label><Input type="number" value={form.betaHcg} onChange={e=>setForm({...form,betaHcg:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Result</Label><Select value={form.result} onValueChange={v=>setForm({...form,result:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="negative">Negative</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Sac Visible</Label><Select value={form.sacVisible?"true":"false"} onValueChange={v=>setForm({...form,sacVisible:v==="true"})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Heartbeat</Label><Select value={form.heartbeat?"true":"false"} onValueChange={v=>setForm({...form,heartbeat:v==="true"})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Fetal Count</Label><Input type="number" value={form.fetalCount} onChange={e=>setForm({...form,fetalCount:e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Donor Management ==============
interface Donor { id: string; donorCode: string; type: string; anonymous: boolean; age: number | null; bloodGroup: string | null; height: number | null; weight: number | null; education: string | null; screeningStatus: string; status: string }

export function IvfDonors() {
  const [refresh, setRefresh] = useState(0);
  const { data: donors, loading } = useFetch<Donor[]>(refresh ? `/api/ivf-donors?_r=${refresh}` : "/api/ivf-donors");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ type: "egg", anonymous: true, age: "", bloodGroup: "O+", height: "", weight: "", education: "" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<Donor>(donors || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/ivf-donors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,age:Number(form.age)||0,height:Number(form.height)||0,weight:Number(form.weight)||0})}); toast.success("Donor created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const TYPE_COLORS: Record<string,string> = { egg: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", sperm: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300", embryo: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" };
  const SCREENING_COLORS: Record<string,string> = { cleared: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Donor Management</h3><p className="text-sm text-muted-foreground">{donors?.length||0} donors</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Donor</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Donors" value={donors?.length||0} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Egg Donors" value={(donors||[]).filter(d=>d.type==="egg").length} icon={Users} accent="from-rose-500 to-rose-600" index={1} />
        <KpiCard label="Sperm Donors" value={(donors||[]).filter(d=>d.type==="sperm").length} icon={Users} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Cleared" value={(donors||[]).filter(d=>d.screeningStatus==="cleared").length} icon={HeartPulse} accent="from-emerald-500 to-emerald-600" index={3} />
      </div>
      <Card><CardContent className="p-0">
        {(donors||[]).length===0 ? <EmptyState icon={Users} title="No donors" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Code</TableHead>
            <TableHead className="text-[11px] uppercase">Type</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Age</TableHead>
            <TableHead className="text-[11px] uppercase">Blood</TableHead>
            <TableHead className="text-[11px] uppercase">Education</TableHead>
            <TableHead className="text-[11px] uppercase">Screening</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(d => (
              <TableRow key={d.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{d.donorCode}</TableCell>
                <TableCell><Badge className={`text-[9px] ${TYPE_COLORS[d.type]||""}`}>{d.type}</Badge></TableCell>
                <TableCell className="text-right text-sm tabular-nums">{d.age||"—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200">{d.bloodGroup||"—"}</Badge></TableCell>
                <TableCell className="text-xs">{d.education||"—"}</TableCell>
                <TableCell><Badge className={`text-[9px] ${SCREENING_COLORS[d.screeningStatus]||""}`}>{d.screeningStatus}</Badge></TableCell>
                <TableCell><Badge className={`text-[9px] ${d.status==="active"?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300":"bg-gray-100 text-gray-600"}`}>{d.status}</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async()=>{ await fetchAPI(`/api/ivf-donors/${d.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:d.status==="active"?"retired":"active"})}); toast.success("Status updated"); setRefresh(r=>r+1); }}>{d.status==="active"?"Retire":"Activate"}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Donor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Type</Label><Select value={form.type} onValueChange={v=>setForm({...form,type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="egg">Egg</SelectItem><SelectItem value="sperm">Sperm</SelectItem><SelectItem value="embryo">Embryo</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Anonymous</Label><Select value={form.anonymous?"true":"false"} onValueChange={v=>setForm({...form,anonymous:v==="true"})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Age</Label><Input type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Blood</Label><Select value={form.bloodGroup} onValueChange={v=>setForm({...form,bloodGroup:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Height</Label><Input type="number" value={form.height} onChange={e=>setForm({...form,height:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Weight</Label><Input type="number" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} /></div>
              <div className="space-y-1.5"><Label>Education</Label><Input value={form.education} onChange={e=>setForm({...form,education:e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Consent Forms ==============
interface Consent { id: string; consentNo: string; patientId: string; type: string; title: string; status: string; signedBy: string | null; signedDate: string | null }

export function IvfConsents() {
  const [refresh, setRefresh] = useState(0);
  const { data: consents, loading } = useFetch<Consent[]>(refresh ? `/api/ivf-consents?_r=${refresh}` : "/api/ivf-consents");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", type: "ivf_treatment", title: "IVF Treatment Consent" });
  const [saving, setSaving] = useState(false);
  const pagination = usePagination<Consent>(consents || [], 10);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  const handleCreate = async () => { setSaving(true); try { await fetchAPI("/api/ivf-consents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); toast.success("Consent created"); setAddOpen(false); setRefresh(r=>r+1); } catch { toast.error("Failed"); } finally { setSaving(false); } };
  const handleSign = async (c: Consent) => { await fetchAPI(`/api/ivf-consents/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"signed",signedBy:"Patient",signedDate:new Date().toISOString()})}); toast.success("Consent signed"); setRefresh(r=>r+1); };
  const STATUS_COLORS: Record<string,string> = { signed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", declined: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">Consent Forms</h3><p className="text-sm text-muted-foreground">{consents?.length||0} consents · {(consents||[]).filter(c=>c.status==="pending").length} pending</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={()=>setAddOpen(true)}><Plus className="w-4 h-4" /> New Consent</Button>
      </div>
      <Card><CardContent className="p-0">
        {(consents||[]).length===0 ? <EmptyState icon={FileText} title="No consent forms" /> : (
          <><Table><TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Consent No</TableHead>
            <TableHead className="text-[11px] uppercase">Title</TableHead>
            <TableHead className="text-[11px] uppercase">Type</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
            <TableHead className="text-[11px] uppercase">Signed By</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {pagination.paged.map(c => (
              <TableRow key={c.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{c.consentNo}</TableCell>
                <TableCell className="text-sm">{c.title}</TableCell>
                <TableCell><Badge className="text-[9px] bg-muted text-muted-foreground">{c.type.replace(/_/g," ")}</Badge></TableCell>
                <TableCell><Badge className={`text-[9px] ${STATUS_COLORS[c.status]||""}`}>{c.status}</Badge></TableCell>
                <TableCell className="text-xs">{c.signedBy||"—"}</TableCell>
                <TableCell className="text-right">{c.status==="pending" && <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700" onClick={()=>handleSign(c)}>Sign</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Consent Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Patient ID</Label><Input value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})} /></div>
            <div className="space-y-1.5"><Label>Type</Label><Select value={form.type} onValueChange={v=>setForm({...form,type:v,title:`${v.replace(/_/g," ")} Consent`})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ivf_treatment">IVF Treatment</SelectItem><SelectItem value="icsi">ICSI</SelectItem><SelectItem value="embryo_freezing">Embryo Freezing</SelectItem><SelectItem value="donor">Donor</SelectItem><SelectItem value="surrogacy">Surrogacy</SelectItem><SelectItem value="pgd">PGD</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button><Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate}>{saving?"Saving…":"Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== IVF Packages ==============
interface IVFPackage { id: string; name: string; code: string; description: string | null; totalCost: number; isActive: boolean }

export function IvfPackagesView() {
  const { data: packages, loading } = useFetch<IVFPackage[]>("/api/ivf-packages");
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div><h3 className="text-lg font-bold">IVF Packages</h3><p className="text-sm text-muted-foreground">{packages?.length||0} packages</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(packages||[]).map((p,i) => (
          <motion.div key={p.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.04 }}>
            <Card className="card-hover"><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center"><Package className="w-4 h-4 text-teal-600" /></div>
                <Badge className={`text-[9px] ${p.isActive?"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300":"bg-gray-100 text-gray-600"}`}>{p.isActive?"Active":"Inactive"}</Badge>
              </div>
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.code}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.description||"IVF package"}</p>
              <p className="text-lg font-bold tabular-nums mt-2">{formatRs(p.totalCost)}</p>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============== IVF Reports (uses dashboard data) ==============
export function IvfReports() {
  const { data, loading } = useFetch<any>("/api/ivf-dashboard");
  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h3 className="text-lg font-bold">IVF Reports</h3><p className="text-sm text-muted-foreground">Analytics & success metrics</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={()=>{ exportToCSV("ivf-report",["Metric","Value"],Object.entries(data.kpis).map(([k,v])=>[k,String(v)])); toast.success("Exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Cycles" value={data.kpis.totalCycles} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Success Rate" value={`${data.kpis.successRate}%`} icon={TrendingUp} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Positive Pregnancies" value={data.kpis.positivePregnancies} icon={Baby} accent="from-violet-500 to-purple-600" index={2} />
        <KpiCard label="Frozen Embryos" value={data.kpis.frozenEmbryos} icon={Snowflake} accent="from-cyan-500 to-cyan-600" index={3} />
      </div>
      <Card className="card-hover"><CardHeader className="pb-2"><CardTitle className="text-base">Cycle Status Breakdown</CardTitle></CardHeader><CardContent className="space-y-2">
        {(data.statusCounts as Record<string, number> ? Object.entries(data.statusCounts as Record<string, number>) : []).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-sm font-medium capitalize">{status.replace(/_/g," ")}</span>
            <span className="text-sm font-bold tabular-nums">{String(count)}</span>
          </div>
        ))}
      </CardContent></Card>
      <Card className="card-hover"><CardHeader className="pb-2"><CardTitle className="text-base">Treatment Protocols</CardTitle></CardHeader><CardContent className="space-y-2">
        {data.protocols.map((p:any) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div><span className="text-sm font-medium">{p.name}</span><span className="text-xs text-muted-foreground ml-2">{p.code} · {p.type} · {p.duration}d</span></div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}

// import TrendingUp at top — add to imports
import { TrendingUp } from "lucide-react";
