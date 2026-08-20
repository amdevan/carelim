"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Building2, Plus, Search, Download, MapPin, Phone, Users,
  Clock, Edit, Trash2, LayoutGrid, List, Eye,
} from "lucide-react";
import { statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Branch {
  id: string;
  name: string;
  code: string;
  clinicType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string | null;
  manager: string | null;
  capacity: number;
  operatingHours: string | null;
  logo: string | null;
  status: string;
  createdAt: string;
}

const CLINIC_TYPES = [
  "General", "Dental", "IVF & Fertility", "Telemedicine", "Pediatrics",
  "Orthopedics", "Cardiology", "Neurology", "Ophthalmology", "Dermatology",
  "ENT", "Oncology", "Psychiatry", "Rehabilitation", "Diagnostic Center",
];

const TIMEZONES = [
  "Asia/Kathmandu", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Australia/Sydney",
];

const TYPE_COLORS: Record<string, string> = {
  General: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Dental: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  "IVF & Fertility": "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Telemedicine: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Pediatrics: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Orthopedics: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Cardiology: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Neurology: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
};

const defaultForm = {
  name: "", code: "", clinicType: "General", address: "", city: "", state: "",
  country: "Nepal", zipCode: "", phone: "", email: "", website: "",
  timezone: "Asia/Kathmandu", manager: "", capacity: 50, operatingHours: "09:00-17:00",
  logo: "", status: "active",
};

export function BranchesView() {
  const { data: branches, loading } = useFetch<Branch[]>("/api/branches");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const [detailBranch, setDetailBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const allBranches = Array.isArray(branches) ? branches : [];

  const filtered = useMemo(() => {
    const ql = search.toLowerCase();
    return allBranches.filter((b) => {
      const matchesSearch = !ql ||
        b.name.toLowerCase().includes(ql) ||
        b.code.toLowerCase().includes(ql) ||
        (b.manager || "").toLowerCase().includes(ql) ||
        (b.city || "").toLowerCase().includes(ql);
      const matchesType = typeFilter === "all" || b.clinicType === typeFilter;
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allBranches, search, typeFilter, statusFilter]);

  const activeCount = allBranches.filter((b) => b.status === "active").length;
  const inactiveCount = allBranches.filter((b) => b.status !== "active").length;
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allBranches.forEach((b) => { map[b.clinicType] = (map[b.clinicType] || 0) + 1; });
    return map;
  }, [allBranches]);
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const kpis = [
    { label: "Total Branches", value: allBranches.length, icon: Building2, accent: "from-teal-500 to-teal-600" },
    { label: "Active", value: activeCount, icon: Building2, accent: "from-emerald-500 to-emerald-600" },
    { label: "Inactive", value: inactiveCount, icon: Building2, accent: "from-amber-500 to-orange-500" },
    { label: "Top Type", value: topType ? topType[0] : "—", icon: Building2, accent: "from-violet-500 to-purple-600", isText: true },
  ];

  const openAdd = () => { setForm(defaultForm); setAddOpen(true); };
  const openEdit = (b: Branch) => {
    setForm({
      name: b.name, code: b.code, clinicType: b.clinicType, address: b.address || "",
      city: b.city || "", state: b.state || "", country: b.country || "Nepal",
      zipCode: b.zipCode || "", phone: b.phone || "", email: b.email || "",
      website: b.website || "", timezone: b.timezone || "Asia/Kathmandu",
      manager: b.manager || "", capacity: b.capacity, operatingHours: b.operatingHours || "09:00-17:00",
      logo: b.logo || "", status: b.status,
    });
    setEditBranch(b);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Branch name and code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity) || 50,
        address: form.address || null, city: form.city || null, state: form.state || null,
        country: form.country || null, zipCode: form.zipCode || null,
        phone: form.phone || null, email: form.email || null, website: form.website || null,
        timezone: form.timezone || null, manager: form.manager || null,
        operatingHours: form.operatingHours || null, logo: form.logo || null,
      };
      const url = editBranch ? `/api/branches/${editBranch.id}` : "/api/branches";
      const method = editBranch ? "PUT" : "POST";
      const res = await fetchAPI(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(editBranch ? "Branch updated" : "Branch created");
      setAddOpen(false);
      setEditBranch(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBranch) return;
    try {
      const res = await fetchAPI(`/api/branches/${deleteBranch.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${deleteBranch.name} deleted`);
      setDeleteBranch(null);
    } catch {
      toast.error("Failed to delete branch");
    }
  };

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("branches", ["Name", "Code", "Clinic Type", "City", "Manager", "Phone", "Capacity", "Status"],
      filtered.map((b) => [b.name, b.code, b.clinicType, b.city || "", b.manager || "", b.phone || "", String(b.capacity), b.status]));
    toast.success("Branches exported to CSV");
  };

  const fullAddress = (b: Branch) => [b.address, b.city, b.state, b.country].filter(Boolean).join(", ") || "—";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Branch Management</h2>
          <p className="text-sm text-muted-foreground">
            {allBranches.length} total branches · {activeCount} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Branch
          </Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.accent} opacity-[0.03]`} />
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.accent} flex items-center justify-center shadow-sm`}>
                  <kpi.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
                  <p className={`font-bold ${kpi.isText ? "text-sm" : "text-xl"}`}>{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search branches..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue placeholder="Clinic Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CLINIC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden h-9">
              <button onClick={() => setViewMode("grid")} className={`px-3 flex items-center gap-1 text-xs ${viewMode === "grid" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50" : "text-muted-foreground"}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </button>
              <button onClick={() => setViewMode("list")} className={`px-3 flex items-center gap-1 text-xs border-l ${viewMode === "list" ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50" : "text-muted-foreground"}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No branches found" description="Add your first branch to get started." action={<Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={openAdd}><Plus className="w-4 h-4" /> Add Branch</Button>} />
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setDetailBranch(b)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {b.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{b.code}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[b.clinicType] || "bg-gray-100 text-gray-700"}`}>
                      {b.clinicType}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-[12px] text-muted-foreground">
                    {b.city && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" />{b.city}{b.country ? `, ${b.country}` : ""}</p>}
                    {b.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{b.phone}</p>}
                    {b.manager && <p className="flex items-center gap-1.5"><Users className="w-3 h-3 shrink-0" />{b.manager}</p>}
                    {b.operatingHours && <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" />{b.operatingHours}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge className={`text-[10px] ${statusColors[b.status] || "bg-gray-100 text-gray-700"}`}>
                      {statusLabel(b.status)}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailBranch(b)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => setDeleteBranch(b)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="hidden md:table-cell">Clinic Type</TableHead>
                <TableHead className="hidden md:table-cell">City</TableHead>
                <TableHead className="hidden md:table-cell">Manager</TableHead>
                <TableHead className="hidden md:table-cell">Capacity</TableHead>
                <TableHead className="hidden md:table-cell">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} className="hover:bg-accent/40">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {b.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{b.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{b.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[b.clinicType] || "bg-gray-100 text-gray-700"}`}>
                      {b.clinicType}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{b.city || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{b.manager || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{b.capacity}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{b.operatingHours || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${statusColors[b.status] || "bg-gray-100 text-gray-700"}`}>
                      {statusLabel(b.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailBranch(b)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => setDeleteBranch(b)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Panel */}
      <Dialog open={!!detailBranch} onOpenChange={() => setDetailBranch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              {detailBranch?.name}
            </DialogTitle>
          </DialogHeader>
          {detailBranch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {detailBranch.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{detailBranch.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{detailBranch.code}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[detailBranch.clinicType] || ""}`}>
                      {detailBranch.clinicType}
                    </Badge>
                    <Badge className={`text-[10px] ${statusColors[detailBranch.status] || ""}`}>
                      {statusLabel(detailBranch.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Address</p>
                  <p className="text-sm font-medium mt-0.5">{fullAddress(detailBranch)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Manager</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.manager || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Phone</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.phone || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Email</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.email || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Capacity</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.capacity} patients/day</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Operating Hours</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.operatingHours || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Timezone</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.timezone || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Website</p>
                  <p className="text-sm font-medium mt-0.5">{detailBranch.website || "—"}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDetailBranch(null); openEdit(detailBranch); }}>
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editBranch} onOpenChange={() => { setAddOpen(false); setEditBranch(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Branch Name *</Label>
                <Input placeholder="e.g. Carelim Downtown" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch Code *</Label>
                <Input placeholder="e.g. BR-001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Clinic Type</Label>
                <Select value={form.clinicType} onValueChange={(v) => setForm({ ...form, clinicType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLINIC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input placeholder="e.g. Kathmandu" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State/Province</Label>
                <Input placeholder="e.g. Bagmati" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input placeholder="e.g. Nepal" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Zip Code</Label>
                <Input placeholder="e.g. 44600" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="+977-1-XXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input placeholder="branch@carelim.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Manager</Label>
                <Input placeholder="Manager name" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
              </div>
            </div>

            {/* Operations */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity (patients/day)</Label>
                <Input type="number" placeholder="50" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Operating Hours</Label>
                <Input placeholder="09:00-17:00" value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditBranch(null); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBranch} onOpenChange={() => setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteBranch?.name}"</span>? This action cannot be undone.
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
