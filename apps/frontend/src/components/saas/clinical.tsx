"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  FileText, Stethoscope, Pill, Calendar, Clock, User,
  Activity, Clipboard, PenTool,
} from "lucide-react";
import { EmptyState } from "@/components/cms/empty-state";

// ============================================================================
// Prescriptions Module
// ============================================================================
interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  prescribedAt: string;
}

export function ClinicalPrescriptions(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: prescriptions, loading } = useFetch<Prescription[]>(
    refresh ? `/api/prescriptions?_r=${refresh}` : "/api/prescriptions"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingRx, setEditingRx] = useState<Prescription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    patientName: "", doctorName: "", medicineName: "", dosage: "",
    frequency: "", duration: "", quantity: 0, refills: 0,
    notes: "", status: "active",
  });

  const resetForm = () => setForm({
    patientName: "", doctorName: "", medicineName: "", dosage: "",
    frequency: "", duration: "", quantity: 0, refills: 0,
    notes: "", status: "active",
  });

  const handleSubmit = async () => {
    if (!form.patientName || !form.medicineName) {
      toast.error("Patient name and medicine are required");
      return;
    }
    const payload = { ...form, prescribedAt: new Date().toISOString() };
    const url = editingRx ? `/api/prescriptions/${editingRx.id}` : "/api/prescriptions";
    const method = editingRx ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingRx ? "Prescription updated" : "Prescription created");
      setShowDialog(false);
      setEditingRx(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save prescription");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/prescriptions/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Prescription deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete prescription");
    }
  };

  const filteredRx = (prescriptions || []).filter(
    (p) => p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "cancelled": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Prescriptions</h2>
          <p className="text-xs text-muted-foreground">{filteredRx.length} prescriptions</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingRx(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Prescription
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredRx.length === 0 ? (
            <EmptyState icon={Pill} title="No prescriptions found" description="Create your first prescription" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Medicine</TableHead>
                  <TableHead className="text-[11px] uppercase">Dosage</TableHead>
                  <TableHead className="text-[11px] uppercase">Doctor</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRx.map((p) => (
                  <TableRow key={p.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {p.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{p.patientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{p.medicineName}</TableCell>
                    <TableCell className="text-sm">{p.dosage} {p.frequency}</TableCell>
                    <TableCell className="text-sm">{p.doctorName}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(p.status)}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(p.prescribedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingRx(p); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(p.id)}>
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
            <DialogTitle>{editingRx ? "Edit Prescription" : "New Prescription"}</DialogTitle>
            <DialogDescription>{editingRx ? "Update prescription details" : "Create a new prescription"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Patient Name</Label>
                <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Doctor Name</Label>
                <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Medicine Name</Label>
              <Input value={form.medicineName} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dosage</Label>
                <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g., 500mg" />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="e.g., BID" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g., 7 days" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Refills</Label>
              <Input type="number" value={form.refills} onChange={(e) => setForm({ ...form, refills: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingRx(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prescription?</AlertDialogTitle>
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
// Clinical Notes Module
// ============================================================================
interface ClinicalNote {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  title: string;
  content: string;
  type: "general" | "followup" | "consultation" | "procedure";
  status: "draft" | "finalized" | "archived";
  createdAt: string;
  updatedAt: string;
}

export function ClinicalNotes(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: notes, loading } = useFetch<ClinicalNote[]>(
    refresh ? `/api/clinical-notes?_r=${refresh}` : "/api/clinical-notes"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    patientName: "", doctorName: "", title: "", content: "",
    type: "general", status: "draft",
  });

  const resetForm = () => setForm({
    patientName: "", doctorName: "", title: "", content: "",
    type: "general", status: "draft",
  });

  const handleSubmit = async () => {
    if (!form.patientName || !form.title) {
      toast.error("Patient name and title are required");
      return;
    }
    const now = new Date().toISOString();
    const payload = { ...form, createdAt: now, updatedAt: now };
    const url = editingNote ? `/api/clinical-notes/${editingNote.id}` : "/api/clinical-notes";
    const method = editingNote ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingNote ? "Note updated" : "Note created");
      setShowDialog(false);
      setEditingNote(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save note");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/clinical-notes/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Note deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete note");
    }
  };

  const filteredNotes = (notes || []).filter(
    (n) => n.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "finalized": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "archived": return "bg-gray-100 text-gray-600 dark:bg-gray-950/50 dark:text-gray-400";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Clinical Notes</h2>
          <p className="text-xs text-muted-foreground">{filteredNotes.length} notes</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingNote(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredNotes.length === 0 ? (
            <EmptyState icon={FileText} title="No clinical notes found" description="Create your first clinical note" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Title</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Doctor</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Updated</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((n) => (
                  <TableRow key={n.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{n.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{n.patientName}</TableCell>
                    <TableCell className="text-sm">{n.doctorName}</TableCell>
                    <TableCell className="text-sm capitalize">{n.type}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(n.status)}`}>{n.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(n.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingNote(n); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(n.id)}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Clinical Note" : "New Clinical Note"}</DialogTitle>
            <DialogDescription>{editingNote ? "Update note details" : "Create a new clinical note"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Patient Name</Label>
                <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Doctor Name</Label>
                <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="finalized">Finalized</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Clinical note content..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingNote(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
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
