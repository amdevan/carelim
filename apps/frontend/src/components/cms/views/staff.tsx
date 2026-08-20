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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  UserRound, Plus, Search, Download, Mail, Phone, Edit, Trash2, Briefcase,
} from "lucide-react";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface StaffResponse {
  staff: StaffMember[];
  departments: unknown[];
  prescriptions: unknown[];
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string | null;
  designation: string | null;
  joinDate: string;
  status: string;
}

const ROLES = ["admin", "doctor", "nurse", "receptionist", "pharmacist", "accountant", "lab", "manager"];
const DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Radiology", "Pathology", "Pharmacy", "Administration", "Emergency", "ICU"];

const roleColors: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  doctor: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  nurse: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  receptionist: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  pharmacist: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  accountant: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  lab: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
};

export function StaffView() {
  const [tick, setTick] = useState(0);
  const { data, loading } = useFetch<StaffResponse>(tick ? `/api/staff?_r=${tick}` : "/api/staff");
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);

  const allStaff = Array.isArray(data?.staff) ? data.staff : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allStaff.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [allStaff, search, roleFilter, statusFilter]);

  const pagination = usePagination<StaffMember>(filtered, 10);

  const activeStaff = allStaff.filter((s) => s.status === "active").length;
  const onLeaveStaff = allStaff.filter((s) => s.status === "on_leave").length;
  const departments = new Set(allStaff.map((s) => s.department).filter(Boolean)).size;

  const kpis = [
    { label: "Total Staff", value: allStaff.length, icon: UserRound, accent: "from-teal-500 to-teal-600" },
    { label: "Active", value: activeStaff, icon: Briefcase, accent: "from-emerald-500 to-emerald-600" },
    { label: "On Leave", value: onLeaveStaff, icon: Briefcase, accent: "from-amber-500 to-orange-500" },
    { label: "Departments", value: departments, icon: Briefcase, accent: "from-violet-500 to-purple-600" },
  ];

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("staff", ["Name", "Email", "Phone", "Role", "Department", "Designation", "Join Date", "Status"],
      filtered.map((s) => [s.name, s.email, s.phone, s.role, s.department ?? "", s.designation ?? "", formatDate(s.joinDate), s.status]));
    toast.success("Staff exported to CSV");
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
      toast.error("Failed to delete staff member");
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
          <h2 className="text-xl font-bold">Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            {allStaff.length} staff members · {activeStaff} active · {onLeaveStaff} on leave
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Staff
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

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or role…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Staff Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden mx-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Join Date</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell colSpan={8}>
                      <EmptyState icon={UserRound} title="No staff members found" description="Try adjusting your search or add a new staff member." />
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paged.map((s) => (
                    <TableRow key={s.id} className="hover:bg-accent/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.name.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate lg:hidden">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleColors[s.role.toLowerCase()] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                          {s.role}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{s.department || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {s.email}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {s.phone}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(s.joinDate)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[s.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabel(s.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600" onClick={() => setEditStaff(s)}>
                            <Edit className="w-3.5 h-3.5" />
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
            <Pagination {...pagination} />
          </div>
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <StaffFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => { setAddOpen(false); refresh(); }} />

      {/* Edit Staff Dialog */}
      <StaffFormDialog open={!!editStaff} onOpenChange={(o) => { if (!o) setEditStaff(null); }} staff={editStaff} onSaved={() => { setEditStaff(null); refresh(); }} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStaff} onOpenChange={(o) => { if (!o) setDeleteStaff(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteStaff?.name}</strong> from the staff directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============== Staff Form Dialog ==============
function StaffFormDialog({
  open, onOpenChange, staff, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff?: StaffMember | null;
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
  });
  const [saving, setSaving] = useState(false);

  const [lastId, setLastId] = useState<string | undefined>(staff?.id);
  if (staff?.id !== lastId) {
    setLastId(staff?.id);
    setForm({
      name: staff?.name ?? "",
      email: staff?.email ?? "",
      phone: staff?.phone ?? "",
      role: staff?.role ?? "receptionist",
      department: staff?.department ?? "",
      designation: staff?.designation ?? "",
    });
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        department: form.department || null,
        designation: form.designation || null,
      };
      const res = isEdit
        ? await fetchAPI(`/api/staff/${staff!.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        : await fetchAPI("/api/staff", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("Failed");
      toast.success(isEdit ? "Staff member updated" : "Staff member added");
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update staff" : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@carelim.health" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
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
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Designation</Label>
            <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Senior Nurse" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Saving…" : isEdit ? "Update Staff" : "Add Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
