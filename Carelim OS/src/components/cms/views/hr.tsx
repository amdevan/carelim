"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, UserPlus, UserCheck, CalendarDays, Wallet, Search, Pencil, Trash2,
  Building2, Download, Plus, Check, X, ChevronUp, ChevronDown,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination, useSort } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StaffAttendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string | null;
  designation: string | null;
  salary: number;
  joinDate: string;
  status: string;
  attendance: StaffAttendance[];
}

interface Department {
  id: string;
  name: string;
  code: string;
  color: string;
  _count: { doctors: number };
}

interface HrData {
  staff: Staff[];
  departments: Department[];
  prescriptions: unknown[];
}

interface Payroll {
  id: string;
  staffId: string;
  month: string;
  basicSalary: number;
  allowance: number;
  deduction: number;
  netPay: number;
  status: string;
  paidAt: string | null;
  staff: { id: string; name: string; email: string; role: string; department: string | null };
}

interface LeaveRequest {
  id: string;
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  createdAt: string;
  staff: { id: string; name: string; email: string; role: string; department: string | null };
}

const roleColors: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  doctor: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  nurse: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  receptionist: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  pharmacist: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  accountant: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  lab: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const attendanceDot: Record<string, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-500",
  absent: "bg-rose-500",
  leave: "bg-gray-400",
};

const ROLES = ["admin", "doctor", "nurse", "receptionist", "pharmacist", "accountant", "lab", "manager"];
const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];

const initials = (name: string) =>
  name.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase();

// Sortable column header (defined outside the view to satisfy static-components rule)
function SortHeader<T extends object>({
  k, sortKey, sortDir, onToggle, children, className = "",
}: {
  k: keyof T;
  sortKey: keyof T | "";
  sortDir: "asc" | "desc";
  onToggle: (k: keyof T) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        {sortKey === k ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : null}
      </button>
    </TableHead>
  );
}

