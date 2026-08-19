"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Search, Plus, Download, Star, Clock, Users, DollarSign, Activity,
  Video, FileText, FlaskConical, Scan, Stethoscope, MoreHorizontal,
  Calendar, TrendingUp, Phone, Mail, Award, MapPin, Pencil, Trash2, UserCircle,
  Building2,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel, timeAgo } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { useAppStore } from "@/store/app-store";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Doctor {
  id: string; name: string; email: string; phone: string; gender: string;
  qualification: string; specialization: string; departmentId: string;
  licenseNumber: string; experience: number; consultationFee: number;
  commissionPct: number; rating: number; workingDays: string;
  startTime: string; endTime: string; status: string; createdAt: string;
  department: { id: string; name: string; color: string };
}

interface DashboardData {
  kpis: { totalDoctors: number; activeNow: number; availableNow: number; inConsultation: number; todayPatients: number; todayRevenue: number; departments: number; branches: number };
  deptStats: { name: string; color: string; count: number }[];
  topPerformers: { id: string; name: string; specialization: string; rating: number; department: string; departmentColor: string; consultationFee: number; status: string; monthAppts: number; completedAppts: number; revenue: number }[];
  statusDist: Record<string, number>;
}

interface WorkspaceData {
  doctor: Doctor;
  currentPatient: { name: string; token: number; patientCode: string } | null;
  waitingCount: number;
  completedCount: number;
  todayRevenue: number;
  monthAppts: number;
  monthCompleted: number;
  monthRevenue: number;
  pendingLabs: number;
  todayAppointments: { id: string; time: string; patient: string; patientCode: string; status: string; token: number }[];
  timeline: { time: string; action: string; detail: string; type: string }[];
}

