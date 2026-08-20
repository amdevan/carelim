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
  Stethoscope, Activity, Scan, Pill, Microscope, FileText,
  Calendar, Clock, User, MapPin, Phone, Mail,
} from "lucide-react";
import { EmptyState } from "@/components/cms/empty-state";

// ============================================================================
// Radiology Module
// ============================================================================
interface RadiologyStudy {
  id: string;
  patientId: string;
  patientName: string;
  modality: string;
  bodyPart: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "stat";
  orderedBy: string;
  orderedAt: string;
  completedAt?: string;
  findings?: string;
  reportUrl?: string;
}

export function HealthcareRadiology(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: studies, loading } = useFetch<RadiologyStudy[]>(
    refresh ? `/api/radiology-studies?_r=${refresh}` : "/api/radiology-studies"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingStudy, setEditingStudy] = useState<RadiologyStudy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    patientId: "", patientName: "", modality: "", bodyPart: "",
    priority: "routine", orderedBy: "",
  });

  const resetForm = () => setForm({
    patientId: "", patientName: "", modality: "", bodyPart: "",
    priority: "routine", orderedBy: "",
  });

  const handleSubmit = async () => {
    if (!form.patientName || !form.modality) {
      toast.error("Patient name and modality are required");
      return;
    }
    const payload = { ...form, status: "pending", orderedAt: new Date().toISOString() };
    const url = editingStudy ? `/api/radiology-studies/${editingStudy.id}` : "/api/radiology-studies";
    const method = editingStudy ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingStudy ? "Study updated" : "Study created");
      setShowDialog(false);
      setEditingStudy(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save study");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/radiology-studies/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Study deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete study");
    }
  };

  const filteredStudies = (studies || []).filter(
    (s) => (s.patientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.modality || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.bodyPart || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "in_progress": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
      case "cancelled": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      case "urgent": return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-950/50 dark:text-gray-400";
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Radiology Studies</h2>
          <p className="text-xs text-muted-foreground">{filteredStudies.length} studies found</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search studies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingStudy(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Study
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredStudies.length === 0 ? (
            <EmptyState icon={Scan} title="No radiology studies" description="Create your first radiology study" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Modality</TableHead>
                  <TableHead className="text-[11px] uppercase">Body Part</TableHead>
                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Ordered</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudies.map((s) => (
                  <TableRow key={s.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {(s.patientName || "").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{s.patientName}</p>
                          <p className="text-[11px] text-muted-foreground">ID: {s.patientId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Scan className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{s.modality}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.bodyPart}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${priorityColor(s.priority)}`}>{s.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(s.status)}`}>{s.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(s.orderedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingStudy(s); setShowDialog(true); }}>
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
            <DialogTitle>{editingStudy ? "Edit Study" : "New Radiology Study"}</DialogTitle>
            <DialogDescription>{editingStudy ? "Update study details" : "Create a new radiology study"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Patient Name</Label>
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Patient ID</Label>
              <Input value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Modality</Label>
              <Input value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} placeholder="e.g., X-Ray, CT, MRI" />
            </div>
            <div className="space-y-1.5">
              <Label>Body Part</Label>
              <Input value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ordered By</Label>
              <Input value={form.orderedBy} onChange={(e) => setForm({ ...form, orderedBy: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingStudy(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this study?</AlertDialogTitle>
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
// Pharmacy Module
// ============================================================================
interface Medicine {
  id: string;
  name: string;
  dosageForm: string;
  strength: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  supplier?: string;
  category?: string;
}

export function HealthcarePharmacy(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: medicines, loading } = useFetch<Medicine[]>(
    refresh ? `/api/medicines?_r=${refresh}` : "/api/medicines"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "", dosageForm: "", strength: "", unit: "",
    price: 0, stock: 0, minStock: 0, supplier: "", category: "",
  });

  const resetForm = () => setForm({
    name: "", dosageForm: "", strength: "", unit: "",
    price: 0, stock: 0, minStock: 0, supplier: "", category: "",
  });

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error("Medicine name is required");
      return;
    }
    const payload = { ...form };
    const url = editingMedicine ? `/api/medicines/${editingMedicine.id}` : "/api/medicines";
    const method = editingMedicine ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingMedicine ? "Medicine updated" : "Medicine added");
      setShowDialog(false);
      setEditingMedicine(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save medicine");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/medicines/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Medicine deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete medicine");
    }
  };

  const filteredMedicines = (medicines || []).filter(
    (m) => (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.supplier || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = (medicines || []).filter((m) => m.stock <= m.minStock).length;

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Pharmacy Inventory</h2>
          <p className="text-xs text-muted-foreground">{filteredMedicines.length} medicines · {lowStockCount} low stock</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingMedicine(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredMedicines.length === 0 ? (
            <EmptyState icon={Pill} title="No medicines found" description="Add your first medicine to the inventory" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Medicine</TableHead>
                  <TableHead className="text-[11px] uppercase">Dosage</TableHead>
                  <TableHead className="text-[11px] uppercase">Price</TableHead>
                  <TableHead className="text-[11px] uppercase">Stock</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicines.map((m) => (
                  <TableRow key={m.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 flex items-center justify-center">
                          <Pill className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.supplier || "No supplier"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{m.strength} {m.unit}</p>
                      <p className="text-[11px] text-muted-foreground">{m.dosageForm}</p>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{m.price.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{m.stock}</TableCell>
                    <TableCell>
                      {m.stock <= m.minStock ? (
                        <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">Low Stock</Badge>
                      ) : (
                        <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{m.category || "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingMedicine(m); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(m.id)}>
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
            <DialogTitle>{editingMedicine ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            <DialogDescription>{editingMedicine ? "Update medicine details" : "Add a new medicine to inventory"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Medicine Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Strength</Label>
                <Input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g., 500" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g., mg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dosage Form</Label>
              <Input value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} placeholder="e.g., Tablet, Capsule" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Min Stock Level</Label>
              <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingMedicine(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medicine?</AlertDialogTitle>
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
// Laboratory Module
// ============================================================================
interface LabTest {
  id: string;
  testName: string;
  category: string;
  price: number;
  turnaroundTime: string;
  isActive: boolean;
}

export function HealthcareLaboratory(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: tests, loading } = useFetch<LabTest[]>(
    refresh ? `/api/lab-tests-master?_r=${refresh}` : "/api/lab-tests-master"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    testName: "", category: "", price: 0, turnaroundTime: "", isActive: true,
  });

  const resetForm = () => setForm({
    testName: "", category: "", price: 0, turnaroundTime: "", isActive: true,
  });

  const handleSubmit = async () => {
    if (!form.testName) {
      toast.error("Test name is required");
      return;
    }
    const payload = { ...form };
    const url = editingTest ? `/api/lab-tests-master/${editingTest.id}` : "/api/lab-tests-master";
    const method = editingTest ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingTest ? "Test updated" : "Test added");
      setShowDialog(false);
      setEditingTest(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save test");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/lab-tests-master/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Test deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete test");
    }
  };

  const filteredTests = (tests || []).filter(
    (t) => (t.testName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Laboratory Tests</h2>
          <p className="text-xs text-muted-foreground">{filteredTests.length} tests configured</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingTest(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Test
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredTests.length === 0 ? (
            <EmptyState icon={Microscope} title="No lab tests configured" description="Add your first lab test" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Test Name</TableHead>
                  <TableHead className="text-[11px] uppercase">Category</TableHead>
                  <TableHead className="text-[11px] uppercase">Price</TableHead>
                  <TableHead className="text-[11px] uppercase">Turnaround</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((t) => (
                  <TableRow key={t.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-950/50 dark:to-blue-950/50 flex items-center justify-center">
                          <Microscope className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <span className="text-sm font-medium">{t.testName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{t.category}</TableCell>
                    <TableCell className="text-sm font-medium">{t.price.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{t.turnaroundTime}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${t.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-gray-100 text-gray-600"}`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingTest(t); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(t.id)}>
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
            <DialogTitle>{editingTest ? "Edit Test" : "Add Lab Test"}</DialogTitle>
            <DialogDescription>{editingTest ? "Update test details" : "Add a new laboratory test"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Test Name</Label>
              <Input value={form.testName} onChange={(e) => setForm({ ...form, testName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Hematology, Biochemistry" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Turnaround Time</Label>
                <Input value={form.turnaroundTime} onChange={(e) => setForm({ ...form, turnaroundTime: e.target.value })} placeholder="e.g., 2 hours" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm">Active test</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingTest(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
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
