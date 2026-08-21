"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { Pagination } from "@/components/cms/pagination";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { usePagination } from "@/lib/use-pagination";
import { formatRs, formatDate, formatDateTime, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  CreditCard, Plus, Pencil, X, Download, Receipt, Wallet, TrendingUp,
  Package, Boxes, Puzzle, Power, Headphones, Megaphone, BarChart3, ShieldCheck,
  Plug, Users, Settings as SettingsIcon, Stethoscope, Building2,
  Server, Lock, Mail, MapPin, MoreVertical, Play, Pause, Trash2, Search,
  Calendar, DollarSign, Filter, ArrowDownRight,
  Zap, MessageSquare, Star, Clock, CheckCircle2, AlertCircle,
  Brain, FlaskConical, Pill, FileText, LayoutDashboard, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ============================================================================
// 1. SaasSubscriptions — Plans management
// ============================================================================
interface Plan {
  id: string; name: string; description: string | null;
  priceMonthly: number; priceYearly: number;
  maxDoctors: number; maxUsers: number; maxStorage: number; maxBranches: number;
  hasApi: boolean; hasWhiteLabel: boolean; hasTelemedicine: boolean; hasAI: boolean;
  trialDays: number; isActive: boolean; createdAt: string;
  _count?: { tenants: number };
}

export function SaasSubscriptions({ filter: initialFilter }: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: plans, loading } = useFetch<Plan[]>(
    refresh ? `/api/plans?_r=${refresh}` : "/api/plans"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [filter, setFilter] = useState<string>(initialFilter || "all");

  const blankForm = {
    name: "", description: "", priceMonthly: 0, priceYearly: 0,
    maxDoctors: 5, maxUsers: 10, maxStorage: 5, maxBranches: 1,
    hasApi: false, hasWhiteLabel: false, hasTelemedicine: false, hasAI: false,
    trialDays: 14, isActive: true,
  };
  const [form, setForm] = useState<typeof blankForm>(blankForm);

  const openNew = () => { setEditing(null); setForm(blankForm); setShowDialog(true); };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      maxDoctors: p.maxDoctors, maxUsers: p.maxUsers, maxStorage: p.maxStorage, maxBranches: p.maxBranches,
      hasApi: p.hasApi, hasWhiteLabel: p.hasWhiteLabel, hasTelemedicine: p.hasTelemedicine, hasAI: p.hasAI,
      trialDays: p.trialDays, isActive: p.isActive,
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name) { toast.error("Plan name is required"); return; }
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/plans/${editing.id}` : "/api/plans";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editing ? "Plan updated" : "Plan created");
      setShowDialog(false);
      refreshFn();
    } else {
      toast.error("Failed to save plan");
    }
  };

  const filtered = (plans || []).filter((p) => {
    if (filter === "active") return p.isActive;
    if (filter === "inactive") return !p.isActive;
    return true;
  });

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Subscription Plans</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} plans · manage pricing & feature tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={openNew}>
            <Plus className="w-4 h-4" /> New Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
            <Card className={`relative overflow-hidden ${!p.isActive ? "opacity-70" : ""}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${p.name.toLowerCase().includes("enterprise") ? "bg-gradient-to-r from-violet-500 to-purple-600" : p.name.toLowerCase().includes("pro") ? "bg-gradient-to-r from-teal-500 to-emerald-600" : "bg-gradient-to-r from-amber-500 to-orange-500"}`} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.name}
                      {p.name.toLowerCase().includes("enterprise") && <Badge className="bg-violet-100 text-violet-700 text-[9px]">Popular</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs">{p.description || "—"}</CardDescription>
                  </div>
                  <Badge className={p.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-gray-100 text-gray-600"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-3xl font-bold tabular-nums">{formatRs(p.priceMonthly)}</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                  <span className="ml-2 text-xs text-muted-foreground">· {formatRs(p.priceYearly)}/yr</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <FeatureItem icon={Stethoscope} label={`${p.maxDoctors} doctors`} />
                  <FeatureItem icon={Users} label={`${p.maxUsers} users`} />
                  <FeatureItem icon={Building2} label={`${p.maxBranches} branches`} />
                  <FeatureItem icon={Server} label={`${p.maxStorage} GB`} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.hasApi && <Badge variant="outline" className="text-[9px]">API</Badge>}
                  {p.hasWhiteLabel && <Badge variant="outline" className="text-[9px]">White-label</Badge>}
                  {p.hasTelemedicine && <Badge variant="outline" className="text-[9px]">Telemedicine</Badge>}
                  {p.hasAI && <Badge variant="outline" className="text-[9px]">AI</Badge>}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{p._count?.tenants || 0}</strong> tenants · {p.trialDays}-day trial
                </span>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(p)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <Card><CardContent className="p-0">
              <EmptyState icon={CreditCard} title="No plans found" description="Create your first subscription plan" action={<Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={openNew}><Plus className="w-4 h-4" /> New Plan</Button>} />
            </CardContent></Card>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create new plan"}</DialogTitle>
            <DialogDescription>Configure pricing, limits and feature flags for this subscription tier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Plan Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pro, Enterprise" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Short tagline" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Price (Rs.)</Label>
                <Input type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price (Rs.)</Label>
                <Input type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Max Doctors</Label>
                <Input type="number" value={form.maxDoctors} onChange={(e) => setForm({ ...form, maxDoctors: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Users</Label>
                <Input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Storage (GB)</Label>
                <Input type="number" value={form.maxStorage} onChange={(e) => setForm({ ...form, maxStorage: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Branches</Label>
                <Input type="number" value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Trial Days</Label>
              <Input type="number" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              {([
                ["hasApi", "API Access"], ["hasWhiteLabel", "White-label"],
                ["hasTelemedicine", "Telemedicine"], ["hasAI", "AI Features"], ["isActive", "Active Plan"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <Label className="text-xs cursor-pointer">{label}</Label>
                  <Switch checked={form[key] as boolean} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={save}>
              {editing ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureItem({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3 h-3 text-teal-600" />
      <span>{label}</span>
    </div>
  );
}

// ============================================================================
// 2. SaasBilling — Invoices table with stat cards
// ============================================================================
interface SaaSInvoice {
  id: string; invoiceNo: string; tenantId: string;
  tenant: { id: string; name: string };
  amount: number; tax: number; total: number;
  status: string; paymentMethod: string | null;
  date: string; paidAt: string | null; description: string | null;
}

export function SaasBilling({ filter: initialFilter }: { filter?: string }) {
  const { data: invoices, loading } = useFetch<SaaSInvoice[]>("/api/saas-invoices");
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const pagination = usePagination<SaaSInvoice>(invoices || [], 10);

  const filtered = (invoices || []).filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });
  // Re-paginate filtered list
  const filteredPaged = filtered.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size);

  const totalRevenue = (invoices || []).filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = (invoices || []).filter((i) => i.status === "unpaid").reduce((s, i) => s + i.total, 0);
  const totalPartial = (invoices || []).filter((i) => i.status === "partial").reduce((s, i) => s + i.total, 0);

  const handleExport = () => {
    if (!invoices?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("saas-invoices", ["Invoice", "Tenant", "Amount", "Tax", "Total", "Status", "Method", "Date"],
      invoices.map((i) => [i.invoiceNo, i.tenant.name, i.amount, i.tax, i.total, i.status, i.paymentMethod || "", formatDate(i.date)]));
    toast.success("Invoices exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Revenue & Billing</h2>
          <p className="text-xs text-muted-foreground">{invoices?.length || 0} invoices · {formatRs(totalRevenue)} collected</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Total Collected" value={formatRs(totalRevenue)} icon={Wallet} accent="from-emerald-500 to-teal-600" index={0} subtitle="Paid invoices" />
        <KpiCard label="Outstanding" value={formatRs(totalOutstanding)} icon={Receipt} accent="from-amber-500 to-orange-500" index={1} subtitle="Unpaid invoices" />
        <KpiCard label="Partial Payments" value={formatRs(totalPartial)} icon={TrendingUp} accent="from-rose-500 to-pink-600" index={2} subtitle="Partially paid" />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {["all", "paid", "unpaid", "partial", "refunded"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === f ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Invoice No</TableHead>
                    <TableHead className="text-[11px] uppercase">Tenant</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Tax</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Total</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Method</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaged.map((i) => (
                    <TableRow key={i.id} className="table-row-hover">
                      <TableCell className="font-mono text-xs font-medium">{i.invoiceNo}</TableCell>
                      <TableCell className="text-sm font-medium">{i.tenant.name}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatRs(i.amount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatRs(i.tax)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(i.total)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${statusColors[i.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusLabel(i.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{i.paymentMethod || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(i.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-2 py-2 border-t text-xs text-muted-foreground">
                <span>{filtered.length} of {invoices?.length || 0} invoices</span>
                <span>Page {pagination.page} of {Math.max(1, Math.ceil(filtered.length / pagination.size))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 3. SaasModules — Platform modules grid
// ============================================================================
interface PlatformModule {
  id: string; name: string; description: string | null;
  category: string; icon: string | null; isActive: boolean; createdAt: string;
  _count?: { tenants: number };
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  appointments: Calendar, emr: FileText, pharmacy: Pill, laboratory: FlaskConical,
  radiology: ImageIcon, billing: Receipt, accounting: Wallet, inventory: Package,
  hr: Users, reports: BarChart3, dashboard: LayoutDashboard, settings: SettingsIcon,
  Building2: Building2,
};

export function SaasModules({ filter: initialFilter }: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const { data: modules, loading } = useFetch<PlatformModule[]>(refresh ? `/api/saas-modules?_r=${refresh}` : "/api/saas-modules");
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [configModule, setConfigModule] = useState<PlatformModule | null>(null);
  const [createModule, setCreateModule] = useState(false);
  const [editModule, setEditModule] = useState<PlatformModule | null>(null);
  const [deleteModule, setDeleteModule] = useState<PlatformModule | null>(null);

  const handleToggle = async (m: PlatformModule) => {
    await fetchAPI("/api/saas-modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, isActive: !m.isActive }) });
    toast.success(`${m.name} ${!m.isActive ? "activated" : "deactivated"}`);
    setRefresh(r => r + 1);
  };

  const handleDelete = async (m: PlatformModule) => {
    const res = await fetchAPI(`/api/saas-modules/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${m.name} deleted`);
      setRefresh(r => r + 1);
    } else {
      toast.error("Failed to delete module");
    }
  };

  const filtered = (modules || []).filter((m) => {
    if (filter === "all") return true;
    if (filter === "healthcare") return m.category === "healthcare";
    if (filter === "business") return m.category === "business";
    return true;
  });

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const healthcare = filtered.filter((m) => m.category === "healthcare");
  const business = filtered.filter((m) => m.category === "business");

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Healthcare Modules</h2>
          <p className="text-xs text-muted-foreground">{modules?.length || 0} platform modules · {modules?.filter((m) => m.isActive).length || 0} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setCreateModule(true)}>
            <Plus className="w-4 h-4" /> Add Module
          </Button>
        </div>
      </div>

      <ModuleGroup title="Healthcare Modules" icon={Stethoscope} modules={healthcare} onToggle={handleToggle} onConfigure={setConfigModule} onEdit={setEditModule} onDelete={setDeleteModule} />
      <ModuleGroup title="Business Modules" icon={Briefcase} modules={business} onToggle={handleToggle} onConfigure={setConfigModule} onEdit={setEditModule} onDelete={setDeleteModule} />

      <ModuleConfigDialog module={configModule} onClose={() => setConfigModule(null)} />
      <ModuleCreateDialog key={editModule?.id || 'create'} open={createModule || !!editModule} onClose={() => { setCreateModule(false); setEditModule(null); }} module={editModule} onCreated={() => setRefresh(r => r + 1)} />

      <AlertDialog open={!!deleteModule} onOpenChange={() => setDeleteModule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteModule?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => { handleDelete(deleteModule!); setDeleteModule(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Briefcase({ className }: { className?: string }) {
  return <Boxes className={className} />;
}

function ModuleGroup({ title, icon: Icon, modules, onToggle, onConfigure, onEdit, onDelete }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: PlatformModule[];
  onToggle: (m: PlatformModule) => void;
  onConfigure: (m: PlatformModule) => void;
  onEdit: (m: PlatformModule) => void;
  onDelete: (m: PlatformModule) => void;
}) {
  if (modules.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="text-[10px]">{modules.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {modules.map((m, i) => {
          const ModIcon = MODULE_ICONS[m.icon || ""] || Puzzle;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <Card className={`card-hover relative overflow-hidden ${!m.isActive ? "opacity-70" : ""}`}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50 flex items-center justify-center">
                      <ModIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <Badge className={m.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-gray-100 text-gray-600"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{m.description || "—"}</p>
                  <Separator className="my-2.5" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m._count?.tenants || 0} tenants</span>
                    <Badge variant="outline" className="text-[9px] capitalize">{m.category}</Badge>
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => onConfigure(m)}>Configure</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(m)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600" onClick={() => onDelete(m)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant={m.isActive ? "outline" : "default"} size="sm" className={`h-7 text-xs ${m.isActive ? "text-amber-600" : "bg-teal-600 hover:bg-teal-700 text-white"}`} onClick={() => onToggle(m)}>{m.isActive ? "Disable" : "Enable"}</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleConfigDialog({ module, onClose }: { module: PlatformModule | null; onClose: () => void }) {
  const { data: tenants } = useFetch<{ id: string; name: string; status: string }[]>("/api/tenants");
  if (!module) return null;
  return (
    <Dialog open={!!module} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Configure: {module.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3">
            <p className="text-sm font-medium">{module.name}</p>
            <p className="text-xs text-muted-foreground">{module.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{module.isActive ? "Active" : "Inactive"}</Badge>
              <Badge variant="outline" className="text-[9px] capitalize">{module.category}</Badge>
              <span className="text-[10px] text-muted-foreground">{module._count?.tenants || 0} tenants using</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2">Tenant Access</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {(tenants || []).map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div><p className="text-sm font-medium">{t.name}</p><p className="text-[10px] text-muted-foreground">{t.status}</p></div>
                  <Switch defaultChecked={Math.random() > 0.3} onCheckedChange={(v) => toast.info(`${t.name}: ${module.name} ${v ? "enabled" : "disabled"}`)} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModuleCreateDialog({ open, onClose, module, onCreated }: {
  open: boolean;
  onClose: () => void;
  module: PlatformModule | null;
  onCreated: () => void;
}) {
  const isEdit = !!module;
  const [form, setForm] = useState(() => {
    if (module) {
      return {
        name: module.name, description: module.description || "", category: module.category,
        icon: module.icon || "", isActive: module.isActive,
      };
    }
    return { name: "", description: "", category: "healthcare", icon: "", isActive: true };
  });

  const save = async () => {
    if (!form.name) { toast.error("Module name is required"); return; }
    const url = isEdit ? `/api/saas-modules/${module!.id}` : "/api/saas-modules";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(isEdit ? "Module updated" : "Module created");
      onClose();
      onCreated();
    } else {
      toast.error("Failed to save module");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Module" : "Create new module"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update module details." : "Add a new platform module to the catalog."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Telemedicine" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Icon Key</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. appointments" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="text-xs cursor-pointer">Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={save}>{isEdit ? "Save Changes" : "Create Module"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 4. SaasAddOns — Add-on cards with toggle
// ============================================================================
interface AddOn {
  id: string; name: string; description: string | null;
  price: number; billingCycle: string; isActive: boolean; createdAt: string;
}

export function SaasAddOns(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: addons, loading } = useFetch<AddOn[]>(
    refresh ? `/api/add-ons?_r=${refresh}` : "/api/add-ons"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editAddon, setEditAddon] = useState<AddOn | null>(null);
  const [deleteAddon, setDeleteAddon] = useState<AddOn | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, billingCycle: "monthly", isActive: true });

  const toggle = async (a: AddOn) => {
    const res = await fetchAPI("/api/add-ons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, isActive: !a.isActive }),
    });
    if (res.ok) {
      toast.success(`${a.name} ${!a.isActive ? "enabled" : "disabled"}`);
      refreshFn();
    } else {
      toast.error("Failed to toggle add-on");
    }
  };

  const create = async () => {
    if (!form.name) { toast.error("Add-on name is required"); return; }
    const res = await fetchAPI("/api/add-ons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Add-on created");
      setShowDialog(false);
      setForm({ name: "", description: "", price: 0, billingCycle: "monthly", isActive: true });
      refreshFn();
    } else {
      toast.error("Failed to create add-on");
    }
  };

  const deleteAddon_ = async (a: AddOn) => {
    const res = await fetchAPI(`/api/add-ons/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${a.name} deleted`);
      setDeleteAddon(null);
      refreshFn();
    } else {
      toast.error("Failed to delete add-on");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Add-ons Marketplace</h2>
          <p className="text-xs text-muted-foreground">{addons?.length || 0} add-ons · {addons?.filter((a) => a.isActive).length || 0} available</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4" /> New Add-on
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(addons || []).map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
            <Card className={`card-hover ${!a.isActive ? "opacity-70" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 flex items-center justify-center">
                    <Puzzle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditAddon(a)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleteAddon(a)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description || "—"}</p>
                <Separator className="my-2.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums text-teal-700 dark:text-teal-300">{formatRs(a.price)}</span>
                  <Badge variant="outline" className="text-[9px] capitalize">{a.billingCycle}</Badge>
                </div>
                <div className="mt-2.5">
                  <Switch checked={a.isActive} onCheckedChange={() => toggle(a)} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {(addons || []).length === 0 && (
          <div className="col-span-full">
            <Card><CardContent className="p-0">
              <EmptyState icon={Puzzle} title="No add-ons" description="Create your first marketplace add-on" />
            </CardContent></Card>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new add-on</DialogTitle>
            <DialogDescription>Add a new billable add-on to the marketplace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Advanced Analytics" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (Rs.)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Label className="text-xs cursor-pointer">Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={create}>Create Add-on</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <AddOnEditDialog
        key={editAddon?.id || 'create'}
        addon={editAddon}
        onClose={() => setEditAddon(null)}
        onSaved={refreshFn}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteAddon} onOpenChange={() => setDeleteAddon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete add-on?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteAddon?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => deleteAddon_(deleteAddon!)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddOnEditDialog({ addon, onClose, onSaved }: {
  addon: AddOn | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => {
    if (addon) {
      return {
        name: addon.name, description: addon.description || "",
        price: addon.price, billingCycle: addon.billingCycle, isActive: addon.isActive,
      };
    }
    return { name: "", description: "", price: 0, billingCycle: "monthly", isActive: true };
  });

  const save = async () => {
    if (!form.name) { toast.error("Add-on name is required"); return; }
    const res = await fetchAPI(`/api/add-ons/${addon!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Add-on updated");
      onClose();
      onSaved();
    } else {
      toast.error("Failed to update add-on");
    }
  };

  return (
    <Dialog open={!!addon} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Add-on</DialogTitle>
          <DialogDescription>Update add-on details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price (Rs.)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing Cycle</Label>
              <Select value={form.billingCycle} onValueChange={(v) => setForm({ ...form, billingCycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="text-xs cursor-pointer">Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={save}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 5. SaasSupport — Ticket table with workflow
// ============================================================================
interface SupportTicket {
  id: string; ticketNo: string; tenantId: string | null;
  tenant: { id: string; name: string } | null;
  subject: string; description: string;
  priority: string; status: string; assignedTo: string | null;
  category: string; createdAt: string; resolvedAt: string | null;
}

const TICKET_STATUS_FLOW = ["open", "assigned", "resolved", "closed"];

export function SaasSupport({ filter: initialFilter }: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: tickets, loading } = useFetch<SupportTicket[]>(
    refresh ? `/api/support-tickets?_r=${refresh}` : "/api/support-tickets"
  );
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const pagination = usePagination<SupportTicket>(tickets || [], 10);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Ticket marked as ${statusLabel(status)}`);
      refreshFn();
      if (selected?.id === id) {
        setSelected({ ...selected, status });
      }
    } else {
      toast.error("Failed to update ticket");
    }
  };

  const assign = async (id: string) => {
    const res = await fetchAPI(`/api/support-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "assigned", assignedTo: "Support Team" }),
    });
    if (res.ok) {
      toast.success("Ticket assigned to Support Team");
      refreshFn();
      if (selected?.id === id) setSelected({ ...selected, status: "assigned", assignedTo: "Support Team" });
    }
  };

  const filtered = (tickets || []).filter((t) => {
    if (filter === "all") return true;
    if (filter === "high") return t.priority === "high";
    return t.status === filter;
  });
  const filteredPaged = filtered.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const openCount = (tickets || []).filter((t) => t.status === "open").length;
  const assignedCount = (tickets || []).filter((t) => t.status === "assigned").length;
  const resolvedCount = (tickets || []).filter((t) => t.status === "resolved").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight">Support Center</h2>
        <p className="text-xs text-muted-foreground">{tickets?.length || 0} tickets · {openCount} open · {assignedCount} assigned · {resolvedCount} resolved</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Open" value={openCount} icon={AlertCircle} accent="from-rose-500 to-pink-600" index={0} />
        <KpiCard label="Assigned" value={assignedCount} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Resolved" value={resolvedCount} icon={CheckCircle2} accent="from-emerald-500 to-teal-600" index={2} />
        <KpiCard label="Total" value={tickets?.length || 0} icon={Headphones} accent="from-teal-500 to-cyan-600" index={3} />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {["all", "open", "assigned", "resolved", "closed", "high"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap capitalize ${
                  filter === f ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "high" ? "High Priority" : f}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Headphones} title="No tickets" description="Support tickets will appear here" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Ticket</TableHead>
                    <TableHead className="text-[11px] uppercase">Subject</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Tenant</TableHead>
                    <TableHead className="text-[11px] uppercase">Priority</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">Assigned</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaged.map((t) => (
                    <TableRow key={t.id} className="table-row-hover cursor-pointer" onClick={() => setSelected(t)}>
                      <TableCell className="font-mono text-xs font-medium">{t.ticketNo}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{t.subject}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.tenant?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          t.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                          t.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                          "bg-gray-100 text-gray-600"
                        }`}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}>{statusLabel(t.status)}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{t.assignedTo || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(t.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setSelected(t)}><MessageSquare className="w-4 h-4" /> View</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {t.status === "open" && <DropdownMenuItem onClick={() => assign(t.id)}><Play className="w-4 h-4 text-amber-600" /> Assign</DropdownMenuItem>}
                            {t.status === "assigned" && <DropdownMenuItem onClick={() => updateStatus(t.id, "resolved")}><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolve</DropdownMenuItem>}
                            {t.status === "resolved" && <DropdownMenuItem onClick={() => updateStatus(t.id, "closed")}><Lock className="w-4 h-4 text-gray-600" /> Close</DropdownMenuItem>}
                            {t.status === "closed" && <DropdownMenuItem onClick={() => updateStatus(t.id, "open")}><AlertCircle className="w-4 h-4 text-rose-600" /> Reopen</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-2 py-2 border-t text-xs text-muted-foreground">
                <span>{filtered.length} of {tickets?.length || 0} tickets</span>
                <span>Page {pagination.page} of {Math.max(1, Math.ceil(filtered.length / pagination.size))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin p-0">
          {selected && (
            <div className="p-6 space-y-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-teal-600" /> {selected.ticketNo}
                </SheetTitle>
              </SheetHeader>
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3">
                <p className="text-sm font-semibold">{selected.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoCell label="Status"><Badge className={`text-[9px] ${statusColors[selected.status] || "bg-gray-100"}`}>{statusLabel(selected.status)}</Badge></InfoCell>
                <InfoCell label="Priority"><Badge className={`text-[9px] ${selected.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : selected.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-gray-100 text-gray-600"}`}>{selected.priority}</Badge></InfoCell>
                <InfoCell label="Tenant">{selected.tenant?.name || "—"}</InfoCell>
                <InfoCell label="Category"><span className="capitalize">{selected.category}</span></InfoCell>
                <InfoCell label="Assigned To">{selected.assignedTo || "Unassigned"}</InfoCell>
                <InfoCell label="Created">{formatDateTime(selected.createdAt)}</InfoCell>
                {selected.resolvedAt && <InfoCell label="Resolved">{formatDateTime(selected.resolvedAt)}</InfoCell>}
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold mb-2">Workflow Actions</p>
                <div className="flex flex-wrap gap-2">
                  {TICKET_STATUS_FLOW.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selected.status === s ? "default" : "outline"}
                      className={selected.status === s ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={selected.status === s}
                    >
                      {statusLabel(s)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

// ============================================================================
// 6. SaasCRM — Leads table with pipeline
// ============================================================================
interface Lead {
  id: string; clinicName: string; contactPerson: string; email: string | null;
  phone: string; location: string | null; status: string; source: string;
  notes: string | null; assignedTo: string | null; createdAt: string;
}

const LEAD_STATUSES = ["lead", "contacted", "demo", "trial", "converted", "lost"];

export function SaasCRM({ filter: initialFilter }: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: leads, loading } = useFetch<Lead[]>(
    refresh ? `/api/leads?_r=${refresh}` : "/api/leads"
  );
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ clinicName: "", contactPerson: "", email: "", phone: "", location: "", source: "website", notes: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pagination = usePagination<Lead>(leads || [], 10);

  const create = async () => {
    if (!form.clinicName || !form.contactPerson || !form.phone) {
      toast.error("Clinic name, contact & phone are required");
      return;
    }
    const res = await fetchAPI("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Lead created");
      setShowDialog(false);
      setForm({ clinicName: "", contactPerson: "", email: "", phone: "", location: "", source: "website", notes: "" });
      refreshFn();
    } else {
      toast.error("Failed to create lead");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Lead moved to ${status}`);
      refreshFn();
    } else {
      toast.error("Failed to update lead");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/leads/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lead deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete lead");
    }
  };

  const handleExport = () => {
    if (!leads?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("leads", ["Clinic", "Contact", "Email", "Phone", "Location", "Status", "Source", "Created"],
      leads.map((l) => [l.clinicName, l.contactPerson, l.email || "", l.phone, l.location || "", l.status, l.source, formatDate(l.createdAt)]));
    toast.success("Leads exported");
  };

  const filtered = (leads || []).filter((l) => filter === "all" ? true : l.status === filter);
  const filteredPaged = filtered.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const pipelineStats = LEAD_STATUSES.map((s) => ({ status: s, count: (leads || []).filter((l) => l.status === s).length }));
  const conversionRate = leads && leads.length > 0 ? Math.round((leads.filter((l) => l.status === "converted").length / leads.length) * 100) : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Marketing CRM</h2>
          <p className="text-xs text-muted-foreground">{leads?.length || 0} leads · {conversionRate}% conversion rate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4" /> New Lead</Button>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {pipelineStats.map((p, i) => (
          <KpiCard
            key={p.status}
            label={statusLabel(p.status)}
            value={p.count}
            icon={p.status === "converted" ? CheckCircle2 : p.status === "lost" ? X : Star}
            accent={
              p.status === "converted" ? "from-emerald-500 to-teal-600" :
              p.status === "lost" ? "from-rose-500 to-pink-600" :
              p.status === "trial" ? "from-amber-500 to-orange-500" :
              p.status === "demo" ? "from-violet-500 to-purple-600" :
              "from-teal-500 to-cyan-600"
            }
            index={i}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filter === "all" ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
            >
              All
            </button>
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap capitalize ${filter === s ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Megaphone} title="No leads" description="Leads will appear here" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Clinic</TableHead>
                    <TableHead className="text-[11px] uppercase">Contact</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Location</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">Source</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaged.map((l) => (
                    <TableRow key={l.id} className="table-row-hover">
                      <TableCell>
                        <p className="text-sm font-semibold">{l.clinicName}</p>
                        {l.assignedTo && <p className="text-[10px] text-muted-foreground">{l.assignedTo}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{l.contactPerson}</p>
                        <p className="text-[11px] text-muted-foreground">{l.phone}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{l.location || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          l.status === "converted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                          l.status === "lost" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                          l.status === "trial" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                          l.status === "demo" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" :
                          "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                        }`}>{statusLabel(l.status)}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground capitalize">{l.source}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(l.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] uppercase">Move to</DropdownMenuLabel>
                            {LEAD_STATUSES.map((s) => (
                              <DropdownMenuItem key={s} onClick={() => updateStatus(l.id, s)} disabled={l.status === s}>
                                {statusLabel(s)}
                              </DropdownMenuItem>
                            ))}
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
              <div className="flex items-center justify-between px-2 py-2 border-t text-xs text-muted-foreground">
                <span>{filtered.length} of {leads?.length || 0} leads</span>
                <span>Page {pagination.page} of {Math.max(1, Math.ceil(filtered.length / pagination.size))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new lead</DialogTitle>
            <DialogDescription>Capture a new prospect for the sales pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={create}>Create Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
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
// 7. SaasAnalytics — KPI cards + charts from saas-dashboard
// ============================================================================
interface AnalyticsData {
  kpis: {
    totalClinics: number; activeTenants: number; trialTenants: number; suspendedTenants: number;
    totalDoctors: number; totalPatients: number; totalAppointments: number;
    mrr: number; annualRevenue: number; monthlyRevenue: number; churnRate: number; subscriptionGrowth: number;
  };
  revenueTrend: Array<{ month: string; subscription: number; addOn: number; commission: number }>;
  tenantGrowth: Array<{ month: string; count: number }>;
  plans: Array<{ id: string; name: string; tenantCount: number; priceMonthly: number }>;
}

export function SaasAnalytics(_props: { filter?: string }) {
  const { data, loading } = useFetch<AnalyticsData>("/api/saas-dashboard");

  if (loading || !data) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  const { kpis, revenueTrend, tenantGrowth, plans } = data;
  const planColors = ["#0d9488", "#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#f43f5e"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight">Platform Analytics</h2>
        <p className="text-xs text-muted-foreground">Deep dive into SaaS performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="MRR" value={formatRs(kpis.mrr)} icon={Wallet} accent="from-teal-500 to-emerald-600" index={0} />
        <KpiCard label="ARR" value={formatRs(kpis.annualRevenue)} icon={DollarSign} accent="from-emerald-500 to-teal-600" index={1} />
        <KpiCard label="ARPU" value={formatRs(kpis.activeTenants > 0 ? Math.round(kpis.mrr / kpis.activeTenants) : 0)} icon={TrendingUp} accent="from-cyan-500 to-teal-600" index={2} subtitle="Avg revenue / user" />
        <KpiCard label="Churn Rate" value={`${kpis.churnRate}%`} icon={ArrowDownRight} accent="from-rose-500 to-pink-600" index={3} trendDown={kpis.churnRate > 5} />
        <KpiCard label="Total Clinics" value={kpis.totalClinics} icon={Building2} accent="from-teal-500 to-teal-600" index={4} trend={`+${kpis.subscriptionGrowth}`} />
        <KpiCard label="Active Rate" value={`${kpis.totalClinics > 0 ? Math.round((kpis.activeTenants / kpis.totalClinics) * 100) : 0}%`} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={5} />
        <KpiCard label="Total Doctors" value={kpis.totalDoctors} icon={Stethoscope} accent="from-violet-500 to-purple-600" index={6} />
        <KpiCard label="Total Patients" value={kpis.totalPatients} icon={Users} accent="from-cyan-500 to-cyan-600" index={7} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>
            <CardDescription className="text-xs">Subscription vs Add-on vs Commission</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="anSub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} /><stop offset="95%" stopColor="#0d9488" stopOpacity={0} /></linearGradient>
                  <linearGradient id="anAdd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="anComm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.4} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<ChartTooltip money />} />
                <Area type="monotone" dataKey="subscription" stroke="#0d9488" strokeWidth={2} fill="url(#anSub)" name="Subscription" />
                <Area type="monotone" dataKey="addOn" stroke="#10b981" strokeWidth={2} fill="url(#anAdd)" name="Add-on" />
                <Area type="monotone" dataKey="commission" stroke="#06b6d4" strokeWidth={2} fill="url(#anComm)" name="Commission" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Distribution</CardTitle>
            <CardDescription className="text-xs">Tenants by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={plans}
                  dataKey="tenantCount"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={2}
                >
                  {plans.map((_, i) => (
                    <Cell key={i} fill={planColors[i % planColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {plans.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: planColors[i % planColors.length] }} />
                    {p.name}
                  </span>
                  <span className="font-medium tabular-nums">{p.tenantCount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tenant Acquisition</CardTitle>
          <CardDescription className="text-xs">New tenant signups per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tenantGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="anBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" /><stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <CartesianGrid className="stroke-border" opacity={0.4} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", opacity: 0.1 }} />
              <Bar dataKey="count" fill="url(#anBar)" radius={[6, 6, 0, 0]} name="New Tenants" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 8. SaasSecurity — KPI cards + audit log feed
// ============================================================================
interface AuditLog {
  id: string; adminEmail: string; tenantId: string | null;
  tenant: { id: string; name: string } | null;
  action: string; module: string; detail: string | null;
  ipAddress: string | null; createdAt: string;
}

export function SaasSecurity({ filter: initialFilter }: { filter?: string }) {
  const { data: logs, loading } = useFetch<AuditLog[]>("/api/saas-audit");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>(initialFilter || "all");
  const pagination = usePagination<AuditLog>(logs || [], 15);

  const filtered = (logs || []).filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter.toUpperCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.adminEmail.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        (l.detail || "").toLowerCase().includes(q) ||
        (l.tenant?.name || "").toLowerCase().includes(q);
    }
    return true;
  });
  const filteredPaged = filtered.slice((pagination.page - 1) * pagination.size, pagination.page * pagination.size);

  const handleExport = () => {
    if (!logs?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("audit-logs", ["Admin", "Action", "Module", "Detail", "Tenant", "IP", "Time"],
      logs.map((l) => [l.adminEmail, l.action, l.module, l.detail || "", l.tenant?.name || "", l.ipAddress || "", formatDateTime(l.createdAt)]));
    toast.success("Audit logs exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const createAction = (a: string) => a.toUpperCase();
  const uniqueActions = Array.from(new Set((logs || []).map((l) => createAction(l.action))));

  const loginCount = (logs || []).filter((l) => l.action === "LOGIN").length;
  const createCount = (logs || []).filter((l) => l.action === "CREATE").length;
  const updateCount = (logs || []).filter((l) => l.action === "UPDATE").length;
  const deleteCount = (logs || []).filter((l) => l.action === "DELETE").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Security & Audit</h2>
          <p className="text-xs text-muted-foreground">{logs?.length || 0} audit events · full traceability</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Login Events" value={loginCount} icon={Lock} accent="from-teal-500 to-cyan-600" index={0} />
        <KpiCard label="Create Events" value={createCount} icon={Plus} accent="from-emerald-500 to-teal-600" index={1} />
        <KpiCard label="Update Events" value={updateCount} icon={Pencil} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Delete Events" value={deleteCount} icon={Trash2} accent="from-rose-500 to-pink-600" index={3} />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audit logs…" className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => <SelectItem key={a} value={a.toLowerCase()}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No audit logs" description="Audit events will appear here" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Admin</TableHead>
                    <TableHead className="text-[11px] uppercase">Action</TableHead>
                    <TableHead className="text-[11px] uppercase">Module</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Detail</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">Tenant</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">IP</TableHead>
                    <TableHead className="text-[11px] uppercase">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaged.map((l) => (
                    <TableRow key={l.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                            <AvatarFallback className="bg-transparent text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                              {l.adminEmail.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{l.adminEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${
                          l.action === "CREATE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                          l.action === "UPDATE" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                          l.action === "DELETE" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                          l.action === "LOGIN" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" :
                          "bg-gray-100 text-gray-600"
                        }`}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.module}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[260px] truncate">{l.detail || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{l.tenant?.name || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">{l.ipAddress || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-2 py-2 border-t text-xs text-muted-foreground">
                <span>{filtered.length} of {logs?.length || 0} events</span>
                <span>Page {pagination.page} of {Math.max(1, Math.ceil(filtered.length / pagination.size))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 9. SaasIntegrations — Integration cards with Connect/Disconnect
// ============================================================================
interface Integration {
  id: string; name: string; category: string; description: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean; accent: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "stripe", name: "Stripe", category: "Payments", description: "Accept global card payments & subscriptions.", icon: CreditCard, connected: true, accent: "from-violet-500 to-purple-600" },
  { id: "esewa", name: "eSewa", category: "Payments", description: "Nepal's most popular digital wallet.", icon: Wallet, connected: true, accent: "from-emerald-500 to-green-600" },
  { id: "khalti", name: "Khalti", category: "Payments", description: "Nepali payment gateway & wallet.", icon: CreditCard, connected: false, accent: "from-purple-500 to-fuchsia-600" },
  { id: "twilio", name: "Twilio SMS", category: "Communication", description: "Send OTPs & appointment reminders via SMS.", icon: MessageSquare, connected: true, accent: "from-rose-500 to-red-600" },
  { id: "sendgrid", name: "SendGrid", category: "Communication", description: "Transactional email delivery platform.", icon: Mail, connected: false, accent: "from-cyan-500 to-blue-500" },
  { id: "whatsapp", name: "WhatsApp Business", category: "Communication", description: "Engage patients via WhatsApp messaging.", icon: MessageSquare, connected: false, accent: "from-emerald-500 to-teal-600" },
  { id: "aws", name: "AWS S3", category: "Storage", description: "Store documents, scans & reports in cloud.", icon: Server, connected: true, accent: "from-amber-500 to-orange-600" },
  { id: "gcs", name: "Google Cloud Storage", category: "Storage", description: "Scalable object storage for medical assets.", icon: Server, connected: false, accent: "from-teal-500 to-cyan-600" },
  { id: "openai", name: "OpenAI", category: "AI", description: "Power AI scribe, summarization & insights.", icon: Brain, connected: true, accent: "from-violet-500 to-indigo-600" },
  { id: "google_maps", name: "Google Maps", category: "Maps", description: "Geolocation & clinic finder.", icon: MapPin, connected: false, accent: "from-emerald-500 to-lime-600" },
  { id: "zapier", name: "Zapier", category: "Automation", description: "Connect 5000+ apps with no-code workflows.", icon: Zap, connected: false, accent: "from-orange-500 to-amber-600" },
  { id: "webhooks", name: "Webhooks", category: "Automation", description: "Real-time event delivery to your endpoints.", icon: Plug, connected: true, accent: "from-teal-500 to-emerald-600" },
];

export function SaasIntegrations({ filter: initialFilter }: { filter?: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [filter, setFilter] = useState<string>(initialFilter || "all");

  const toggle = (id: string) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, connected: !i.connected } : i));
    const integ = integrations.find((i) => i.id === id);
    if (integ) toast.success(`${integ.name} ${integ.connected ? "disconnected" : "connected"}`);
  };

  const categories = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));
  const filtered = integrations.filter((i) => filter === "all" ? true : i.category === filter);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight">Integrations</h2>
        <p className="text-xs text-muted-foreground">{integrations.filter((i) => i.connected).length} of {integrations.length} connected</p>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filter === "all" ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filter === c ? "bg-teal-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((i, idx) => {
          const Icon = i.icon;
          return (
            <motion.div key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.04, 0.3) }}>
              <Card className={`card-hover ${i.connected ? "" : "opacity-90"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${i.accent} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {i.connected && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{i.name}</p>
                    <Badge variant="outline" className="text-[9px]">{i.category}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{i.description}</p>
                  <Button
                    size="sm"
                    variant={i.connected ? "outline" : "default"}
                    className={`w-full gap-1.5 ${!i.connected ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                    onClick={() => toggle(i.id)}
                  >
                    {i.connected ? <><Power className="w-3.5 h-3.5" /> Disconnect</> : <><Plug className="w-3.5 h-3.5" /> Connect</>}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 10. SaasUsers — Admin users table
// ============================================================================
interface AdminUser {
  id: string; name: string; email: string; role: string;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
}

export function SaasUsers(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: users, loading } = useFetch<AdminUser[]>(
    refresh ? `/api/admin-users?_r=${refresh}` : "/api/admin-users"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "carelim123", role: "admin" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const create = async () => {
    if (!form.name || !form.email) { toast.error("Name & email required"); return; }
    const res = await fetchAPI("/api/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Admin user created");
      setShowDialog(false);
      setForm({ name: "", email: "", password: "carelim123", role: "admin" });
      refreshFn();
    } else {
      toast.error("Failed to create user");
    }
  };

  const toggle = async (u: AdminUser) => {
    const res = await fetchAPI(`/api/admin-users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      toast.success(`${u.name} ${!u.isActive ? "activated" : "deactivated"}`);
      refreshFn();
    } else {
      toast.error("Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/admin-users/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete user");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const activeCount = (users || []).filter((u) => u.isActive).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Users & Access</h2>
          <p className="text-xs text-muted-foreground">{users?.length || 0} admin users · {activeCount} active</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {users?.length === 0 ? (
            <EmptyState icon={Users} title="No admin users" description="Add your first admin user" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">User</TableHead>
                  <TableHead className="text-[11px] uppercase">Role</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Last Login</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users || []).map((u) => (
                  <TableRow key={u.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-teal-700 dark:text-teal-300">
                            {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${
                        u.role === "super_admin" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" :
                        u.role === "admin" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" :
                        "bg-gray-100 text-gray-600"
                      }`}>{u.role.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-gray-100 text-gray-600"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => toggle(u)}>
                            {u.isActive ? <><Pause className="w-4 h-4 text-amber-600" /> Deactivate</> : <><Play className="w-4 h-4 text-emerald-600" /> Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(u.id)}>
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
            <DialogTitle>Add admin user</DialogTitle>
            <DialogDescription>Create a new platform admin with role-based access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Password</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={create}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently revoke their access.</AlertDialogDescription>
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
// 11. SaasSettings — Settings form
// ============================================================================
const DEFAULT_SETTINGS: Record<string, string> = {
  carelim_platform_name: "Carelim",
  carelim_support_email: "support@carelim.com",
  carelim_support_phone: "+977-1-4XXXXXX",
  carelim_default_currency: "NPR",
  carelim_default_tax_rate: "13",
  carelim_default_trial_days: "14",
  carelim_default_commission_rate: "5",
  carelim_smtp_host: "",
  carelim_smtp_port: "587",
  carelim_smtp_user: "",
  carelim_stripe_secret: "",
  carelim_stripe_webhook: "",
  carelim_esewa_merchant: "",
  carelim_khalti_api_key: "",
  carelim_maintenance_mode: "false",
  carelim_signup_enabled: "true",
  carelim_max_tenants: "500",
};

export function SaasSettings(_props: { filter?: string }) {
  const { data: remote, loading } = useFetch<Record<string, string>>("/api/saas-settings");
  const [form, setForm] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  // sync once loaded
  useEffect(() => {
    if (remote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ ...DEFAULT_SETTINGS, ...remote });
    }
  }, [remote]);

  const save = async () => {
    setSaving(true);
    const res = await fetchAPI("/api/saas-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved");
    else toast.error("Failed to save settings");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Platform Settings</h2>
          <p className="text-xs text-muted-foreground">Configure global SaaS settings & integrations</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={save} disabled={saving}>
          <SettingsIcon className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-teal-600" /> General</CardTitle>
          <CardDescription className="text-xs">Branding and contact info</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingInput label="Platform Name" value={form.carelim_platform_name} onChange={(v) => setForm({ ...form, carelim_platform_name: v })} />
          <SettingInput label="Support Email" value={form.carelim_support_email} onChange={(v) => setForm({ ...form, carelim_support_email: v })} />
          <SettingInput label="Support Phone" value={form.carelim_support_phone} onChange={(v) => setForm({ ...form, carelim_support_phone: v })} />
          <SettingInput label="Default Currency" value={form.carelim_default_currency} onChange={(v) => setForm({ ...form, carelim_default_currency: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> Billing & Trial</CardTitle>
          <CardDescription className="text-xs">Pricing defaults and trial policy</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SettingInput label="Default Tax Rate (%)" value={form.carelim_default_tax_rate} onChange={(v) => setForm({ ...form, carelim_default_tax_rate: v })} />
          <SettingInput label="Default Trial Days" value={form.carelim_default_trial_days} onChange={(v) => setForm({ ...form, carelim_default_trial_days: v })} />
          <SettingInput label="Commission Rate (%)" value={form.carelim_default_commission_rate} onChange={(v) => setForm({ ...form, carelim_default_commission_rate: v })} />
          <SettingInput label="Max Tenants" value={form.carelim_max_tenants} onChange={(v) => setForm({ ...form, carelim_max_tenants: v })} />
          <div className="space-y-1.5">
            <Label className="text-xs">Signup Enabled</Label>
            <Select value={form.carelim_signup_enabled} onValueChange={(v) => setForm({ ...form, carelim_signup_enabled: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Maintenance Mode</Label>
            <Select value={form.carelim_maintenance_mode} onValueChange={(v) => setForm({ ...form, carelim_maintenance_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Off</SelectItem>
                <SelectItem value="true">On</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-teal-600" /> Email (SMTP)</CardTitle>
          <CardDescription className="text-xs">Transactional email configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SettingInput label="SMTP Host" value={form.carelim_smtp_host} onChange={(v) => setForm({ ...form, carelim_smtp_host: v })} />
          <SettingInput label="SMTP Port" value={form.carelim_smtp_port} onChange={(v) => setForm({ ...form, carelim_smtp_port: v })} />
          <SettingInput label="SMTP User" value={form.carelim_smtp_user} onChange={(v) => setForm({ ...form, carelim_smtp_user: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> Payment Gateways</CardTitle>
          <CardDescription className="text-xs">API keys & webhook secrets</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingInput label="Stripe Secret Key" value={form.carelim_stripe_secret} onChange={(v) => setForm({ ...form, carelim_stripe_secret: v })} type="password" />
          <SettingInput label="Stripe Webhook Secret" value={form.carelim_stripe_webhook} onChange={(v) => setForm({ ...form, carelim_stripe_webhook: v })} type="password" />
          <SettingInput label="eSewa Merchant ID" value={form.carelim_esewa_merchant} onChange={(v) => setForm({ ...form, carelim_esewa_merchant: v })} />
          <SettingInput label="Khalti API Key" value={form.carelim_khalti_api_key} onChange={(v) => setForm({ ...form, carelim_khalti_api_key: v })} type="password" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={save} disabled={saving}>
          <SettingsIcon className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
