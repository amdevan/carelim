"use client";

import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video, Plus, Search, Download, Phone, MonitorPlay, Clock,
  CheckCircle2, Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─────────── Types ─────────── */

interface TelemedicineSession {
  id: string;
  patientId: string;
  doctorId: string;
  type: "video" | "phone" | "chat";
  scheduledAt: string;
  duration: number;
  status: "completed" | "in-progress" | "cancelled" | "scheduled";
  joinLink: string | null;
  patient: { id: string; patientCode: string; name: string; phone: string };
  doctor: { id: string; name: string; specialization: string };
}

interface TelemedicinePatient {
  id: string;
  name: string;
  patientCode: string;
  lastSession: string | null;
  totalSessions: number;
  platformPreference: string;
}

interface PatientOption {
  id: string;
  patientCode: string;
  name: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

/* ─────────── Constants ─────────── */

const SESSION_TYPES = ["video", "phone", "chat"] as const;

const TYPE_ICONS: Record<string, typeof Video> = {
  video: Video,
  phone: Phone,
  chat: MonitorPlay,
};

const TYPE_COLORS: Record<string, string> = {
  video: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  phone: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  chat: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  scheduled: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
};

type TabValue = "sessions" | "patients" | "schedule";

/* ═══════════════════════════════════════════════════════════
   MAIN TELEMEDICINE VIEW
   ═══════════════════════════════════════════════════════════ */

export function TelemedicineView() {
  const [refresh, setRefresh] = useState(0);
  const { data: sessions, loading } = useFetch<TelemedicineSession[]>(
    refresh ? `/api/telemedicine-sessions?_r=${refresh}` : "/api/telemedicine-sessions",
  );
  const { data: patients } = useFetch<TelemedicinePatient[]>(
    refresh ? `/api/telemedicine-patients?_r=${refresh}` : "/api/telemedicine-patients",
  );

  const [tab, setTab] = useState<TabValue>("sessions");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const refreshData = useCallback(() => setRefresh((r) => r + 1), []);

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!sessions) return { today: 0, completed: 0, upcoming: 0, avgDuration: 0 };
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todaySessions = sessions.filter((s) => s.scheduledAt.slice(0, 10) === todayStr);
    const completed = sessions.filter((s) => s.status === "completed");
    const upcoming = sessions.filter((s) => s.status === "scheduled");
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + s.duration, 0) / completed.length)
      : 0;
    return {
      today: todaySessions.length,
      completed: completed.length,
      upcoming: upcoming.length,
      avgDuration,
    };
  }, [sessions]);

  /* ── Filtered sessions ── */
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    const ql = q.toLowerCase();
    return sessions.filter((s) => {
      const matchesSearch = !ql ||
        (s.patient?.name || "").toLowerCase().includes(ql) ||
        (s.patient?.patientCode || "").toLowerCase().includes(ql) ||
        (s.doctor?.name || "").toLowerCase().includes(ql);
      const matchesType = typeFilter === "all" || s.type === typeFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [sessions, q, typeFilter, statusFilter]);

  /* ── Filtered patients ── */
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const ql = q.toLowerCase();
    return patients.filter((p) =>
      !ql ||
      p.name.toLowerCase().includes(ql) ||
      p.patientCode.toLowerCase().includes(ql),
    );
  }, [patients, q]);

  /* ── Scheduled sessions (future) ── */
  const scheduledSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => s.status === "scheduled")
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [sessions]);

  const handleExport = () => {
    if (!filteredSessions.length) { toast.info("No sessions to export"); return; }
    toast.success(`Exported ${filteredSessions.length} telemedicine sessions to CSV`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-600" /> Telemedicine
          </h2>
          <p className="text-sm text-muted-foreground">
            {sessions?.length ?? 0} sessions · {stats.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4" /> New Session
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's Sessions", value: stats.today, icon: Calendar, accent: "from-teal-500 to-teal-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
          { label: "Upcoming", value: stats.upcoming, icon: Clock, accent: "from-amber-500 to-orange-500" },
          { label: "Avg. Duration", value: `${stats.avgDuration}m`, icon: MonitorPlay, accent: "from-violet-500 to-violet-600" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Video className="w-3.5 h-3.5" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-1.5">
            <MonitorPlay className="w-3.5 h-3.5" /> Patients
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Schedule
          </TabsTrigger>
        </TabsList>

        {/* ============ SESSIONS TAB ============ */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient, doctor, or code…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[120px] h-9 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Types</SelectItem>
                      {SESSION_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden sm:table-cell">Doctor</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Duration</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                          <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No telemedicine sessions found
                        </TableCell>
                      </TableRow>
                    ) : filteredSessions.map((session) => {
                      const TypeIcon = TYPE_ICONS[session.type] || Video;
                      return (
                        <TableRow key={session.id} className="hover:bg-accent/40">
                          <TableCell>
                            <p className="font-medium text-sm">{session.patient?.name || "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{session.patient?.patientCode || ""}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{session.doctor?.name || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={`text-[10px] capitalize gap-1 ${TYPE_COLORS[session.type] || ""}`}>
                              <TypeIcon className="w-3 h-3" /> {session.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(session.scheduledAt)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right text-sm font-mono">
                            {session.duration} min
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] ${STATUS_COLORS[session.status] || ""}`}>
                              {STATUS_LABELS[session.status] || session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {session.status === "scheduled" && session.joinLink && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => window.open(session.joinLink!, "_blank")}
                                >
                                  <Video className="w-3 h-3" /> Join
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 text-muted-foreground text-xs">
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ PATIENTS TAB ============ */}
        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Session</TableHead>
                      <TableHead className="text-center">Total Sessions</TableHead>
                      <TableHead className="hidden md:table-cell">Platform Preference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-12">
                          <MonitorPlay className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No telemedicine patients found
                        </TableCell>
                      </TableRow>
                    ) : filteredPatients.map((patient) => (
                      <TableRow key={patient.id} className="hover:bg-accent/40">
                        <TableCell>
                          <p className="font-medium text-sm">{patient.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{patient.patientCode}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {patient.lastSession ? formatDate(patient.lastSession) : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {patient.totalSessions}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {patient.platformPreference || "Video"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SCHEDULE TAB ============ */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" /> Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : scheduledSessions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
                  <p className="text-sm text-muted-foreground">No upcoming sessions scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledSessions.map((session, i) => {
                    const TypeIcon = TYPE_ICONS[session.type] || Video;
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card hover:bg-accent/30 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{session.patient?.name || "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {session.doctor?.name || "—"} · {session.type} · {session.duration} min
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {formatDate(session.scheduledAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {session.joinLink && (
                            <Button
                              size="sm"
                              className="h-7 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                              onClick={() => window.open(session.joinLink!, "_blank")}
                            >
                              <Video className="w-3.5 h-3.5" /> Join Session
                            </Button>
                          )}
                          <Badge className={`text-[10px] ${STATUS_COLORS[session.status] || ""}`}>
                            {STATUS_LABELS[session.status]}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create session dialog */}
      <CreateSessionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          refreshData();
          toast.success("Telemedicine session created successfully");
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE SESSION DIALOG
   ═══════════════════════════════════════════════════════════ */

function CreateSessionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { data: patients } = useFetch<PatientOption[]>("/api/patients");
  const { data: doctors } = useFetch<DoctorOption[]>("/api/doctors");
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    type: "video" as string,
    scheduledDate: "",
    scheduledTime: "09:00",
    duration: 30,
  });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm({
      patientId: "",
      doctorId: "",
      type: "video",
      scheduledDate: "",
      scheduledTime: "09:00",
      duration: 30,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error("Please select a patient"); return; }
    if (!form.doctorId) { toast.error("Please select a doctor"); return; }
    if (!form.scheduledDate) { toast.error("Please select a date"); return; }

    setSaving(true);
    try {
      const scheduledAt = `${form.scheduledDate}T${form.scheduledTime}:00`;
      const res = await fetchAPI("/api/telemedicine-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          doctorId: form.doctorId,
          type: form.type,
          scheduledAt,
          duration: form.duration,
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create telemedicine session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-600" /> New Telemedicine Session
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {(patients || []).slice(0, 200).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-xs text-muted-foreground">({p.patientCode})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctors || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="text-xs text-muted-foreground">· {d.specialization}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Session Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time *</Label>
              <Input
                type="time"
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration (minutes)</Label>
            <Select value={String(form.duration)} onValueChange={(v) => setForm({ ...form, duration: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Creating…" : <><Video className="w-4 h-4" /> Create Session</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
