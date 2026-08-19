"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/lib/use-fetch";
import { fetchAPI } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, timeAgo } from "@/lib/format";
import {
  Plus, MoreVertical, Edit, Trash2, Search, Filter,
  Users, Calendar, Clock, CheckCircle, XCircle, UserCheck,
  FileText, Award, Briefcase,
} from "lucide-react";
import { EmptyState } from "@/components/cms/empty-state";

// ============================================================================
// Staff Module
// ============================================================================
interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  hireDate: string;
  status: "active" | "inactive" | "on_leave";
  avatar?: string;
}

export function HRStaff(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: staff, loading } = useFetch<Staff[]>(
    refresh ? `/api/staff?_r=${refresh}` : "/api/staff"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", role: "", department: "",
    hireDate: "", status: "active",
  });

  const resetForm = () => setForm({
    name: "", email: "", phone: "", role: "", department: "",
    hireDate: "", status: "active",
  });

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    const payload = { ...form };
    const url = editingStaff ? `/api/staff/${editingStaff.id}` : "/api/staff";
    const method = editingStaff ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingStaff ? "Staff updated" : "Staff added");
      setShowDialog(false);
      setEditingStaff(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save staff");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/staff/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Staff deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete staff");
    }
  };

  const filteredStaff = (staff || []).filter(
    (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "on_leave": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
      case "inactive": return "bg-gray-100 text-gray-600 dark:bg-gray-950/50 dark:text-gray-400";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Staff Management</h2>
          <p className="text-xs text-muted-foreground">{filteredStaff.length} staff members</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingStaff(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredStaff.length === 0 ? (
            <EmptyState icon={Users} title="No staff found" description="Add your first staff member" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Staff</TableHead>
                  <TableHead className="text-[11px] uppercase">Role</TableHead>
                  <TableHead className="text-[11px] uppercase">Department</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Hire Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => (
                  <TableRow key={s.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-teal-700 dark:text-teal-300">
                            {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.role}</TableCell>
                    <TableCell className="text-sm">{s.department}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(s.status)}`}>{s.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(s.hireDate)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingStaff(s); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>{editingStaff ? "Update staff details" : "Add a new staff member"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g., Doctor, Nurse" />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hire Date</Label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingStaff(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this staff member?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Leave Module
// ============================================================================
interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  type: "annual" | "sick" | "casual" | "maternity" | "paternity" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export function HRLeave(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: leaves, loading } = useFetch<LeaveRequest[]>(
    refresh ? `/api/leave?_r=${refresh}` : "/api/leave"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    staffName: "", department: "", type: "annual",
    startDate: "", endDate: "", reason: "",
  });

  const resetForm = () => setForm({
    staffName: "", department: "", type: "annual",
    startDate: "", endDate: "", reason: "",
  });

  const handleSubmit = async () => {
    if (!form.staffName || !form.startDate || !form.endDate) {
      toast.error("Staff name and dates are required");
      return;
    }
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const payload = { ...form, days, status: "pending", appliedAt: new Date().toISOString() };
    const url = editingLeave ? `/api/leave/${editingLeave.id}` : "/api/leave";
    const method = editingLeave ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingLeave ? "Leave updated" : "Leave request submitted");
      setShowDialog(false);
      setEditingLeave(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save leave request");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/leave/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Leave request deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete leave request");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Leave ${status}`);
      refreshFn();
    } else {
      toast.error("Failed to update status");
    }
  };

  const filteredLeaves = (leaves || []).filter(
    (l) => l.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "rejected": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    }
  };

  const typeLabel = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Leave Management</h2>
          <p className="text-xs text-muted-foreground">{filteredLeaves.length} leave requests</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leaves..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingLeave(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Request
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredLeaves.length === 0 ? (
            <EmptyState icon={Calendar} title="No leave requests" description="Submit your first leave request" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Staff</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Dates</TableHead>
                  <TableHead className="text-[11px] uppercase">Days</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Department</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.map((l) => (
                  <TableRow key={l.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {l.staffName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{l.staffName}</p>
                          <p className="text-[11px] text-muted-foreground">{l.reason}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{typeLabel(l.type)}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{l.days} days</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(l.status)}`}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{l.department}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {l.status === "pending" && (
                            <>
                            <DropdownMenuItem onClick={() => updateStatus(l.id, "approved")}>
                              <CheckCircle className="w-4 h-4 text-emerald-600" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(l.id, "rejected")}>
                              <XCircle className="w-4 h-4 text-rose-600" /> Reject
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => { setEditingLeave(l); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(l.id)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLeave ? "Edit Leave Request" : "New Leave Request"}</DialogTitle>
            <DialogDescription>{editingLeave ? "Update leave request" : "Submit a new leave request"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Staff Name</Label>
                <Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="maternity">Maternity</SelectItem>
                  <SelectItem value="paternity">Paternity</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingLeave(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this leave request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
