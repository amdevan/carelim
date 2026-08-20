"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/cms/pagination";
import { usePagination } from "@/lib/use-pagination";
import { exportToCSV } from "@/lib/export-utils";
import {
  CalendarPlus, ChevronLeft, ChevronRight, CalendarDays, ClipboardList,
  CheckCircle2, XCircle, ListChecks, LogIn, Stethoscope, Download,
  Calendar as CalendarIcon, Megaphone, Clock, User, Hash,
} from "lucide-react";
import { formatRs, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Patient {
  id: string; patientCode: string; name: string; phone: string;
  age: number; gender: string; bloodGroup: string | null;
}
interface Department {
  id: string; name: string; color: string | null;
}
interface Doctor {
  id: string; name: string; specialization: string;
  departmentId: string; consultationFee: number; department: Department;
}
interface Appointment {
  id: string; tokenNo: number; patientId: string; doctorId: string;
  departmentId: string | null; date: string; time: string; type: string;
  reason: string | null; status: string; fee: number;
  patient: Patient;
  doctor: Doctor;
}

const STATUS_FILTERS = [
  "all", "scheduled", "checked-in", "in-consult", "completed", "cancelled", "no-show",
] as const;

const TYPE_COLORS: Record<string, string> = {
  "walk-in": "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  online: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  video: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  "follow-up": "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const QUEUE_STATUSES = ["scheduled", "checked-in", "in-consult"];
const ESTIMATED_MIN_PER_PATIENT = 15;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function apptYMD(a: { date: string }) {
  return toYMD(new Date(a.date));
}

function shiftDate(ymd: string, days: number) {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toYMD(d);
}

type TabValue = "daily" | "calendar" | "queue";

export function AppointmentsView() {
  const [tab, setTab] = useState<TabValue>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tick, setTick] = useState(0);
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);

  const { data: appts, loading } = useFetch<Appointment[]>(`/api/appointments?_r=${tick}`);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const todayYMD = toYMD(new Date());

  // Daily schedule = appointments on selectedDate
  const dayAppts = useMemo(() => {
    if (!appts) return [];
    return appts
      .filter((a) => apptYMD(a) === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appts, selectedDate]);

  // Filtered daily schedule
  const filtered = useMemo(() => {
    if (statusFilter === "all") return dayAppts;
    return dayAppts.filter((a) => a.status === statusFilter);
  }, [dayAppts, statusFilter]);

  const pagination = usePagination(filtered, 10);

  // Reset page on filter/date change
  useEffect(() => {
    pagination.setPage(1);
  }, [statusFilter, selectedDate, pagination]);

  // Stats for daily schedule
  const stats = useMemo(() => ({
    total: dayAppts.length,
    inQueue: dayAppts.filter((a) => QUEUE_STATUSES.includes(a.status)).length,
    completed: dayAppts.filter((a) => a.status === "completed").length,
    cancelled: dayAppts.filter((a) => a.status === "cancelled").length,
  }), [dayAppts]);

  // Queue board = today's appts filtered to queue statuses
  const queueAppts = useMemo(() => {
    if (!appts) return [];
    return appts
      .filter((a) => apptYMD(a) === todayYMD && QUEUE_STATUSES.includes(a.status))
      .sort((a, b) => a.time.localeCompare(b.time) || a.tokenNo - b.tokenNo);
  }, [appts, todayYMD]);

  const queueStats = useMemo(() => {
    const scheduled = queueAppts.filter((a) => a.status === "scheduled").length;
    const checkedIn = queueAppts.filter((a) => a.status === "checked-in").length;
    const inConsult = queueAppts.filter((a) => a.status === "in-consult").length;
    const estWait = scheduled * ESTIMATED_MIN_PER_PATIENT;
    return { scheduled, checkedIn, inConsult, estWait };
  }, [queueAppts]);

  const updateStatus = useCallback(async (appt: Appointment, status: string, msg: string) => {
    try {
      const res = await fetchAPI(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(msg);
      refresh();
    } catch {
      toast.error("Failed to update appointment");
    }
  }, [refresh]);

  const confirmCancel = async () => {
    if (!cancelAppt) return;
    await updateStatus(cancelAppt, "cancelled", `Appointment cancelled for ${cancelAppt.patient.name}`);
    setCancelAppt(null);
  };

  const callNext = useCallback(async () => {
    const next = queueAppts.find((a) => a.status === "scheduled");
    if (!next) {
      toast.info("No more patients in queue");
      return;
    }
    await updateStatus(next, "checked-in", `Token #${next.tokenNo} (${next.patient.name}) called to check-in`);
  }, [queueAppts, updateStatus]);

  const handleExport = () => {
    const rows = (dayAppts.length ? dayAppts : appts ?? []).map((a) => [
      a.tokenNo,
      a.patient.name,
      a.patient.patientCode,
      a.doctor.name,
      a.doctor.department?.name ?? "",
      apptYMD(a),
      a.time,
      a.type,
      a.status,
      a.fee,
    ]);
    exportToCSV(
      `appointments-${selectedDate}`,
      ["Token", "Patient", "Patient ID", "Doctor", "Department", "Date", "Time", "Type", "Status", "Fee"],
      rows,
    );
    toast.success(`Exported ${rows.length} appointment${rows.length === 1 ? "" : "s"}`);
  };

  const isToday = selectedDate === todayYMD;
  const prettyDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Appointments</h2>
          <p className="text-sm text-muted-foreground">Manage schedule, calendar and live queue</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setBookOpen(true)}>
            <CalendarPlus className="w-4 h-4" /> Book Appointment
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Daily Schedule</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Calendar View</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Queue Board</TabsTrigger>
        </TabsList>

        {/* ============ DAILY SCHEDULE TAB ============ */}
        <TabsContent value="daily" className="space-y-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Today" value={stats.total} icon={ClipboardList} accent="from-teal-500 to-teal-600" />
            <StatCard label="In Queue" value={stats.inQueue} icon={ListChecks} accent="from-amber-500 to-orange-500" />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" />
            <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} accent="from-rose-500 to-rose-600" />
          </div>

          {/* Date navigator + status filters */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedDate((d) => shiftDate(d, -1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 min-w-[180px] justify-center" onClick={() => setSelectedDate(toYMD(new Date()))}>
                    <CalendarDays className="w-4 h-4" />
                    <span className="font-medium">{prettyDate}</span>
                    {!isToday && <Badge variant="secondary" className="ml-1 text-[10px]">jump to today</Badge>}
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSelectedDate((d) => shiftDate(d, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {dayAppts.length} appointment{dayAppts.length === 1 ? "" : "s"} on this day
                </div>
              </div>

              {/* Status filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => {
                  const count = s === "all" ? dayAppts.length : dayAppts.filter((a) => a.status === s).length;
                  const active = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        active
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-card text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {s === "all" ? "All" : statusLabel(s)}
                      <span className={`rounded-full px-1.5 py-0 text-[10px] ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Appointments table */}
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg border-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[70px]">Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Doctor</TableHead>
                      <TableHead className="hidden sm:table-cell">Time</TableHead>
                      <TableHead className="hidden lg:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Fee</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : pagination.paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No appointments {statusFilter === "all" ? "scheduled" : `with status "${statusLabel(statusFilter)}"`} for this day.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagination.paged.map((a, i) => (
                        <AppointmentRow
                          key={a.id}
                          appt={a}
                          index={i}
                          onUpdate={updateStatus}
                          onCancel={(appt) => setCancelAppt(appt)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                setPage={pagination.setPage}
                size={pagination.size}
                setSize={pagination.setSize}
                range={pagination.range}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CALENDAR VIEW TAB ============ */}
        <TabsContent value="calendar">
          <CalendarView
            appts={appts ?? []}
            loading={loading}
            selectedDate={selectedDate}
            onSelectDate={(ymd) => {
              setSelectedDate(ymd);
              setTab("daily");
            }}
          />
        </TabsContent>

        {/* ============ QUEUE BOARD TAB ============ */}
        <TabsContent value="queue">
          <QueueBoard
            queueAppts={queueAppts}
            queueStats={queueStats}
            loading={loading}
            onCallNext={callNext}
            onUpdate={updateStatus}
          />
        </TabsContent>
      </Tabs>

      <BookAppointmentDialog
        open={bookOpen}
        defaultDate={selectedDate}
        onOpenChange={setBookOpen}
        onBooked={() => { setBookOpen(false); refresh(); toast.success("Appointment booked successfully"); }}
      />

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelAppt} onOpenChange={(o) => !o && setCancelAppt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelAppt && (
                <>This will cancel token <span className="font-semibold">#{cancelAppt.tokenNo}</span> for <span className="font-semibold">{cancelAppt.patient.name}</span> with {cancelAppt.doctor.name}. The patient will no longer appear in the active queue.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmCancel}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Stat Card ---------------- */
function StatCard({
  label, value, icon: Icon, accent, suffix,
}: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent: string; suffix?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">
              {value}{suffix && <span className="text-sm font-medium text-muted-foreground ml-1">{suffix}</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---------------- Appointment Row ---------------- */
function AppointmentRow({
  appt, index, onUpdate, onCancel,
}: {
  appt: Appointment; index: number;
  onUpdate: (appt: Appointment, status: string, msg: string) => void;
  onCancel: (appt: Appointment) => void;
}) {
  const deptColor = appt.doctor.department?.color || "#0d9488";
  const cancelled = appt.status === "cancelled" || appt.status === "no-show";
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`${cancelled ? "opacity-60" : ""}`}
    >
      <TableCell className="font-mono text-xs">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 font-semibold">
          {appt.tokenNo}
        </span>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{appt.patient.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {appt.patient.patientCode} · {appt.patient.age}y · <span className="capitalize">{appt.patient.gender}</span>
          </p>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: deptColor }}
          />
          <div>
            <p className="text-sm font-medium">{appt.doctor.name}</p>
            <p className="text-[11px] text-muted-foreground">{appt.doctor.specialization}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-sm font-mono">{appt.time}</TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant="outline" className={`text-[10px] capitalize ${TYPE_COLORS[appt.type] ?? "bg-muted text-muted-foreground border-0"}`}>
          {appt.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={`text-[10px] ${statusColors[appt.status] ?? ""}`}>{statusLabel(appt.status)}</Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-right text-sm font-medium">{formatRs(appt.fee)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1 flex-wrap">
          {appt.status === "scheduled" && (
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1 text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/30"
              onClick={() => onUpdate(appt, "checked-in", `Patient ${appt.patient.name} checked in`)}
            >
              <LogIn className="w-3.5 h-3.5" /> Check-in
            </Button>
          )}
          {appt.status === "checked-in" && (
            <Button
              size="sm" variant="outline"
              className="h-7 gap-1 text-violet-700 border-violet-200 hover:bg-violet-50 dark:border-violet-900 dark:hover:bg-violet-950/30"
              onClick={() => onUpdate(appt, "in-consult", `Consultation started for ${appt.patient.name}`)}
            >
              <Stethoscope className="w-3.5 h-3.5" /> Start Consult
            </Button>
          )}
          {appt.status === "in-consult" && (
            <Button
              size="sm"
              className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onUpdate(appt, "completed", `Appointment completed for ${appt.patient.name}`)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </Button>
          )}
          {!cancelled && appt.status !== "completed" && (
            <Button
              size="sm" variant="ghost"
              className="h-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => onCancel(appt)}
            >
              Cancel
            </Button>
          )}
          {cancelled && (
            <span className="text-[11px] text-muted-foreground italic">No actions</span>
          )}
        </div>
      </TableCell>
    </motion.tr>
  );
}

/* ---------------- Calendar View ---------------- */
function CalendarView({
  appts, loading, selectedDate, onSelectDate,
}: {
  appts: Appointment[];
  loading: boolean;
  selectedDate: string;
  onSelectDate: (ymd: string) => void;
}) {
  const todayYMD = toYMD(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Group appts by YMD
  const countsByDay = useMemo(() => {
    const m: Record<string, number> = {};
    appts.forEach((a) => {
      const k = apptYMD(a);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [appts]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: ({ day: number; ymd: string } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, ymd: toYMD(new Date(cursor.year, cursor.month, d)) });
  }
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = `${MONTHS[cursor.month]} ${cursor.year}`;
  const monthApptCount = cells.reduce(
    (sum, c) => sum + (c ? countsByDay[c.ymd] || 0 : 0),
    0,
  );

  const prevMonth = () => setCursor((c) => {
    const m = c.month - 1;
    return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
  });
  const nextMonth = () => setCursor((c) => {
    const m = c.month + 1;
    return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
  });
  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-600" /> {monthLabel}
            </CardTitle>
            <CardDescription className="text-xs">
              {monthApptCount} appointment{monthApptCount === 1 ? "" : "s"} this month · click any day to view schedule
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {w}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-2">
              {cells.map((c, i) => {
                if (!c) return <div key={`empty-${i}`} className="h-20 rounded-lg bg-muted/30" />;
                const count = countsByDay[c.ymd] || 0;
                const isToday = c.ymd === todayYMD;
                const isSelected = c.ymd === selectedDate;
                const hasAppts = count > 0;
                return (
                  <button
                    key={c.ymd}
                    type="button"
                    onClick={() => onSelectDate(c.ymd)}
                    className={`h-20 rounded-lg border p-2 text-left flex flex-col justify-between transition-all hover:border-teal-400 hover:shadow-sm ${
                      isSelected
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                        : isToday
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${
                        isToday ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                      }`}>
                        {c.day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 uppercase">Today</span>
                      )}
                    </div>
                    <div>
                      {hasAppts ? (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                            {count}
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">
                            {count === 1 ? "appt" : "appts"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" /> Today</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-teal-500 bg-teal-50 dark:bg-teal-950/30" /> Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-600" /> Has appointments</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Queue Board ---------------- */
function QueueBoard({
  queueAppts, queueStats, loading, onCallNext, onUpdate,
}: {
  queueAppts: Appointment[];
  queueStats: { scheduled: number; checkedIn: number; inConsult: number; estWait: number };
  loading: boolean;
  onCallNext: () => void;
  onUpdate: (appt: Appointment, status: string, msg: string) => void;
}) {
  const nowServing = queueAppts.find((a) => a.status === "in-consult");
  const waitingList = queueAppts.filter((a) => a.status !== "in-consult");

  return (
    <div className="space-y-4">
      {/* Now serving hero card */}
      <Card className="relative overflow-hidden border-teal-200 dark:border-teal-900/50">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-transparent to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20" />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shrink-0">
                <Megaphone className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-teal-700 dark:text-teal-400 uppercase tracking-wider">Now Serving</p>
                {nowServing ? (
                  <>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <span className="text-3xl sm:text-4xl font-bold tracking-tight text-teal-700 dark:text-teal-300">
                        {nowServing.tokenNo}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {nowServing.patient.name} · {nowServing.doctor.name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold tracking-tight mt-0.5">—</p>
                    <p className="text-sm text-muted-foreground mt-0.5">No patient in consultation right now</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2">
              <Button
                size="lg"
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={onCallNext}
                disabled={queueStats.scheduled === 0}
              >
                <Megaphone className="w-4 h-4" /> Call Next Patient
              </Button>
              <p className="text-[11px] text-muted-foreground">
                {queueStats.scheduled > 0
                  ? `${queueStats.scheduled} scheduled · ${queueStats.checkedIn} checked-in waiting`
                  : "No scheduled patients to call"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="In Queue" value={queueAppts.length} icon={ListChecks} accent="from-teal-500 to-teal-600" />
        <StatCard label="Scheduled" value={queueStats.scheduled} icon={ClipboardList} accent="from-amber-500 to-orange-500" />
        <StatCard label="Checked-in" value={queueStats.checkedIn} icon={LogIn} accent="from-violet-500 to-purple-600" />
        <StatCard label="Est. Wait" value={queueStats.estWait} suffix="min" icon={Clock} accent="from-cyan-500 to-teal-600" />
      </div>

      {/* Waiting list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" /> Queue List
          </CardTitle>
          <CardDescription className="text-xs">
            {waitingList.length} patient{waitingList.length === 1 ? "" : "s"} waiting · est. {ESTIMATED_MIN_PER_PATIENT} min per patient
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : waitingList.length === 0 && !nowServing ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
              <p className="text-sm text-muted-foreground">Queue is empty — no patients waiting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {nowServing && (
                <QueueRow
                  appt={nowServing}
                  isNowServing
                  onUpdate={onUpdate}
                />
              )}
              {waitingList.map((a, i) => (
                <QueueRow
                  key={a.id}
                  appt={a}
                  index={i}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueRow({
  appt, index, isNowServing, onUpdate,
}: {
  appt: Appointment;
  index?: number;
  isNowServing?: boolean;
  onUpdate: (appt: Appointment, status: string, msg: string) => void;
}) {
  const deptColor = appt.doctor.department?.color || "#0d9488";
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index ?? 0) * 0.03 }}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 ${
        isNowServing
          ? "border-teal-300 bg-teal-50/70 dark:bg-teal-950/30 dark:border-teal-800"
          : "border-border bg-card hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold ${
          isNowServing
            ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
            : "bg-muted text-foreground"
        }`}>
          <span className="text-[9px] font-medium opacity-70 uppercase">Token</span>
          <span className="text-lg leading-none">{appt.tokenNo}</span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{appt.patient.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: deptColor }} />
            {appt.doctor.name} · {appt.doctor.department?.name ?? "General"}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
            <Clock className="w-3 h-3 inline mr-1" />{appt.time}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isNowServing ? (
          <Badge className="bg-teal-600 text-white gap-1">
            <Megaphone className="w-3 h-3" /> Now Serving
          </Badge>
        ) : (
          <Badge className={`text-[10px] ${statusColors[appt.status] ?? ""}`}>
            {statusLabel(appt.status)}
          </Badge>
        )}
        {appt.status === "scheduled" && (
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1 text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950/30"
            onClick={() => onUpdate(appt, "checked-in", `Token #${appt.tokenNo} (${appt.patient.name}) checked in`)}
          >
            <LogIn className="w-3.5 h-3.5" /> Check-in
          </Button>
        )}
        {appt.status === "checked-in" && (
          <Button
            size="sm"
            className="h-7 gap-1 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => onUpdate(appt, "in-consult", `Consultation started for ${appt.patient.name}`)}
          >
            <Stethoscope className="w-3.5 h-3.5" /> Start Consult
          </Button>
        )}
        {appt.status === "in-consult" && (
          <Button
            size="sm"
            className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onUpdate(appt, "completed", `Appointment completed for ${appt.patient.name}`)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ---------------- Book Appointment Dialog (Advanced) ---------------- */
function BookAppointmentDialog({
  open, defaultDate, onOpenChange, onBooked,
}: {
  open: boolean;
  defaultDate: string;
  onOpenChange: (v: boolean) => void;
  onBooked: () => void;
}) {
  const { data: patients } = useFetch<Patient[]>("/api/patients");
  const { data: doctors } = useFetch<Doctor[]>("/api/doctors");
  const { data: departments } = useFetch<Department[]>("/api/departments");

  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [referralName, setReferralName] = useState("");
  const [form, setForm] = useState({
    patientId: "", doctorId: "", date: defaultDate, time: "09:00",
    type: "walk-in", reason: "", priority: "normal", departmentId: "",
    notes: "", followUp: false,
  });
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, date: defaultDate }));
  }, [open, defaultDate]);

  const selectedDoctor = doctors?.find((d) => d.id === form.doctorId);
  const selectedPatient = patients?.find((p) => p.id === form.patientId);

  // Filter doctors by department
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    if (!form.departmentId) return doctors;
    return doctors.filter((d) => d.departmentId === form.departmentId);
  }, [doctors, form.departmentId]);

  // Patient search
  const matchedPatients = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2 || !patients) return [];
    const q = patientSearch.toLowerCase();
    return patients.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.patientCode.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [patientSearch, patients]);

  // Fetch doctor schedule for selected doctor
  const { data: doctorSlots } = useFetch<{ id: string; dayName: string; startTime: string; endTime: string; slotDuration: number; capacity: number; bookedCount: number; status: string }[]>(
    form.doctorId ? `/api/doctor-schedule?doctorId=${form.doctorId}` : null,
  );

  // Generate time slots based on doctor's schedule for the selected day
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const timeSlots = useMemo(() => {
    if (!form.doctorId || !doctorSlots || doctorSlots.length === 0) return [];
    const selectedDate = new Date(form.date);
    const dayName = dayNames[selectedDate.getDay()];
    const todaySlot = doctorSlots.find((s) => s.dayName === dayName && s.status === "available");
    if (!todaySlot) return [];
    const [sh, sm] = todaySlot.startTime.split(":").map(Number);
    const [eh, em] = todaySlot.endTime.split(":").map(Number);
    const dur = todaySlot.slotDuration || 15;
    const slots: string[] = [];
    let curMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    while (curMin < endMin) {
      const h = Math.floor(curMin / 60);
      const m = curMin % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      curMin += dur;
    }
    return slots;
  }, [form.date, form.doctorId, doctorSlots]);

  // Quick date options
  const quickDates = useMemo(() => {
    const today = new Date();
    const t1 = new Date();
    t1.setDate(today.getDate() + 1);
    const t2 = new Date();
    t2.setDate(today.getDate() + 6);
    return [
      { label: "Today", value: today.toISOString().split("T")[0] },
      { label: "Tomorrow", value: t1.toISOString().split("T")[0] },
      { label: "Next Week", value: t2.toISOString().split("T")[0] },
    ];
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      if (!guestName || !guestPhone) { toast.error("Guest name and phone are required"); return; }
    } else if (!form.patientId) {
      toast.error("Please select a patient or switch to Guest mode"); return;
    }
    if (!form.doctorId) { toast.error("Please select a doctor"); return; }
    setSaving(true);
    try {
      let patientId = form.patientId;
      // Guest: create or find patient by phone
      if (isGuest) {
        const findRes = await fetchAPI(`/api/patients?search=${encodeURIComponent(guestPhone)}`);
        const existing = await findRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          patientId = existing[0].id;
        } else {
          const createRes = await fetchAPI("/api/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: guestName, phone: guestPhone, gender: "other",
              age: 0, bloodGroup: "O+",
            }),
          });
          if (!createRes.ok) throw new Error("Failed to create guest patient");
          const newPatient = await createRes.json();
          patientId = newPatient.id;
        }
      }
      const fee = selectedDoctor?.consultationFee ?? 0;
      const res = await fetchAPI("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          doctorId: form.doctorId,
          departmentId: form.departmentId || selectedDoctor?.departmentId,
          date: form.date,
          time: form.time,
          type: form.type,
          reason: form.reason || null,
          priority: form.priority,
          referralName: form.type === "referral" ? referralName : null,
          fee,
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Appointment booked");
      onBooked();
      setForm({
        patientId: "", doctorId: "", date: form.date, time: "09:00",
        type: "walk-in", reason: "", priority: "normal", departmentId: form.departmentId,
        notes: "", followUp: false,
      });
      setGuestName(""); setGuestPhone(""); setReferralName("");
      setPatientSearch("");
    } catch {
      toast.error("Failed to book appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-teal-600" /> Book Appointment
          </DialogTitle>
          <DialogDescription>Schedule a new appointment with search, quick picks, and time slots.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Patient / Guest toggle */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <button
              type="button"
              onClick={() => { setIsGuest(false); setGuestName(""); setGuestPhone(""); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !isGuest ? "bg-teal-600 text-white shadow-sm" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Registered Patient
            </button>
            <button
              type="button"
              onClick={() => { setIsGuest(true); setForm({ ...form, patientId: "" }); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isGuest ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Guest Booking
            </button>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {isGuest ? "Walk-in guest without registration" : "Search existing patient"}
            </span>
          </div>

          {/* Guest fields */}
          {isGuest ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Guest Name *</Label>
                <Input
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Walk-in Patient"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guest Phone *</Label>
                <Input
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                />
              </div>
            </div>
          ) : (
            /* Patient search */
            <div className="space-y-1.5 relative">
              <Label>Patient *</Label>
              {form.patientId && selectedPatient ? (
                <div className="flex items-center gap-2 rounded-lg border bg-teal-50/50 dark:bg-teal-950/20 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-xs font-bold text-teal-700 dark:text-teal-300">
                    {selectedPatient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedPatient.name}</p>
                    <p className="text-[11px] text-muted-foreground">{selectedPatient.patientCode} · {selectedPatient.phone} · {selectedPatient.gender}, {selectedPatient.age}y</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setForm({ ...form, patientId: "" })}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search patient by name, phone, or code…"
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowPatientSearch(true); }}
                    onFocus={() => setShowPatientSearch(true)}
                    onBlur={() => setTimeout(() => setShowPatientSearch(false), 200)}
                  />
                  {showPatientSearch && matchedPatients.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg max-h-48 overflow-y-auto scrollbar-thin">
                      {matchedPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 flex items-center justify-between gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm({ ...form, patientId: p.id });
                            setPatientSearch("");
                            setShowPatientSearch(false);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">{p.patientCode} · {p.phone}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{p.bloodGroup || "—"}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Department + Doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v, doctorId: "" })}>
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="text-xs text-muted-foreground">· {d.specialization}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Doctor info card + schedule */}
          {selectedDoctor && (
            <div className="rounded-lg border bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{selectedDoctor.name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedDoctor.specialization} · {selectedDoctor.department.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-teal-700 dark:text-teal-300">{formatRs(selectedDoctor.consultationFee)}</p>
                  <p className="text-[10px] text-muted-foreground">consultation</p>
                </div>
              </div>
              {/* Schedule summary */}
              {doctorSlots && doctorSlots.length > 0 && (
                <div className="mt-2 pt-2 border-t border-teal-200/50 dark:border-teal-800/50">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">Weekly Schedule</p>
                  <div className="flex flex-wrap gap-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                      const slot = doctorSlots.find((s) => s.dayName === day);
                      const selectedDay = dayNames[new Date(form.date || Date.now()).getDay()];
                      const isToday = day === selectedDay;
                      return (
                        <span key={day} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          !slot ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600" :
                          slot.status === "available" ?
                            isToday ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" :
                            "bg-gray-100 text-gray-500 line-through"
                        }`}>
                          <span>{day}</span>
                          {slot && <span className="opacity-75">{slot.startTime}-{slot.endTime}</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date + Quick picks */}
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <div className="flex gap-2">
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="flex-1" />
              <div className="flex gap-1">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.value}
                    type="button"
                    variant={form.date === qd.value ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-xs ${form.date === qd.value ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                    onClick={() => setForm({ ...form, date: qd.value })}
                  >
                    {qd.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Time slot grid (doctor schedule-based) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Time *
              {form.doctorId && timeSlots.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  · {timeSlots.length} slots ({timeSlots[0]} – {timeSlots[timeSlots.length - 1]})
                </span>
              )}
            </Label>
            {!form.doctorId ? (
              <div className="text-center py-4 text-xs text-muted-foreground rounded-lg border border-dashed">
                Select a doctor to see available time slots
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-4 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                No schedule available for this day. Select a different date or doctor.
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setForm({ ...form, time: slot })}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                      form.time === slot
                        ? "border-teal-400 bg-teal-600 text-white shadow-sm"
                        : "border-border hover:border-teal-200 text-muted-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Visit Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Referral name (shown when type = referral) */}
          {form.type === "referral" && (
            <div className="space-y-1.5">
              <Label>Referred By *</Label>
              <Input
                required
                value={referralName}
                onChange={(e) => setReferralName(e.target.value)}
                placeholder="e.g. Dr. Sharma, City Hospital, XYZ Clinic…"
              />
              <p className="text-[10px] text-muted-foreground">Name of the doctor, hospital, or clinic that referred this patient</p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason for Visit *</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Describe the reason for this appointment…"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Staff notes (not visible to patient)…"
              rows={2}
            />
          </div>

          {/* Summary card */}
          {(form.patientId || (isGuest && guestName)) && form.doctorId && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-sm">Appointment Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Patient:</span> <span className="font-medium">{isGuest ? guestName : selectedPatient?.name}</span> {isGuest && <Badge className="text-[8px] ml-1 bg-amber-100 text-amber-700">Guest</Badge>}</div>
                <div><span className="text-muted-foreground">Doctor:</span> <span className="font-medium">{selectedDoctor?.name}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{form.date}</span></div>
                <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{form.time}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{form.type}</span></div>
                <div><span className="text-muted-foreground">Fee:</span> <span className="font-medium text-teal-700 dark:text-teal-300">{formatRs(selectedDoctor?.consultationFee ?? 0)}</span></div>
                {form.type === "referral" && referralName && (
                  <div className="col-span-2"><span className="text-muted-foreground">Referred by:</span> <span className="font-medium">{referralName}</span></div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Booking…" : isGuest ? "Book Guest Appointment" : "Book Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
