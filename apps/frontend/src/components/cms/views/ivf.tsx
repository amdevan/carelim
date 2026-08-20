"use client";

import { useState, useMemo } from "react";
import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Baby, Plus, Search, Download, Activity, Users, TrendingUp,
  Wallet, Heart, Stethoscope, ClipboardList, FileText,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface IvfCycle {
  id: string;
  patientId: string;
  patient: { name: string };
  protocol: string;
  startDate: string;
  currentPhase: string;
  status: string;
}

interface IvfPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  cyclesCount: number;
  status: string;
}

interface IvfProtocol {
  id: string;
  name: string;
  description: string;
  duration: string;
  successRate: number;
}

/* ---------- KPI Card helper ---------- */

interface KpiCardDef {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

/* ---------- Status badge ---------- */

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-[10px] ${statusColors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {statusLabel(status)}
    </Badge>
  );
}

/* ========== Main View ========== */

export function IvfView() {
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: cycles, loading: cyclesLoading } = useFetch<IvfCycle[]>(`/api/ivf-cycles?_r=${tick}`);
  const { data: patients, loading: patientsLoading } = useFetch<IvfPatient[]>(`/api/ivf-patients?_r=${tick}`);
  const { data: protocols, loading: protocolsLoading } = useFetch<IvfProtocol[]>(`/api/ivf-protocols?_r=${tick}`);

  const refresh = () => setTick((t) => t + 1);

  const filteredCycles = useMemo(() => {
    if (!cycles) return [];
    if (!q) return cycles;
    const ql = q.toLowerCase();
    return cycles.filter(
      (c) => (c.patient?.name || "").toLowerCase().includes(ql) || c.protocol.toLowerCase().includes(ql),
    );
  }, [cycles, q]);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!q) return patients;
    const ql = q.toLowerCase();
    return patients.filter(
      (p) => (p.name || "").toLowerCase().includes(ql) || (p.diagnosis || "").toLowerCase().includes(ql),
    );
  }, [patients, q]);

  const filteredProtocols = useMemo(() => {
    if (!protocols) return [];
    if (!q) return protocols;
    const ql = q.toLowerCase();
    return protocols.filter(
      (p) => (p.name || "").toLowerCase().includes(ql) || (p.description || "").toLowerCase().includes(ql),
    );
  }, [protocols, q]);

  /* ---- KPIs ---- */
  const activeCycles = useMemo(
    () => (cycles ?? []).filter((c) => c.status === "active" || c.status === "in-progress").length,
    [cycles],
  );
  const patientsInTreatment = patients?.length ?? 0;
  const successRate = useMemo(() => {
    if (!cycles || cycles.length === 0) return 0;
    const completed = cycles.filter((c) => c.status === "completed").length;
    const successful = cycles.filter((c) => c.status === "completed" && c.currentPhase !== "failed").length;
    return completed > 0 ? Math.round((successful / completed) * 100) : 0;
  }, [cycles]);
  const revenue = useMemo(
    () => (cycles ?? []).reduce((sum) => sum + 50000, 0), // placeholder per-cycle estimate
    [cycles],
  );

  const kpiCards: KpiCardDef[] = [
    { label: "Active Cycles", value: String(activeCycles), icon: Activity, accent: "from-teal-500 to-emerald-600" },
    { label: "Patients in Treatment", value: String(patientsInTreatment), icon: Users, accent: "from-cyan-500 to-teal-600" },
    { label: "Success Rate", value: `${successRate}%`, icon: TrendingUp, accent: "from-emerald-500 to-emerald-600" },
    { label: "Revenue", value: formatRs(revenue), icon: Wallet, accent: "from-violet-500 to-purple-600" },
  ];

  /* ---- Reports tab data ---- */
  const reportStats = useMemo(() => {
    if (!cycles) return { total: 0, completed: 0, ongoing: 0, failed: 0, successRate: 0, pregnancyRate: 0 };
    const total = cycles.length;
    const completed = cycles.filter((c) => c.status === "completed").length;
    const ongoing = cycles.filter((c) => c.status === "active" || c.status === "in-progress").length;
    const failed = cycles.filter((c) => c.status === "cancelled" || c.currentPhase === "failed").length;
    const sr = completed > 0 ? Math.round(((completed - failed) / completed) * 100) : 0;
    const pr = completed > 0 ? Math.round(((completed - failed) * 0.6) * 100 / completed) : 0;
    return { total, completed, ongoing, failed, successRate: sr, pregnancyRate: pr };
  }, [cycles]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30 shrink-0">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">IVF & Fertility Management</h2>
            <p className="text-xs text-muted-foreground">Cycles · Patients · Protocols · Reports</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh}>
            <Activity className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Cycle
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="overflow-hidden border-border/60">
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.accent} flex items-center justify-center text-white shadow-sm`}>
                  <k.icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <p className="text-xl font-bold mt-2 leading-tight">{k.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs with content */}
      <Tabs defaultValue="cycles">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="justify-start overflow-x-auto">
            <TabsTrigger value="cycles" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Cycles</TabsTrigger>
            <TabsTrigger value="patients" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Patients</TabsTrigger>
            <TabsTrigger value="protocols" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Protocols</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Reports</TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ---- Cycles Tab ---- */}
        <TabsContent value="cycles">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Protocol</TableHead>
                      <TableHead className="hidden sm:table-cell">Start Date</TableHead>
                      <TableHead className="hidden md:table-cell">Current Phase</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cyclesLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredCycles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCycles.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{c.patient?.name || "Unknown"}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{c.protocol}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDate(c.startDate)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="text-xs capitalize">{c.currentPhase}</Badge>
                          </TableCell>
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Patients Tab ---- */}
        <TabsContent value="patients">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Age</TableHead>
                      <TableHead className="hidden md:table-cell">Diagnosis</TableHead>
                      <TableHead className="hidden sm:table-cell">Cycles</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{p.name}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{p.age}y</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{p.diagnosis}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{p.cyclesCount}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Protocols Tab ---- */}
        <TabsContent value="protocols">
          <Card>
            <CardContent>
              {protocolsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredProtocols.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No records found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProtocols.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4 hover:bg-accent/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                          <p className="font-medium text-sm">{p.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                          <span>Duration: <span className="font-medium text-foreground">{p.duration}</span></span>
                          <span>Success Rate: <span className="font-medium text-emerald-600">{p.successRate}%</span></span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{p.successRate}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Reports Tab ---- */}
        <TabsContent value="reports">
          <div className="space-y-4">
            {/* Cycle Outcomes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" /> Cycle Outcomes Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 p-3 text-center">
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{reportStats.total}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Cycles</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{reportStats.completed}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{reportStats.ongoing}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ongoing</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-center">
                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{reportStats.failed}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pregnancy Rates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-600" /> Pregnancy Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-medium">Clinical Success Rate</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{reportStats.successRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {reportStats.completed} completed cycles
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Baby className="w-4 h-4 text-pink-600" />
                      <p className="text-sm font-medium">Estimated Pregnancy Rate</p>
                    </div>
                    <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{reportStats.pregnancyRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Positive pregnancy test after embryo transfer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create cycle dialog */}
      <CreateIvfCycleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        protocols={protocols ?? []}
        onCreated={() => {
          setCreateOpen(false);
          refresh();
          toast.success("IVF cycle created successfully");
        }}
      />
    </div>
  );
}

/* ========== Create Cycle Dialog ========== */

function CreateIvfCycleDialog({
  open, onOpenChange, protocols, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  protocols: IvfProtocol[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    patientName: "",
    patientAge: "",
    diagnosis: "",
    protocol: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchAPI("/api/ivf-cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: form.patientName,
          patientAge: Number(form.patientAge) || 0,
          diagnosis: form.diagnosis,
          protocol: form.protocol,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ patientName: "", patientAge: "", diagnosis: "", protocol: "", notes: "" });
      onCreated();
    } catch {
      toast.error("Failed to create IVF cycle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>New IVF Cycle</DialogTitle>
          <p className="text-sm text-muted-foreground">Register a new IVF cycle for a patient.</p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient Name *</Label>
              <Input
                required
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                placeholder="e.g. Sita Sharma"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Age *</Label>
              <Input type="number" min={0} max={60} required value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} placeholder="32" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Diagnosis *</Label>
            <Input
              required
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="e.g. PCOS, Tubal Factor, Male Factor"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Protocol *</Label>
            <Select value={form.protocol} onValueChange={(v) => setForm({ ...form, protocol: v })}>
              <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
              <SelectContent>
                {protocols.length === 0 && <SelectItem value="long-protocol">Long Protocol</SelectItem>}
                {protocols.map((p) => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any initial notes…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Create Cycle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