export function HrView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const { data, loading } = useFetch<HrData>(
    refreshKey ? `/api/staff?_r=${refreshKey}` : "/api/staff",
  );

  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);

  const staff = data?.staff ?? [];
  const departments = data?.departments ?? [];

  const presentToday = useMemo(
    () =>
      staff.filter((s) => {
        if (!s.attendance?.length) return false;
        const latest = [...s.attendance].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
        return latest.status === "present";
      }).length,
    [staff],
  );

  const onLeave = staff.filter((s) => s.status === "on_leave").length;
  const monthlyPayroll = staff.reduce((sum, s) => sum + (s.salary || 0), 0);

  const filteredStaff = useMemo(() => {
    const ql = q.toLowerCase().trim();
    if (!ql) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(ql) ||
        s.role.toLowerCase().includes(ql) ||
        (s.department ?? "").toLowerCase().includes(ql) ||
        (s.email ?? "").toLowerCase().includes(ql),
    );
  }, [staff, q]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<Staff>(filteredStaff, "name");
  const staffPage = usePagination<Staff>(sorted, 10);

  const kpis = [
    { label: "Total Employees", value: staff.length.toString(), icon: Users, accent: "from-teal-500 to-teal-600" },
    { label: "Present Today", value: presentToday.toString(), icon: UserCheck, accent: "from-emerald-500 to-emerald-600" },
    { label: "On Leave", value: onLeave.toString(), icon: CalendarDays, accent: "from-amber-500 to-orange-500" },
    { label: "Monthly Payroll", value: formatRs(monthlyPayroll), icon: Wallet, accent: "from-violet-500 to-violet-600" },
  ];

  const exportStaffCSV = () => {
    exportToCSV(
      "staff-directory",
      ["Name", "Email", "Phone", "Role", "Department", "Designation", "Salary", "Join Date", "Status"],
      staff.map((s) => [
        s.name, s.email, s.phone, s.role, s.department ?? "",
        s.designation ?? "", s.salary, formatDate(s.joinDate), s.status,
      ]),
    );
    toast.success("Staff directory exported to CSV");
  };

  const handleDelete = async () => {
    if (!deleteStaff) return;
    try {
      const res = await fetchAPI(`/api/staff/${deleteStaff.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${deleteStaff.name} removed`);
      setDeleteStaff(null);
      refresh();
    } catch {
      toast.error("Failed to delete employee");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold">HR &amp; Staff Management</h2>
          <p className="text-sm text-muted-foreground">{staff.length} employees across {departments.length} departments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportStaffCSV}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                    <k.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight truncate">{k.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff">
        <TabsList className="w-fit overflow-x-auto">
          <TabsTrigger value="staff" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Staff</TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Departments</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><Wallet className="w-3.5 h-3.5" /> Payroll</TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Leave</TabsTrigger>
        </TabsList>

        {/* Staff tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Staff Directory</CardTitle>
                  <CardDescription className="text-xs">All employees and their roles</CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, role, email…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden mx-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <SortHeader<Staff> k="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Name</SortHeader>
                      <SortHeader<Staff> k="role" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Role</SortHeader>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="hidden lg:table-cell">Designation</TableHead>
                      <SortHeader<Staff> k="salary" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="hidden md:table-cell text-right">Salary</SortHeader>
                      <SortHeader<Staff> k="joinDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="hidden sm:table-cell">Join Date</SortHeader>
                      <SortHeader<Staff> k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Status</SortHeader>
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
                    ) : staffPage.paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                          No staff found
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffPage.paged.map((s) => (
                        <TableRow key={s.id} className="hover:bg-accent/40">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold">
                                  {initials(s.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleColors[s.role.toLowerCase()] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                              {s.role}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{s.department || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{s.designation || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm font-medium text-right">{formatRs(s.salary)}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(s.joinDate)}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${statusColors[s.status] || "bg-gray-100 text-gray-700"}`}>
                              {statusLabel(s.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600" onClick={() => setEditStaff(s)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setDeleteStaff(s)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <Pagination
                  page={staffPage.page}
                  totalPages={staffPage.totalPages}
                  setPage={staffPage.setPage}
                  size={staffPage.size}
                  setSize={staffPage.setSize}
                  range={staffPage.range}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Departments</CardTitle>
              <CardDescription className="text-xs">{departments.length} departments · {departments.reduce((sum, d) => sum + d._count.doctors, 0)} doctors total</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {departments.map((d) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                          <div>
                            <p className="font-semibold text-sm">{d.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{d.code}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Users className="w-3 h-3" /> {d._count.doctors} doctors
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[11px] text-muted-foreground">Dept ID: {d.id.slice(-6)}</span>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {d._count.doctors > 0 ? "Active" : "Empty"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Attendance — Last 7 Days</CardTitle>
                  <CardDescription className="text-xs">Daily status per employee</CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Leave</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-lg border overflow-hidden mx-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="sticky left-0 bg-muted/50">Employee</TableHead>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        return (
                          <TableHead key={i} className="text-center text-xs">
                            {d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : staff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                          No attendance records
                        </TableCell>
                      </TableRow>
                    ) : (
                      staff.map((s) => {
                        const last7 = Array.from({ length: 7 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          return d;
                        });
                        return (
                          <TableRow key={s.id} className="hover:bg-accent/40">
                            <TableCell className="sticky left-0 bg-card">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-7 h-7">
                                  <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-[10px] font-semibold">
                                    {initials(s.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{s.name}</p>
                                  <p className="text-[11px] text-muted-foreground capitalize">{s.role}</p>
                                </div>
                              </div>
                            </TableCell>
                            {last7.map((day, idx) => {
                              const rec = s.attendance?.find(
                                (a) => new Date(a.date).toDateString() === day.toDateString(),
                              );
                              const status = rec?.status ?? "absent";
                              return (
                                <TableCell key={idx} className="text-center">
                                  <span
                                    className={`inline-block w-2.5 h-2.5 rounded-full ${attendanceDot[status] || "bg-gray-300"}`}
                                    title={status}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll tab */}
        <TabsContent value="payroll">
          <PayrollTab refreshKey={refreshKey} refresh={refresh} />
        </TabsContent>

        {/* Leave tab */}
        <TabsContent value="leave">
          <LeaveTab refreshKey={refreshKey} refresh={refresh} staff={staff} />
        </TabsContent>
      </Tabs>

      {/* Add Employee dialog */}
      <StaffFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        departments={departments.map((d) => d.name)}
        onSaved={() => { setAddOpen(false); refresh(); }}
      />

      {/* Edit Employee dialog */}
      {editStaff && (
        <StaffFormDialog
          open={!!editStaff}
          onOpenChange={(o) => !o && setEditStaff(null)}
          staff={editStaff}
          departments={departments.map((d) => d.name)}
          onSaved={() => { setEditStaff(null); refresh(); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteStaff} onOpenChange={(o) => !o && setDeleteStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteStaff?.name}</strong> from the staff directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============== Staff Form Dialog (Add / Edit) ==============
function StaffFormDialog({
  open, onOpenChange, staff, departments, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff?: Staff | null;
  departments: string[];
  onSaved: () => void;
}) {
  const isEdit = !!staff;
  const [form, setForm] = useState({
    name: staff?.name ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    role: staff?.role ?? "receptionist",
    department: staff?.department ?? "",
    designation: staff?.designation ?? "",
    salary: staff?.salary ?? 0,
    joinDate: staff?.joinDate ? staff.joinDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: staff?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  // Reset form when target staff changes (open a different one)
  const staffId = staff?.id;
  const [lastStaffId, setLastStaffId] = useState<string | undefined>(staffId);
  if (staffId !== lastStaffId) {
    setLastStaffId(staffId);
    setForm({
      name: staff?.name ?? "",
      email: staff?.email ?? "",
      phone: staff?.phone ?? "",
      role: staff?.role ?? "receptionist",
      department: staff?.department ?? "",
      designation: staff?.designation ?? "",
      salary: staff?.salary ?? 0,
      joinDate: staff?.joinDate ? staff.joinDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: staff?.status ?? "active",
    });
  }

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        salary: Number(form.salary) || 0,
        department: form.department || null,
        designation: form.designation || null,
        joinDate: form.joinDate ? new Date(form.joinDate).toISOString() : new Date().toISOString(),
      };
      const res = isEdit
        ? await fetchAPI(`/api/staff/${staff!.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await fetchAPI("/api/staff", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("Failed");
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update employee" : "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update staff details" : "Create a new staff record"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dr. John Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@carelim.health" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+977-98XXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department || "__none__"} onValueChange={(v) => set("department", v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Senior Receptionist" />
          </div>
          <div className="space-y-1.5">
            <Label>Salary (Rs)</Label>
            <Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Join Date</Label>
            <Input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Saving…" : isEdit ? "Update Employee" : "Add Employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Payroll Tab ==============
function PayrollTab({ refreshKey, refresh }: { refreshKey: number; refresh: () => void }) {
  const { data, loading } = useFetch<Payroll[]>(
    refreshKey ? `/api/payroll?_r=${refreshKey}` : "/api/payroll",
  );
  const { data: staffData } = useFetch<HrData>("/api/staff");
  const [genOpen, setGenOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const payrolls = data ?? [];
  const staffList = staffData?.staff ?? [];

  const handleMarkPaid = async (p: Payroll) => {
    setMarkingPaid(p.id);
    try {
      const res = await fetchAPI(`/api/payroll/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Payroll for ${p.staff.name} marked as paid`);
      refresh();
    } catch {
      toast.error("Failed to update payroll");
    } finally {
      setMarkingPaid(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Payroll Records</CardTitle>
            <CardDescription className="text-xs">{payrolls.length} payroll entries · {payrolls.filter((p) => p.status === "pending").length} pending</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white self-start" onClick={() => setGenOpen(true)}>
            <Plus className="w-4 h-4" /> Generate Payroll
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg border overflow-hidden mx-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Staff</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="hidden md:table-cell text-right">Basic</TableHead>
                <TableHead className="hidden md:table-cell text-right">Allowance</TableHead>
                <TableHead className="hidden md:table-cell text-right">Deduction</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No payroll records yet. Generate one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map((p) => (
                  <TableRow key={p.id} className="hover:bg-accent/40">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-[10px] font-semibold">
                            {initials(p.staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{p.staff.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{p.staff.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{p.month}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-right">{formatRs(p.basicSalary)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-right text-emerald-600">+{formatRs(p.allowance)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-right text-rose-600">-{formatRs(p.deduction)}</TableCell>
                    <TableCell className="text-sm font-bold text-right">{formatRs(p.netPay)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[p.status] || "bg-gray-100 text-gray-700"}`}>
                        {statusLabel(p.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-600 gap-1"
                          disabled={markingPaid === p.id}
                          onClick={() => handleMarkPaid(p)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {markingPaid === p.id ? "Marking…" : "Mark Paid"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.paidAt ? `Paid ${formatDate(p.paidAt)}` : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <GeneratePayrollDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        staff={staffList}
        onSaved={() => { setGenOpen(false); refresh(); }}
      />
    </Card>
  );
}

function GeneratePayrollDialog({
  open, onOpenChange, staff, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: Staff[];
  onSaved: () => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [saving, setSaving] = useState(false);

  const netPay = (Number(basicSalary) || 0) + (Number(allowance) || 0) - (Number(deduction) || 0);

  const onStaffChange = (id: string) => {
    setStaffId(id);
    const s = staff.find((x) => x.id === id);
    if (s) setBasicSalary(s.salary);
  };

  const submit = async () => {
    if (!staffId) { toast.error("Select an employee"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId, month,
          basicSalary: Number(basicSalary) || 0,
          allowance: Number(allowance) || 0,
          deduction: Number(deduction) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Payroll generated");
      onSaved();
    } catch {
      toast.error("Failed to generate payroll");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Payroll</DialogTitle>
          <DialogDescription>Create a new payroll entry for an employee</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={staffId || "__none__"} onValueChange={onStaffChange}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Select employee…</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Basic</Label>
              <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Allowance</Label>
              <Input type="number" value={allowance} onChange={(e) => setAllowance(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deduction</Label>
              <Input type="number" value={deduction} onChange={(e) => setDeduction(Number(e.target.value))} />
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Net Pay</span>
            <span className="text-lg font-bold text-teal-600">{formatRs(netPay)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Generating…" : "Generate Payroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Leave Tab ==============
function LeaveTab({
  refreshKey, refresh, staff,
}: { refreshKey: number; refresh: () => void; staff: Staff[] }) {
  const { data, loading } = useFetch<LeaveRequest[]>(
    refreshKey ? `/api/leave?_r=${refreshKey}` : "/api/leave",
  );
  const [applyOpen, setApplyOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const leaves = data ?? [];

  const updateStatus = async (l: LeaveRequest, status: "approved" | "rejected") => {
    setPendingId(l.id);
    try {
      const res = await fetchAPI(`/api/leave/${l.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Leave ${status} for ${l.staff.name}`);
      refresh();
    } catch {
      toast.error("Failed to update leave");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Leave Requests</CardTitle>
            <CardDescription className="text-xs">{leaves.length} requests · {leaves.filter((l) => l.status === "pending").length} pending review</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white self-start" onClick={() => setApplyOpen(true)}>
            <Plus className="w-4 h-4" /> Apply Leave
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg border overflow-hidden mx-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Start</TableHead>
                <TableHead className="hidden md:table-cell">End</TableHead>
                <TableHead className="hidden lg:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No leave requests yet
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((l) => (
                  <TableRow key={l.id} className="hover:bg-accent/40">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-[10px] font-semibold">
                            {initials(l.staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{l.staff.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{l.staff.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{formatDate(l.startDate)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{formatDate(l.endDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[220px] truncate">
                      {l.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[l.status] || "bg-gray-100 text-gray-700"}`}>
                        {statusLabel(l.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={pendingId === l.id}
                            onClick={() => updateStatus(l, "approved")}
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
                            disabled={pendingId === l.id}
                            onClick={() => updateStatus(l, "rejected")}
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">{l.status}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ApplyLeaveDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        staff={staff}
        onSaved={() => { setApplyOpen(false); refresh(); }}
      />
    </Card>
  );
}

function ApplyLeaveDialog({
  open, onOpenChange, staff, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: Staff[];
  onSaved: () => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [type, setType] = useState("casual");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!staffId) { toast.error("Select an employee"); return; }
    if (new Date(endDate) < new Date(startDate)) { toast.error("End date must be on or after start date"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId, type, startDate, endDate, reason,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Leave request submitted");
      onSaved();
    } catch {
      toast.error("Failed to submit leave");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>Submit a leave request on behalf of an employee</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select value={staffId || "__none__"} onValueChange={setStaffId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Select employee…</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for leave…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Submitting…" : "Submit Leave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