interface Department {
  id: string; name: string; color: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  active: { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950/50", dot: "bg-emerald-500", label: "Available" },
  on_leave: { color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-950/50", dot: "bg-rose-500", label: "On Leave" },
  inactive: { color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800", dot: "bg-gray-400", label: "Inactive" },
};

const TIMELINE_COLORS: Record<string, string> = {
  completed: "bg-emerald-500",
  "in-consult": "bg-teal-500",
  "checked-in": "bg-amber-500",
  scheduled: "bg-cyan-500",
  prescription: "bg-violet-500",
  lab: "bg-rose-500",
};

export function DoctorsView() {
  const [tick, setTick] = useState(0);
  const { data: doctors, loading } = useFetch<Doctor[]>(tick ? `/api/doctors?_r=${tick}` : "/api/doctors");
  const { data: dashData } = useFetch<DashboardData>("/api/doctor-dashboard");
  const { setView } = useAppStore();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState("workspace");
  const [addOpen, setAddOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deleteDoctor, setDeleteDoctor] = useState<Doctor | null>(null);
  const [deptTab, setDeptTab] = useState("doctors");
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<Department | null>(null);
  const [deptTick, setDeptTick] = useState(0);
  const { data: departmentsData, loading: deptLoading } = useFetch<Department[]>(`/api/departments?_r=${deptTick}`);
  const refreshDepts = useCallback(() => setDeptTick((t) => t + 1), []);
  const doRefresh = () => setTick(t => t + 1);

  const allDepartments = departmentsData || [];

  const deleteDept = async () => {
    if (!deleteDeptTarget) return;
    try {
      const res = await fetchAPI(`/api/departments/${deleteDeptTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Department "${deleteDeptTarget.name}" deleted`);
      refreshDepts();
    } catch {
      toast.error("Failed to delete department");
    } finally {
      setDeleteDeptTarget(null);
    }
  };

  const departments = useMemo(() => {
    const depts = new Map<string, string>();
    (doctors || []).forEach(d => depts.set(d.department.id, d.department.name));
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
  }, [doctors]);

  const filtered = useMemo(() => {
    if (!doctors) return [];
    const q = search.toLowerCase();
    return doctors.filter(d => {
      if (q && !d.name.toLowerCase().includes(q) && !d.specialization.toLowerCase().includes(q) && !d.email.toLowerCase().includes(q)) return false;
      if (deptFilter !== "all" && d.departmentId !== deptFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (ratingFilter === "4.5" && d.rating < 4.5) return false;
      if (ratingFilter === "4.0" && d.rating < 4.0) return false;
      return true;
    });
  }, [doctors, search, deptFilter, statusFilter, ratingFilter]);

  const pagination = usePagination<Doctor>(filtered, 9);

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("doctors", ["Name", "Specialization", "Department", "Qualification", "Experience", "Rating", "Consultation Fee", "Status", "Email", "Phone"],
      filtered.map(d => [d.name, d.specialization, d.department.name, d.qualification, d.experience, d.rating, d.consultationFee, d.status, d.email, d.phone]));
    toast.success("Exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Doctor Operations Center</h2>
          <p className="text-sm text-muted-foreground">{doctors?.length || 0} doctors · {dashData?.kpis.departments || 0} departments · {dashData?.kpis.branches || 0} branches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Doctor</Button>
        </div>
      </div>

      {/* Top Analytics Bar */}
      {dashData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Doctors" value={dashData.kpis.totalDoctors} icon={Stethoscope} accent="from-teal-500 to-teal-600" trend="+2" index={0} />
          <KpiCard label="Available Now" value={dashData.kpis.availableNow} icon={Activity} accent="from-emerald-500 to-emerald-600" subtitle={`${Math.round(dashData.kpis.availableNow / Math.max(dashData.kpis.totalDoctors, 1) * 100)}% online`} index={1} />
          <KpiCard label="In Consultation" value={dashData.kpis.inConsultation} icon={Video} accent="from-cyan-500 to-cyan-600" subtitle="Live" index={2} />
          <KpiCard label="Today's Patients" value={dashData.kpis.todayPatients} icon={Users} accent="from-amber-500 to-orange-500" trend="+12%" index={3} />
          <KpiCard label="Revenue Today" value={formatRs(dashData.kpis.todayRevenue)} icon={DollarSign} accent="from-violet-500 to-purple-600" trend="+8.4%" index={4} />
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={deptTab} onValueChange={setDeptTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="doctors" className="gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Doctors</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="doctors" className="space-y-4 mt-4">
          {/* Advanced Search & Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search doctor name, specialization, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs"><SelectValue placeholder="Availability" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Available</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs"><SelectValue placeholder="Rating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="4.5">≥ 4.5 ★</SelectItem>
                    <SelectItem value="4.0">≥ 4.0 ★</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Smart Doctor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagination.paged.map((doc, i) => (
              <SmartDoctorCard
                key={doc.id}
                doctor={doc}
                index={i}
                onOpenWorkspace={() => { setWorkspaceTab("workspace"); setSelected(doc); }}
                onOpenSchedule={() => { setWorkspaceTab("schedule"); setSelected(doc); }}
                onEdit={() => setEditDoctor(doc)}
                onDelete={() => setDeleteDoctor(doc)}
              />
            ))}
          </div>

          {pagination.total > 0 && (
            <Card><CardContent className="p-2"><Pagination {...pagination} /></CardContent></Card>
          )}
          {pagination.total === 0 && <EmptyState icon={Stethoscope} title="No doctors found" description="Try adjusting your search or filters" />}
        </TabsContent>

        {/* ============ DEPARTMENTS TAB ============ */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600" /> Departments
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {departmentsData?.length ?? 0} department{(departmentsData?.length ?? 0) === 1 ? "" : "s"} registered
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => { setEditDept(null); setAddDeptOpen(true); }}
                >
                  <Plus className="w-4 h-4" /> Add Department
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deptLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : !departmentsData || departmentsData.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">No departments yet. Add your first department to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {departmentsData.map((dept) => (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color || "#0d9488" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{dept.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{dept.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                          onClick={() => { setEditDept(dept); setAddDeptOpen(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setDeleteDeptTarget(dept)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clinical Workspace Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <ClinicalWorkspace key={selected.id + workspaceTab} doctor={selected} initialTab={workspaceTab} />}
        </SheetContent>
      </Sheet>

      {/* Add Doctor Dialog */}
      <DoctorFormDialog open={addOpen} onOpenChange={setAddOpen} departments={allDepartments} onSaved={() => { setAddOpen(false); doRefresh(); }} />

      {/* Edit Doctor Dialog */}
      <DoctorFormDialog open={!!editDoctor} onOpenChange={(o) => { if (!o) setEditDoctor(null); }} doctor={editDoctor || undefined} departments={allDepartments} onSaved={() => { setEditDoctor(null); doRefresh(); }} />

      {/* Delete Doctor AlertDialog */}
      <AlertDialog open={!!deleteDoctor} onOpenChange={(o) => { if (!o) setDeleteDoctor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDoctor?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async () => {
                if (!deleteDoctor) return;
                try {
                  const res = await fetchAPI(`/api/doctors/${deleteDoctor.id}`, { method: "DELETE" });
                  if (!res.ok) throw new Error();
                  toast.success(`Doctor ${deleteDoctor.name} deleted`);
                  setDeleteDoctor(null);
                  doRefresh();
                } catch {
                  toast.error("Failed to delete doctor");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Department Dialog */}
      <AddDepartmentDialog
        open={addDeptOpen}
        editDept={editDept}
        onOpenChange={(v) => { setAddDeptOpen(v); if (!v) setEditDept(null); }}
        onSaved={() => { setAddDeptOpen(false); setEditDept(null); refreshDepts(); doRefresh(); }}
      />

      {/* Delete department confirmation */}
      <AlertDialog open={!!deleteDeptTarget} onOpenChange={(o) => !o && setDeleteDeptTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDeptTarget && (
                <>This will permanently delete <span className="font-semibold">{deleteDeptTarget.name}</span>. Doctors assigned to this department may need to be reassigned.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={deleteDept}>
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SmartDoctorCard({ doctor, index, onOpenWorkspace, onOpenSchedule, onEdit, onDelete }: {
  doctor: Doctor; index: number; onOpenWorkspace: () => void; onOpenSchedule: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const cfg = STATUS_CONFIG[doctor.status] || STATUS_CONFIG.active;
  const initials = doctor.name.replace("Dr. ", "").split(" ").map(n => n[0]).slice(0, 2).join("");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }}>
      <Card className="card-hover relative overflow-hidden">
        {/* Status accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${cfg.dot}`} />
        <CardContent className="p-4">
          {/* Header: avatar + name + status */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="w-12 h-12 border-2 border-background shadow-sm shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate">{doctor.name}</h3>
                <span className={`flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${doctor.status === "active" ? "animate-pulse" : ""}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Award className="w-2.5 h-2.5" /> {doctor.qualification}</span>
                <span>·</span>
                <span className="font-mono">{doctor.licenseNumber}</span>
              </div>
            </div>
          </div>

          {/* Department badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doctor.department.color }} />
            <span className="text-xs font-medium">{doctor.department.name}</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="rounded-lg bg-muted/50 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Rating</p>
              <p className="text-sm font-bold flex items-center justify-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{doctor.rating}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Exp</p>
              <p className="text-sm font-bold">{doctor.experience}y</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Fee</p>
              <p className="text-sm font-bold tabular-nums">{formatRs(doctor.consultationFee)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-1.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Hours</p>
              <p className="text-[10px] font-bold">{doctor.startTime}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={onOpenWorkspace}>
              <Activity className="w-3 h-3" /> Workspace
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onOpenSchedule} title="View Schedule">
              <Calendar className="w-3 h-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" title="More options">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onOpenWorkspace}>
                  <Activity className="w-4 h-4 mr-2" /> Open Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSchedule}>
                  <Calendar className="w-4 h-4 mr-2" /> View Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit Doctor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ClinicalWorkspace({ doctor, initialTab = "workspace" }: { doctor: Doctor; initialTab?: string }) {
  const { data: ws, loading } = useFetch<WorkspaceData>(`/api/doctors/${doctor.id}/workspace`);
  const { setView } = useAppStore();
  const [tab, setTab] = useState(initialTab);
  const initials = doctor.name.replace("Dr. ", "").split(" ").map(n => n[0]).slice(0, 2).join("");
  const cfg = STATUS_CONFIG[doctor.status] || STATUS_CONFIG.active;

  return (
    <div>
      {/* Header */}
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start gap-3">
          <Avatar className="w-14 h-14 border-2 border-white shadow-sm shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg">{doctor.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{doctor.specialization} · {doctor.department.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${doctor.status === "active" ? "animate-pulse" : ""}`} />
                {cfg.label}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />{doctor.rating}</span>
              <span className="text-[10px] text-muted-foreground">{doctor.experience}y exp</span>
            </div>
          </div>
        </div>
      </SheetHeader>

      {/* Tabs */}
      <div className="px-6 pt-3 border-b">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="workspace" className="text-xs gap-1"><Activity className="w-3 h-3" /> Workspace</TabsTrigger>
            <TabsTrigger value="overview" className="text-xs gap-1"><FileText className="w-3 h-3" /> Overview</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs gap-1"><Calendar className="w-3 h-3" /> Schedule</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs gap-1"><TrendingUp className="w-3 h-3" /> Performance</TabsTrigger>
          </TabsList>

          {/* Workspace Tab */}
          <TabsContent value="workspace" className="mt-4 pb-6 space-y-4">
            {loading || !ws ? <Skeleton className="h-64 rounded-xl" /> : (
              <>
                {/* Live Session */}
                {ws.currentPatient && (
                  <div className="rounded-xl border-2 border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">Live Session · Current Patient</span>
                      <span className="flex items-center gap-1 text-[10px] text-teal-600"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold">{ws.currentPatient.name}</p>
                        <p className="text-xs text-muted-foreground">Token #{ws.currentPatient.token} · {ws.currentPatient.patientCode}</p>
                      </div>
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={() => { setView("emr"); toast.success("Opening EMR for consultation"); }}>
                        <Stethoscope className="w-3.5 h-3.5" /> Consult
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg border p-2.5 text-center">
                    <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold tabular-nums">{ws.waitingCount}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Waiting</p>
                  </div>
                  <div className="rounded-lg border p-2.5 text-center">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold tabular-nums">{ws.completedCount}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Done Today</p>
                  </div>
                  <div className="rounded-lg border p-2.5 text-center">
                    <FlaskConical className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-lg font-bold tabular-nums">{ws.pendingLabs}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Pending Labs</p>
                  </div>
                  <div className="rounded-lg border p-2.5 text-center">
                    <DollarSign className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-sm font-bold tabular-nums">{formatRs(ws.todayRevenue)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Today Revenue</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <p className="text-xs font-semibold mb-2">Quick Actions</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Consultation", icon: Stethoscope, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30", action: () => { setView("emr"); toast.success("Opening EMR — Consultation"); } },
                      { label: "Prescription", icon: FileText, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30", action: () => { setView("emr"); toast.success("Opening EMR — Prescription"); } },
                      { label: "Order Lab", icon: FlaskConical, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30", action: () => { setView("laboratory"); toast.success("Opening Laboratory — Order Lab"); } },
                      { label: "Radiology", icon: Scan, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", action: () => { setView("radiology"); toast.success("Opening Radiology — Order Imaging"); } },
                      { label: "Video Call", icon: Video, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30", action: () => toast.info("Video call — Connect telecom provider to enable") },
                      { label: "AI Notes", icon: Activity, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", action: () => { setView("emr"); toast.success("Opening EMR — AI Clinical Notes"); } },
                    ].map(a => (
                      <button key={a.label} onClick={a.action} className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 hover:shadow-sm transition-all ${a.color}`}>
                        <a.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Today's Timeline */}
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-teal-600" /> Today's Timeline</p>
                  <div className="relative">
                    <div className="absolute left-3 top-1 bottom-1 w-px bg-border" />
                    <div className="space-y-2">
                      {ws.timeline.map((t, i) => (
                        <div key={i} className="relative flex gap-3 pl-0">
                          <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${TIMELINE_COLORS[t.type] || "bg-gray-400"}`}>
                            <span className="w-2 h-2 rounded-full bg-white" />
                          </div>
                          <div className="flex-1 rounded-lg border px-3 py-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{t.action}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{t.time}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{t.detail}</p>
                          </div>
                        </div>
                      ))}
                      {ws.timeline.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No activity yet today</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 pb-6 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Qualification</p><p className="font-medium">{doctor.qualification}</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">License</p><p className="font-mono text-xs">{doctor.licenseNumber}</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Experience</p><p className="font-medium">{doctor.experience} years</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Consultation Fee</p><p className="font-medium">{formatRs(doctor.consultationFee)}</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Commission</p><p className="font-medium">{doctor.commissionPct}%</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Rating</p><p className="font-medium flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{doctor.rating}</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Phone</p><p className="font-medium flex items-center gap-1"><Phone className="w-3 h-3" />{doctor.phone}</p></div>
              <div className="rounded-lg border px-3 py-2"><p className="text-[10px] text-muted-foreground">Email</p><p className="font-medium truncate">{doctor.email}</p></div>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Working Days</p>
              <div className="flex gap-1 mt-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                  <span key={day} className={`text-[10px] px-2 py-0.5 rounded ${doctor.workingDays.includes(day) ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 font-medium" : "bg-muted text-muted-foreground"}`}>{day}</span>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-4 pb-6">
            <DoctorScheduleManager doctorId={doctor.id} todayAppointments={loading || !ws ? [] : ws.todayAppointments} />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4 pb-6 space-y-3">
            {loading || !ws ? <Skeleton className="h-48 rounded-xl" /> : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold tabular-nums text-teal-600">{ws.monthAppts}</p><p className="text-[10px] text-muted-foreground uppercase">Monthly Appts</p></div>
                  <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold tabular-nums text-emerald-600">{ws.monthCompleted}</p><p className="text-[10px] text-muted-foreground uppercase">Completed</p></div>
                  <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold tabular-nums text-violet-600">{formatRs(ws.monthRevenue)}</p><p className="text-[10px] text-muted-foreground uppercase">Revenue</p></div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">Patient Satisfaction</span><span className="text-xs font-bold flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{doctor.rating} / 5</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${(doctor.rating / 5) * 100}%` }} /></div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">Follow-up Rate</span><span className="text-xs font-bold">72%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: "72%" }} /></div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

// ---------- Add/Edit Doctor Dialog ----------
function DoctorFormDialog({ open, onOpenChange, doctor, departments, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctor?: Doctor;
  departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", gender: "male", qualification: "MBBS",
    specialization: "", departmentId: "", licenseNumber: "",
    experience: "0", consultationFee: "500", commissionPct: "15",
    startTime: "09:00", endTime: "17:00", status: "active",
  });
  const [saving, setSaving] = useState(false);

  // Sync form when dialog opens or doctor changes
  useEffectWhenOpen(open, () => {
    if (doctor) {
      setForm({
        name: doctor.name, email: doctor.email, phone: doctor.phone,
        gender: doctor.gender, qualification: doctor.qualification,
        specialization: doctor.specialization, departmentId: doctor.departmentId,
        licenseNumber: doctor.licenseNumber, experience: String(doctor.experience),
        consultationFee: String(doctor.consultationFee), commissionPct: String(doctor.commissionPct),
        startTime: doctor.startTime, endTime: doctor.endTime, status: doctor.status,
      });
    } else {
      setForm({
        name: "", email: "", phone: "", gender: "male", qualification: "MBBS",
        specialization: "", departmentId: departments[0]?.id || "",
        licenseNumber: "", experience: "0", consultationFee: "500", commissionPct: "15",
        startTime: "09:00", endTime: "17:00", status: "active",
      });
    }
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.departmentId) {
      toast.error("Name, email, and department are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        experience: Number(form.experience) || 0,
        consultationFee: Number(form.consultationFee) || 0,
        commissionPct: Number(form.commissionPct) || 0,
        rating: doctor?.rating ?? 4.5,
        workingDays: doctor?.workingDays ?? "Mon,Tue,Wed,Thu,Fri",
      };
      const res = await fetch(
        doctor ? `/api/doctors/${doctor.id}` : "/api/doctors",
        {
          method: doctor ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error();
      toast.success(doctor ? "Doctor updated" : "Doctor added");
      onSaved();
    } catch {
      toast.error("Failed to save doctor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{doctor ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
          <DialogDescription>{doctor ? "Update doctor information" : "Register a new doctor in the system"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name *</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="doctor@carelim.health" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98XXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Qualification</Label>
              <Select value={form.qualification} onValueChange={v => setForm({ ...form, qualification: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="MBBS">MBBS</SelectItem><SelectItem value="MBBS, MD">MBBS, MD</SelectItem><SelectItem value="MBBS, MS">MBBS, MS</SelectItem><SelectItem value="MBBS, MD, DM">MBBS, MD, DM</SelectItem><SelectItem value="MBBS, FCPS">MBBS, FCPS</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiologist" />
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>License Number</Label>
              <Input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="NMC-XXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Experience (years)</Label>
              <Input type="number" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Consultation Fee (Rs.)</Label>
              <Input type="number" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Commission (%)</Label>
              <Input type="number" value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">{saving ? "Saving…" : doctor ? "Update Doctor" : "Add Doctor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Add/Edit Department Dialog ----------
const DEPT_COLORS = [
  "#0d9488", "#7c3aed", "#2563eb", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#9333ea", "#e11d48",
];

function AddDepartmentDialog({
  open, editDept, onOpenChange, onSaved,
}: {
  open: boolean;
  editDept: Department | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEPT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editDept) {
        setName(editDept.name);
        setColor(editDept.color || DEPT_COLORS[0]);
      } else {
        setName("");
        setColor(DEPT_COLORS[0]);
      }
    }
  }, [open, editDept]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Department name is required"); return; }
    setSaving(true);
    try {
      const isEdit = !!editDept;
      const url = isEdit ? `/api/departments/${editDept.id}` : "/api/departments";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetchAPI(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(isEdit ? `Department "${name.trim()}" updated` : `Department "${name.trim()}" created`);
      onSaved();
    } catch {
      toast.error(editDept ? "Failed to update department" : "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editDept ? <Pencil className="w-5 h-5 text-teal-600" /> : <Plus className="w-5 h-5 text-teal-600" />}
            {editDept ? "Edit Department" : "Add Department"}
          </DialogTitle>
          <DialogDescription>
            {editDept ? "Update department details below." : "Create a new department for organizing doctors."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Department Name *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology, Neurology, Orthopedics…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Used as a visual indicator across the system</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? (editDept ? "Saving…" : "Creating…") : (editDept ? "Save Changes" : "Create Department")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper hook to run an effect when a dialog opens
function useEffectWhenOpen(open: boolean, fn: () => void) {
  const ref = useRef(false);
  useEffect(() => {
    if (open && !ref.current) {
      ref.current = true;
      fn();
    }
    if (!open) ref.current = false;
  }, [open]);
}

// ---------- Doctor Schedule Manager ----------
interface ScheduleSlot {
  id: string; doctorId: string; dayName: string; startTime: string; endTime: string;
  slotDuration: number; capacity: number; bookedCount: number; status: string; notes: string | null;
}

function DoctorScheduleManager({ doctorId, todayAppointments }: {
  doctorId: string;
  todayAppointments: { id: string; time: string; patient: string; patientCode: string; status: string; token: number }[];
}) {
  const [refresh, setRefresh] = useState(0);
  const { data: slots, loading } = useFetch<ScheduleSlot[]>(refresh ? `/api/doctor-schedule?doctorId=${doctorId}&_r=${refresh}` : `/api/doctor-schedule?doctorId=${doctorId}`);
  const [addOpen, setAddOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [deleteSlot, setDeleteSlot] = useState<ScheduleSlot | null>(null);
  const doRefresh = () => setRefresh(r => r + 1);

  const SLOT_STATUS_COLORS: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    full: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    blocked: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    leave: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  const todayDay = new Date().toLocaleDateString("en-US", { weekday: "short" });

  // Stats
  const totalSlots = slots?.length || 0;
  const totalCapacity = (slots || []).reduce((s, sl) => s + sl.capacity, 0);
  const totalBooked = (slots || []).reduce((s, sl) => s + sl.bookedCount, 0);
  const availableSlots = (slots || []).filter(s => s.status === "available").length;

  return (
    <div className="space-y-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Schedule & Capacity ({totalSlots} days)</p>
        <Button size="sm" className="h-7 text-xs gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}>
          <Plus className="w-3 h-3" /> Add Slot
        </Button>
      </div>

      {/* Capacity Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-teal-600">{totalSlots}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Days</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-emerald-600">{totalCapacity}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Capacity</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-amber-600">{totalBooked}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Booked</p>
        </div>
        <div className="rounded-lg border p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-violet-600">{availableSlots}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Open</p>
        </div>
      </div>

      {/* Today's Appointments */}
      {todayAppointments.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">Today's Appointments ({todayAppointments.length})</p>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {todayAppointments.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tabular-nums w-10">{a.time}</span>
                  <div>
                    <p className="text-xs font-medium">{a.patient}</p>
                    <p className="text-[9px] text-muted-foreground">Token #{a.token} · {a.patientCode}</p>
                  </div>
                </div>
                <Badge className={`text-[8px] ${statusColors[a.status] || "bg-gray-100"}`}>{statusLabel(a.status)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Slots Table */}
      {loading ? <Skeleton className="h-40 rounded-xl" /> : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[10px] uppercase">Day</TableHead>
                <TableHead className="text-[10px] uppercase">Time</TableHead>
                <TableHead className="text-[10px] uppercase text-center">Duration</TableHead>
                <TableHead className="text-[10px] uppercase text-center">Capacity</TableHead>
                <TableHead className="text-[10px] uppercase text-center">Booked</TableHead>
                <TableHead className="text-[10px] uppercase">Status</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(slots || []).map(slot => {
                const isToday = slot.dayName === todayDay;
                const fillPct = slot.capacity > 0 ? Math.round((slot.bookedCount / slot.capacity) * 100) : 0;
                return (
                  <TableRow key={slot.id} className="table-row-hover">
                    <TableCell>
                      <p className="text-xs font-medium">{slot.dayName}</p>
                      {isToday && <Badge className="text-[8px] bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">Today</Badge>}
                    </TableCell>
                    <TableCell className="text-xs font-mono tabular-nums">{slot.startTime} - {slot.endTime}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums">{slot.slotDuration}min</TableCell>
                    <TableCell className="text-center text-xs font-semibold tabular-nums">{slot.capacity}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-semibold tabular-nums ${fillPct >= 100 ? "text-rose-600" : fillPct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
                          {slot.bookedCount}
                        </span>
                        <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${fillPct >= 100 ? "bg-rose-500" : fillPct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={`text-[8px] ${SLOT_STATUS_COLORS[slot.status] || ""}`}>{slot.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditSlot(slot)} title="Edit"><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-600" onClick={() => setDeleteSlot(slot)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(slots || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No schedule slots. Click "Add Slot" to create one.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Slot Dialog */}
      <ScheduleSlotDialog
        open={addOpen || !!editSlot}
        onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditSlot(null); } }}
        slot={editSlot || undefined}
        doctorId={doctorId}
        onSaved={() => { setAddOpen(false); setEditSlot(null); doRefresh(); }}
      />

      {/* Delete Slot */}
      <AlertDialog open={!!deleteSlot} onOpenChange={(o) => { if (!o) setDeleteSlot(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule Slot</AlertDialogTitle>
            <AlertDialogDescription>Delete the schedule for {deleteSlot?.dayName}? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
              if (!deleteSlot) return;
              try {
                await fetchAPI(`/api/doctor-schedule/${deleteSlot.id}`, { method: "DELETE" });
                toast.success("Schedule slot deleted");
                setDeleteSlot(null);
                doRefresh();
              } catch { toast.error("Failed to delete"); }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Schedule Slot Dialog ----------
function ScheduleSlotDialog({ open, onOpenChange, slot, doctorId, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slot?: ScheduleSlot;
  doctorId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    dayName: "Mon",
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: "15",
    capacity: "20",
    status: "available",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffectWhenOpen(open, () => {
    if (slot) {
      setForm({
        dayName: slot.dayName,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: String(slot.slotDuration),
        capacity: String(slot.capacity),
        status: slot.status,
        notes: slot.notes || "",
      });
    } else {
      setForm({ dayName: "Mon", startTime: "09:00", endTime: "17:00", slotDuration: "15", capacity: "20", status: "available", notes: "" });
    }
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { doctorId, dayName: form.dayName, startTime: form.startTime, endTime: form.endTime, slotDuration: Number(form.slotDuration), capacity: Number(form.capacity), status: form.status, notes: form.notes || null };
      const res = await fetch(
        slot ? `/api/doctor-schedule/${slot.id}` : "/api/doctor-schedule",
        { method: slot ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) throw new Error();
      toast.success(slot ? "Schedule updated" : "Schedule slot added");
      onSaved();
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{slot ? "Edit Schedule Slot" : "Add Schedule Slot"}</DialogTitle>
          <DialogDescription>Set day, time, and appointment capacity</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select value={form.dayName} onValueChange={v => setForm({ ...form, dayName: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mon">Monday</SelectItem>
                <SelectItem value="Tue">Tuesday</SelectItem>
                <SelectItem value="Wed">Wednesday</SelectItem>
                <SelectItem value="Thu">Thursday</SelectItem>
                <SelectItem value="Fri">Friday</SelectItem>
                <SelectItem value="Sat">Saturday</SelectItem>
                <SelectItem value="Sun">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Slot Duration (min)</Label>
              <Select value={form.slotDuration} onValueChange={v => setForm({ ...form, slotDuration: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="10">10 min</SelectItem><SelectItem value="15">15 min</SelectItem><SelectItem value="20">20 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="45">45 min</SelectItem><SelectItem value="60">60 min</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capacity (max patients)</Label>
              <Input type="number" min="1" required value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">{saving ? "Saving…" : slot ? "Update Slot" : "Add Slot"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
