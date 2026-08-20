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
  Smile, Plus, Search, Download, Trash2, Edit, Eye,
  Stethoscope, Activity, ClipboardList, FileImage,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface DentalPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string | null;
  lastVisit: string | null;
  treatmentsCount: number;
  status: string;
}

interface DentalAppointment {
  id: string;
  patientId: string;
  patient: { name: string };
  doctor: { name: string };
  date: string;
  time: string;
  type: string;
  status: string;
}

interface DentalTreatment {
  id: string;
  patientId: string;
  patient: { name: string };
  treatmentType: string;
  tooth: string | null;
  doctor: { name: string };
  cost: number;
  status: string;
  date: string;
}

interface DentalImaging {
  id: string;
  patientId: string;
  patient: { name: string };
  type: string;
  date: string;
  status: string;
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

export function DentalView() {
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePatient, setDeletePatient] = useState<DentalPatient | null>(null);

  const { data: patients, loading: patientsLoading } = useFetch<DentalPatient[]>(`/api/dental-patients?_r=${tick}`);
  const { data: appointments, loading: appointmentsLoading } = useFetch<DentalAppointment[]>(`/api/dental-appointments?_r=${tick}`);
  const { data: treatments, loading: treatmentsLoading } = useFetch<DentalTreatment[]>(`/api/dental-treatments?_r=${tick}`);
  const { data: imaging, loading: imagingLoading } = useFetch<DentalImaging[]>(`/api/dental-imaging?_r=${tick}`);

  const refresh = () => setTick((t) => t + 1);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!q) return patients;
    const ql = q.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(ql) || p.phone.includes(q),
    );
  }, [patients, q]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    if (!q) return appointments;
    const ql = q.toLowerCase();
    return appointments.filter(
      (a) => (a.patient?.name || "").toLowerCase().includes(ql) || (a.doctor?.name || "").toLowerCase().includes(ql),
    );
  }, [appointments, q]);

  const filteredTreatments = useMemo(() => {
    if (!treatments) return [];
    if (!q) return treatments;
    const ql = q.toLowerCase();
    return treatments.filter(
      (t) => (t.patient?.name || "").toLowerCase().includes(ql) || t.treatmentType.toLowerCase().includes(ql),
    );
  }, [treatments, q]);

  const filteredImaging = useMemo(() => {
    if (!imaging) return [];
    if (!q) return imaging;
    const ql = q.toLowerCase();
    return imaging.filter((i) => (i.patient?.name || "").toLowerCase().includes(ql));
  }, [imaging, q]);

  /* ---- KPIs ---- */
  const totalPatients = patients?.length ?? 0;
  const todayAppointments = useMemo(() => {
    if (!appointments) return 0;
    const today = new Date().toISOString().split("T")[0];
    return appointments.filter((a) => a.date === today).length;
  }, [appointments]);
  const treatmentsThisMonth = useMemo(() => {
    if (!treatments) return 0;
    const now = new Date();
    return treatments.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [treatments]);
  const revenue = useMemo(
    () => (treatments ?? []).reduce((sum, t) => sum + (t.cost || 0), 0),
    [treatments],
  );

  const kpiCards: KpiCardDef[] = [
    { label: "Total Patients", value: String(totalPatients), icon: Smile, accent: "from-teal-500 to-emerald-600" },
    { label: "Today's Appointments", value: String(todayAppointments), icon: ClipboardList, accent: "from-cyan-500 to-teal-600" },
    { label: "Treatments This Month", value: String(treatmentsThisMonth), icon: Stethoscope, accent: "from-violet-500 to-purple-600" },
    { label: "Revenue", value: formatRs(revenue), icon: Activity, accent: "from-emerald-500 to-teal-600" },
  ];

  const handleDelete = async () => {
    if (!deletePatient) return;
    try {
      const res = await fetchAPI(`/api/dental-patients/${deletePatient.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Patient ${deletePatient.name} deleted`);
      setDeletePatient(null);
      refresh();
    } catch {
      toast.error("Failed to delete patient");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30 shrink-0">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Dental Clinic Management</h2>
            <p className="text-xs text-muted-foreground">Patients · Appointments · Treatments · Imaging</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh}>
            <Activity className="w-4 h-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Patient
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

      {/* Tabs with data tables */}
      <Tabs defaultValue="patients">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="justify-start overflow-x-auto">
            <TabsTrigger value="patients" className="gap-1.5"><Smile className="w-3.5 h-3.5" /> Patients</TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Appointments</TabsTrigger>
            <TabsTrigger value="treatments" className="gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Treatments</TabsTrigger>
            <TabsTrigger value="imaging" className="gap-1.5"><FileImage className="w-3.5 h-3.5" /> Imaging</TabsTrigger>
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

        {/* ---- Patients Tab ---- */}
        <TabsContent value="patients">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Age</TableHead>
                      <TableHead className="hidden md:table-cell">Last Visit</TableHead>
                      <TableHead className="hidden md:table-cell">Treatments</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                          <Smile className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{p.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{p.age}y</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {p.lastVisit ? formatDate(p.lastVisit) : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{p.treatmentsCount}</TableCell>
                          <TableCell className="hidden sm:table-cell"><StatusBadge status={p.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="text-teal-600 gap-1">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="text-rose-600 hover:text-rose-700"
                                onClick={() => setDeletePatient(p)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Appointments Tab ---- */}
        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Doctor</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointmentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAppointments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{a.patient?.name || "Unknown"}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{a.doctor?.name || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <p>{formatDate(a.date)}</p>
                            <p className="text-xs text-muted-foreground">{a.time}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm capitalize">{a.type}</TableCell>
                          <TableCell><StatusBadge status={a.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Treatments Tab ---- */}
        <TabsContent value="treatments">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead>Treatment Type</TableHead>
                      <TableHead className="hidden md:table-cell">Tooth</TableHead>
                      <TableHead className="hidden md:table-cell">Doctor</TableHead>
                      <TableHead className="hidden sm:table-cell">Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatmentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredTreatments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                          <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTreatments.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{t.patient?.name || "Unknown"}</p>
                          </TableCell>
                          <TableCell className="text-sm capitalize">{t.treatmentType}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{t.tooth || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{t.doctor?.name || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm font-medium">{formatRs(t.cost)}</TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Imaging Tab ---- */}
        <TabsContent value="imaging">
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imagingLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredImaging.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-12">
                          <FileImage className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredImaging.map((im) => (
                        <TableRow key={im.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{im.patient?.name || "Unknown"}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="text-xs">{im.type}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDate(im.date)}
                          </TableCell>
                          <TableCell><StatusBadge status={im.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <CreateDentalPatientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          refresh();
          toast.success("Dental patient created successfully");
        }}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deletePatient} onOpenChange={(o) => !o && setDeletePatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong>{deletePatient?.name}</strong> and all related records.
              This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePatient(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== Create Patient Dialog ========== */

function CreateDentalPatientDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "male",
    phone: "",
    email: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchAPI("/api/dental-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          age: Number(form.age) || 0,
          gender: form.gender,
          phone: form.phone,
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setForm({ name: "", age: "", gender: "male", phone: "", email: "", notes: "" });
      onCreated();
    } catch {
      toast.error("Failed to create dental patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>New Dental Patient</DialogTitle>
          <p className="text-sm text-muted-foreground">Register a new patient for the dental clinic.</p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ram Kumar"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Age *</Label>
              <Input type="number" min={0} max={150} required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="28" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98XXXXXXXX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ram@mail.com" />
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
              {saving ? "Saving…" : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
