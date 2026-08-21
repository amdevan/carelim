"use client";
import { fetchAPI } from "@/lib/api";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, MoreVertical, Building2, Mail, Phone, MapPin, Calendar, Globe,
  LogIn, Pause, Play, Trash2, CreditCard, Activity, HardDrive, Server,
  Cpu, Stethoscope, Users, CalendarClock, ShieldCheck, Download, Filter, Plus,
  ChevronLeft, Headphones, Check, LayoutDashboard, FileText, FlaskConical,
  Scan, Pill, Package, Calculator, BarChart3, UsersRound, Settings,
  ChevronRight, KeyRound, Send, Eye, ClipboardList, UserCog, CalendarOff, Smile, Baby, Video, Bell,
  Clock, Hash, MessageSquare, Edit,
} from "lucide-react";
import { formatRs, formatDate, formatDateTime, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";

// ─── Platform Modules ────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Calendar,
  Stethoscope, FileText, FlaskConical, Scan, Pill, Package, CreditCard,
  Calculator, BarChart3, UsersRound, Settings, Shield: ShieldCheck,
  ClipboardList, UserCog, CalendarOff, Smile, Baby, Video, Bell, Globe,
};

const PLATFORM_MODULES = [
  // Overview
  { key: "dashboard", name: "Dashboard", category: "Overview", icon: "LayoutDashboard" },
  // Clinical - Core
  { key: "patients", name: "Patients", category: "Clinical", icon: "Users" },
  { key: "appointments", name: "Appointments", category: "Clinical", icon: "Calendar" },
  { key: "doctors", name: "Doctors & Departments", category: "Clinical", icon: "Stethoscope" },
  { key: "emr", name: "EMR & Prescriptions", category: "Clinical", icon: "FileText" },
  { key: "clinical-notes", name: "Clinical Notes", category: "Clinical", icon: "ClipboardList" },
  // Clinical - Diagnostics
  { key: "laboratory", name: "Laboratory (LIMS)", category: "Diagnostics", icon: "FlaskConical" },
  { key: "radiology", name: "Radiology (RIS)", category: "Diagnostics", icon: "Scan" },
  // Operations
  { key: "pharmacy", name: "Pharmacy", category: "Operations", icon: "Pill" },
  { key: "inventory", name: "Inventory (AIMS)", category: "Operations", icon: "Package" },
  // Finance
  { key: "billing", name: "Billing & Invoicing", category: "Finance", icon: "CreditCard" },
  { key: "accounting", name: "Accounting", category: "Finance", icon: "Calculator" },
  { key: "reports", name: "Reports & Analytics", category: "Finance", icon: "BarChart3" },
  // Administration
  { key: "hr", name: "Human Resources", category: "Administration", icon: "UsersRound" },
  { key: "staff", name: "Staff Management", category: "Administration", icon: "UserCog" },
  { key: "leave", name: "Leave Management", category: "Administration", icon: "CalendarOff" },
  { key: "settings", name: "Settings", category: "Administration", icon: "Settings" },
  { key: "audit", name: "Audit Logs", category: "Administration", icon: "Shield" },
  // Specialty
  { key: "dental", name: "Dental", category: "Specialty", icon: "Smile" },
  { key: "ivf", name: "IVF & Fertility", category: "Specialty", icon: "Baby" },
  { key: "telemedicine", name: "Telemedicine", category: "Specialty", icon: "Video" },
  // Platform
  { key: "public-booking", name: "Public Booking Page", category: "Platform", icon: "Globe" },
  { key: "notifications", name: "Notifications (Email/SMS)", category: "Platform", icon: "Bell" },
  { key: "insurance", name: "Insurance Claims", category: "Platform", icon: "ShieldCheck" },
];

const MODULE_CATEGORIES = [
  { id: "Overview", label: "Overview", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300" },
  { id: "Clinical", label: "Clinical", color: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" },
  { id: "Diagnostics", label: "Diagnostics", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  { id: "Operations", label: "Operations", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "Finance", label: "Finance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { id: "Administration", label: "Administration", color: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
  { id: "Specialty", label: "Specialty", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" },
  { id: "Platform", label: "Platform", color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300" },
];

function getModuleIcon(iconName: string) {
  return ICON_MAP[iconName] || Cpu;
}

// ─── Types ───────────────────────────────────────────────────────────
interface Plan {
  id: string; name: string; priceMonthly: number; priceYearly: number; maxDoctors: number; maxUsers: number; maxStorage: number;
}

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  address: string | null;
  city: string | null;
  country: string;
  registrationNo: string | null;
  planId: string | null;
  plan: Plan | null;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  usageRecords: Array<{
    date: string; userCount: number; doctorCount: number; patientCount: number;
    appointmentCount: number; storageUsedMB: number; apiCalls: number;
  }>;
}

interface TenantDetail extends Tenant {
  invoices: Array<{ id: string; invoiceNo: string; amount: number; total: number; status: string; date: string }>;
  tenantModules: Array<{ id: string; enabled: boolean; module: { id: string; name: string; category: string } }>;
  supportTickets: Array<{ id: string; ticketNo: string; subject: string; status: string; priority: string; createdAt: string }>;
}

interface SaasTenantsProps {
  filter?: string;
  onViewProfile?: (id: string | null) => void;
}

const STATUS_FILTERS = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { value: "trial", label: "Trial", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  { value: "suspended", label: "Suspended", color: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
];

// ─── Main Tenants List ───────────────────────────────────────────────
export function SaasTenants({ filter: initialFilter, onViewProfile }: SaasTenantsProps) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: tenants, loading } = useFetch<Tenant[]>(
    refresh ? `/api/tenants?_r=${refresh}` : "/api/tenants"
  );
  const { data: plans } = useFetch<Plan[]>("/api/plans");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilter && initialFilter !== "all" ? initialFilter : "all"
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [changePlanId, setChangePlanId] = useState<string | null>(null);
  const [newPlanId, setNewPlanId] = useState<string>("");

  const filtered = useMemo(() => {
    const list = tenants || [];
    return list.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.ownerName.toLowerCase().includes(q) ||
          t.ownerEmail.toLowerCase().includes(q) ||
          (t.city || "").toLowerCase().includes(q) ||
          (t.domain || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tenants, search, statusFilter]);

  const pagination = usePagination<Tenant>(filtered, 10);

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("tenants", ["Name", "Owner", "Email", "Phone", "City", "Plan", "Status", "Created"],
      filtered.map((t) => [t.name, t.ownerName, t.ownerEmail, t.ownerPhone, t.city || "", t.plan?.name || "", t.status, formatDate(t.createdAt)]));
    toast.success("Tenants exported");
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Tenant ${status === "active" ? "activated" : status === "suspended" ? "suspended" : "updated"}`);
      refreshFn();
    } else {
      toast.error("Failed to update tenant");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/tenants/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tenant deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete tenant");
    }
  };

  const handleChangePlan = async () => {
    if (!changePlanId || !newPlanId) return;
    const res = await fetchAPI(`/api/tenants/${changePlanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: newPlanId }),
    });
    if (res.ok) {
      toast.success("Plan updated");
      setChangePlanId(null);
      setNewPlanId("");
      refreshFn();
    } else {
      toast.error("Failed to change plan");
    }
  };

  const loginAs = async (t: Tenant) => {
    try {
      const res = await fetchAPI("/api/admin-impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: t.id }),
      });
      if (res.ok) {
        const data = await res.json();
        // Store impersonation context in the CMS store via localStorage
        const storeKey = "medcore-store";
        const existing = JSON.parse(localStorage.getItem(storeKey) || "{}");
        const state = existing.state || {};
        state.authed = true;
        state.user = { name: data.tenant.name, email: data.tenant.email, role: "Clinic Admin" };
        state.impersonation = { tenantId: data.tenant.id, tenantName: data.tenant.name, tenantEmail: data.tenant.email, enabledModules: data.tenant.enabledModules || [] };
        state.enabledModules = data.tenant.enabledModules || [];
        state.view = "dashboard";
        existing.state = state;
        localStorage.setItem(storeKey, JSON.stringify(existing));
        toast.success(`Logging in as ${t.name}…`, { description: "Redirecting to tenant workspace" });
        window.location.href = "/";
      } else {
        toast.error("Failed to impersonate tenant");
      }
    } catch {
      toast.error("Failed to impersonate tenant");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Tenants</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} of {tenants?.length || 0} clinics · manage workspaces, plans & status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" /> New Tenant
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, owner, email, city or domain…"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    statusFilter === f.value
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                  {f.value !== "all" && (
                    <span className="text-[10px] opacity-70">
                      ({(tenants || []).filter((t) => t.status === f.value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No tenants found" description="Try adjusting search or filter" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Clinic</TableHead>
                    <TableHead className="text-[11px] uppercase">Owner</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">City</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">Plan</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paged.map((t) => (
                    <TableRow
                      key={t.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => onViewProfile?.(t.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
                            <AvatarFallback className="bg-transparent text-teal-700 dark:text-teal-300 text-xs font-semibold">
                              {t.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{t.name}</p>
                            {t.domain && <p className="text-[11px] text-muted-foreground truncate">{t.domain}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{t.ownerName}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{t.ownerEmail}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{t.city || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {t.plan ? (
                          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">{t.plan.name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No plan</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[t.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusLabel(t.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(t.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onViewProfile?.(t.id)}>
                              <Building2 className="w-4 h-4" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => loginAs(t)}>
                              <LogIn className="w-4 h-4" /> Login As
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {t.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => updateStatus(t.id, "active")}>
                                <Play className="w-4 h-4 text-emerald-600" /> Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateStatus(t.id, "suspended")}>
                                <Pause className="w-4 h-4 text-amber-600" /> Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setChangePlanId(t.id); setNewPlanId(t.planId || ""); }}>
                              <CreditCard className="w-4 h-4" /> Change Plan
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
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create tenant dialog */}
      <CreateTenantWizard
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        plans={plans || []}
        onCreated={refreshFn}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tenant, their invoices, modules, usage records, tickets and audit logs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change plan dialog */}
      <AlertDialog open={!!changePlanId} onOpenChange={(o) => !o && setChangePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change subscription plan</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new plan for this tenant. Changes take effect immediately and will be reflected in the next invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={newPlanId} onValueChange={setNewPlanId}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                {(plans || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatRs(p.priceMonthly)}/mo · {p.maxDoctors} doctors
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleChangePlan}
              disabled={!newPlanId}
            >
              Update Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CREATE TENANT WIZARD (Multi-step)
// ═══════════════════════════════════════════════════════════════════════
interface CreateTenantWizardProps {
  open: boolean;
  onClose: () => void;
  plans: Plan[];
  onCreated: () => void;
}

const WIZARD_STEPS = [
  { label: "Clinic Info", description: "Basic clinic details" },
  { label: "Modules", description: "Select platform modules" },
  { label: "Plan & Status", description: "Subscription setup" },
];

function CreateTenantWizard({ open, onClose, plans, onCreated }: CreateTenantWizardProps) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", ownerName: "", ownerEmail: "", ownerPhone: "",
    address: "", city: "", country: "Nepal", registrationNo: "",
    planId: "", status: "trial", trialDays: 14,
  });
  const [selectedModules, setSelectedModules] = useState<string[]>(
    PLATFORM_MODULES.map((m) => m.key)
  );
  const [moduleSearch, setModuleSearch] = useState("");
  const [activeModuleCategory, setActiveModuleCategory] = useState<string>("all");

  const updateForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleModule = (key: string) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const filteredWizardModules = useMemo(() => {
    let mods = PLATFORM_MODULES;
    if (moduleSearch) {
      const q = moduleSearch.toLowerCase();
      mods = mods.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    } else if (activeModuleCategory !== "all") {
      mods = mods.filter((m) => m.category === activeModuleCategory);
    }
    return mods;
  }, [moduleSearch, activeModuleCategory]);

  const wizardModuleGroups = useMemo(() => {
    const groups: Record<string, typeof PLATFORM_MODULES> = {};
    filteredWizardModules.forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [filteredWizardModules]);

  const canProceedStep1 = form.name.trim() && form.ownerName.trim() && form.ownerEmail.trim() && form.ownerPhone.trim();
  const canProceedStep2 = selectedModules.length > 0;
  const canSubmit = canProceedStep1 && canProceedStep2;

  const handleBack = () => setStep((s) => Math.max(1, s - 1));
  const handleNext = () => setStep((s) => Math.min(3, s + 1));

  const handleCreate = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const body = {
        ...form,
        modules: selectedModules.map((key) => {
          const mod = PLATFORM_MODULES.find((m) => m.key === key);
          return { key, name: mod?.name || key, category: mod?.category || "general" };
        }),
      };
      const res = await fetchAPI("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Clinic created successfully");
        resetWizard();
        onClose();
        onCreated();
      } else {
        toast.error("Failed to create clinic");
      }
    } catch {
      toast.error("Failed to create clinic");
    } finally {
      setCreating(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setForm({
      name: "", ownerName: "", ownerEmail: "", ownerPhone: "",
      address: "", city: "", country: "Nepal", registrationNo: "",
      planId: "", status: "trial", trialDays: 14,
    });
    setSelectedModules(PLATFORM_MODULES.map((m) => m.key));
    setModuleSearch("");
    setActiveModuleCategory("all");
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Clinic</DialogTitle>
          <DialogDescription>Register a new clinic on the platform in 3 steps.</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 my-2">
          {WIZARD_STEPS.map((ws, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return (
              <div key={ws.label} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300 shrink-0 ${
                      isCompleted
                        ? "bg-teal-600 text-white"
                        : isActive
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-2 border-teal-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className={`text-xs font-medium truncate ${isActive ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground"}`}>
                      {ws.label}
                    </p>
                  </div>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${isCompleted ? "bg-teal-600" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <p className="text-sm font-semibold text-muted-foreground mb-3">Step 1 — Clinic Information</p>
                <div className="space-y-1.5">
                  <Label>Clinic Name <span className="text-rose-500">*</span></Label>
                  <Input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="e.g. City Care Clinic" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Owner Name <span className="text-rose-500">*</span></Label>
                    <Input value={form.ownerName} onChange={(e) => updateForm({ ownerName: e.target.value })} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Owner Email <span className="text-rose-500">*</span></Label>
                    <Input type="email" value={form.ownerEmail} onChange={(e) => updateForm({ ownerEmail: e.target.value })} placeholder="owner@clinic.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Phone <span className="text-rose-500">*</span></Label>
                  <Input value={form.ownerPhone} onChange={(e) => updateForm({ ownerPhone: e.target.value })} placeholder="+977-XXXXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => updateForm({ address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => updateForm({ city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => updateForm({ country: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Registration No</Label>
                  <Input value={form.registrationNo} onChange={(e) => updateForm({ registrationNo: e.target.value })} placeholder="Official registration number" />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">Step 2 — Module Selection</p>
                  <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 text-[10px]">
                    {selectedModules.length} of {PLATFORM_MODULES.length} selected
                  </Badge>
                </div>

                {/* Module search & category filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      placeholder="Search modules…"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    <button
                      onClick={() => setActiveModuleCategory("all")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        activeModuleCategory === "all"
                          ? "bg-teal-600 text-white"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      All
                    </button>
                    {MODULE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveModuleCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                          activeModuleCategory === cat.id
                            ? "bg-teal-600 text-white"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module grid by category */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {Object.entries(wizardModuleGroups).map(([category, mods]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mods.map((mod) => {
                          const IconComp = getModuleIcon(mod.icon);
                          const isSelected = selectedModules.includes(mod.key);
                          return (
                            <div
                              key={mod.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleModule(mod.key)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleModule(mod.key); } }}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
                                  : "border-border hover:border-muted-foreground/30 bg-background"
                              }`}
                            >
                              <div className={`p-1.5 rounded-md ${isSelected ? "bg-teal-100 dark:bg-teal-900/40" : "bg-muted"}`}>
                                <IconComp className={`w-4 h-4 ${isSelected ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{mod.name}</p>
                              </div>
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {Object.keys(wizardModuleGroups).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No modules match your search</p>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedModules(PLATFORM_MODULES.map((m) => m.key))}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedModules([])}>
                    Clear All
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm font-semibold text-muted-foreground mb-1">Step 3 — Plan & Status</p>

                {/* Summary */}
                <div className="p-3 rounded-lg bg-muted/40 border">
                  <p className="text-xs font-semibold mb-2">Clinic Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <span className="font-medium">{form.name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner: </span>
                      <span className="font-medium">{form.ownerName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modules: </span>
                      <span className="font-medium">{selectedModules.length} selected</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <span className="font-medium">{form.ownerEmail || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Subscription Plan</Label>
                  <Select value={form.planId} onValueChange={(v) => updateForm({ planId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a plan (optional)" /></SelectTrigger>
                    <SelectContent>
                      {(plans || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatRs(p.priceMonthly)}/mo · {p.maxDoctors} doctors
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateForm({ status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.status === "trial" && (
                  <div className="space-y-1.5">
                    <Label>Trial Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={form.trialDays}
                      onChange={(e) => updateForm({ trialDays: parseInt(e.target.value) || 14 })}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between pt-2 border-t">
          <div>
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                onClick={handleNext}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                onClick={handleCreate}
                disabled={!canSubmit || creating}
              >
                {creating ? "Creating…" : "Create Clinic"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ADD MODULE DIALOG
// ═══════════════════════════════════════════════════════════════════════
interface AddModuleDialogProps {
  open: boolean;
  onClose: () => void;
  existingModuleKeys: string[];
  onAdd: (moduleKeys: string[]) => void;
}

function AddModuleDialog({ open, onClose, existingModuleKeys, onAdd }: AddModuleDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const availableModules = useMemo(() => {
    const existingSet = new Set(existingModuleKeys);
    let mods = PLATFORM_MODULES.filter((m) => !existingSet.has(m.key));
    if (search) {
      const q = search.toLowerCase();
      mods = mods.filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return mods;
  }, [existingModuleKeys, search]);

  const toggleSelect = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAdd(selected);
    setSelected([]);
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Modules</DialogTitle>
          <DialogDescription>Select additional modules to enable for this clinic.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules…"
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableModules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {existingModuleKeys.length >= PLATFORM_MODULES.length
                  ? "All modules are already enabled."
                  : "No modules match your search."}
              </p>
            ) : (
              availableModules.map((mod) => {
                const IconComp = getModuleIcon(mod.icon);
                const isSelected = selected.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(mod.key)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(mod.key); } }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${isSelected ? "bg-teal-100 dark:bg-teal-900/40" : "bg-muted"}`}>
                      <IconComp className={`w-4 h-4 ${isSelected ? "text-teal-600" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{mod.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{mod.category}</p>
                    </div>
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            onClick={handleAdd}
            disabled={selected.length === 0}
          >
            <Plus className="w-4 h-4" /> Add {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FULL-PAGE TENANT PROFILE
// ═══════════════════════════════════════════════════════════════════════
export function SaasTenantProfile({ tenantId, onBack }: { tenantId: string | null; onBack: () => void }) {
  const [refresh, setRefresh] = useState(0);
  const { data: tenant, loading } = useFetch<TenantDetail | null>(
    tenantId ? `/api/tenants/${tenantId}?_r=${refresh}` : null
  );
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);

  const [addModuleOpen, setAddModuleOpen] = useState(false);

  // Group tenant modules by category — must be before any conditional returns
  const moduleCategoryCounts = useMemo(() => {
    if (!tenant?.tenantModules) return {};
    const counts: Record<string, { total: number; enabled: number }> = {};
    tenant.tenantModules.forEach((tm) => {
      const cat = tm.module.category || "Other";
      if (!counts[cat]) counts[cat] = { total: 0, enabled: 0 };
      counts[cat].total++;
      if (tm.enabled) counts[cat].enabled++;
    });
    return counts;
  }, [tenant?.tenantModules]);

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No tenant selected</p>
      </div>
    );
  }

  if (loading || !tenant) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-12 w-60 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const handleToggleModule = async (moduleId: string, currentEnabled: boolean) => {
    const res = await fetchAPI(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleModule: { moduleId, enabled: !currentEnabled } }),
    });
    if (res.ok) {
      toast.success(`Module ${currentEnabled ? "disabled" : "enabled"}`);
      refreshFn();
    } else {
      toast.error("Failed to update module");
    }
  };

  const handleAddModules = async (moduleKeys: string[]) => {
    const modulesToAdd = moduleKeys.map((key) => {
      const mod = PLATFORM_MODULES.find((m) => m.key === key);
      return { name: mod?.name || key, category: mod?.category || "general" };
    });
    const res = await fetchAPI(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addModules: modulesToAdd }),
    });
    if (res.ok) {
      toast.success(`${moduleKeys.length} module(s) added`);
      refreshFn();
    } else {
      toast.error("Failed to add modules");
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await fetchAPI("/api/tenant-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", tenantId }),
      });
      if (res.ok) {
        toast.success("Password reset email sent to owner");
      } else {
        toast.error("Failed to send password reset");
      }
    } catch {
      toast.error("Failed to send password reset");
    }
  };

  const handleSendWelcome = async () => {
    try {
      const res = await fetchAPI("/api/tenant-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_welcome", tenantId }),
      });
      if (res.ok) {
        toast.success("Welcome email sent");
      } else {
        toast.error("Failed to send welcome email");
      }
    } catch {
      toast.error("Failed to send welcome email");
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetchAPI("/api/tenant-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_data", tenantId }),
      });
      if (res.ok) {
        toast.success("Data export initiated — you'll receive an email shortly");
      } else {
        toast.error("Failed to initiate data export");
      }
    } catch {
      toast.error("Failed to initiate data export");
    }
  };

  const handleImpersonate = async () => {
    try {
      const res = await fetchAPI("/api/admin-impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        const data = await res.json();
        const enabledModules = data.tenant.enabledModules || [];
        // Use Zustand's setState — persist middleware will auto-save to localStorage
        useAppStore.setState({
          authed: true,
          user: { name: data.tenant.name, email: data.tenant.email, role: "Clinic Admin" },
          impersonation: { tenantId: data.tenant.id, tenantName: data.tenant.name, tenantEmail: data.tenant.email, enabledModules },
          enabledModules,
          view: "dashboard" as ViewKey,
        });
        toast.success(`Logging in as ${tenant.name}…`, { description: "Redirecting to tenant workspace" });
        window.location.href = "/";
      } else {
        toast.error("Failed to impersonate tenant");
      }
    } catch {
      toast.error("Failed to impersonate tenant");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-950/50">
            <AvatarFallback className="bg-transparent text-teal-700 dark:text-teal-300 font-bold text-xl">
              {tenant.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{tenant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-[10px] ${statusColors[tenant.status] || "bg-gray-100"}`}>
                {statusLabel(tenant.status)}
              </Badge>
              {tenant.plan && (
                <Badge className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                  {tenant.plan.name}
                </Badge>
              )}
              {tenant.domain && (
                <Badge variant="outline" className="text-[10px] font-mono">{tenant.domain}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={refreshFn}>
            <Activity className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={handleImpersonate}>
          <LogIn className="w-3.5 h-3.5" /> Login As
        </Button>
        {tenant.status === "suspended" ? (
          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <Play className="w-3.5 h-3.5" /> Activate
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50">
            <Pause className="w-3.5 h-3.5" /> Suspend
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Change Plan
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>

      {/* Clinic info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" /> Clinic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow icon={Users} label="Owner" value={tenant.ownerName} />
            <InfoRow icon={Mail} label="Email" value={tenant.ownerEmail} />
            <InfoRow icon={Phone} label="Phone" value={tenant.ownerPhone} />
            <InfoRow icon={MapPin} label="Address" value={tenant.address || "—"} />
            <InfoRow icon={Globe} label="City / Country" value={`${tenant.city || "—"}, ${tenant.country}`} />
            <InfoRow icon={ShieldCheck} label="Reg. No" value={tenant.registrationNo || "—"} />
            <InfoRow icon={Calendar} label="Created" value={formatDate(tenant.createdAt)} />
            <InfoRow icon={Calendar} label="Last Login" value={tenant.lastLoginAt ? formatDateTime(tenant.lastLoginAt) : "Never"} />
            {tenant.trialEndsAt && (
              <InfoRow icon={CalendarClock} label="Trial Ends" value={formatDate(tenant.trialEndsAt)} />
            )}
            {tenant.domain && (
              <InfoRow icon={Globe} label="Domain" value={tenant.domain} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan & Billing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" /> Plan & Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.plan ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Plan</p>
                <p className="font-semibold">{tenant.plan.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Monthly</p>
                <p className="font-semibold tabular-nums">{formatRs(tenant.plan.priceMonthly)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Yearly</p>
                <p className="font-semibold tabular-nums">{formatRs(tenant.plan.priceYearly)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Max Doctors</p>
                <p className="font-semibold tabular-nums">{tenant.plan.maxDoctors}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No plan assigned</p>
          )}
          {tenant.invoices.length > 0 && (
            <>
              <Separator className="my-3" />
              <p className="text-xs font-semibold mb-2">Recent Invoices</p>
              <div className="space-y-1.5">
                {tenant.invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{inv.invoiceNo}</span>
                    <span className="text-muted-foreground">{formatDate(inv.date)}</span>
                    <span className="font-semibold tabular-nums">{formatRs(inv.total)}</span>
                    <Badge className={`text-[9px] ${statusColors[inv.status] || "bg-gray-100"}`}>{statusLabel(inv.status)}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage monitoring */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600" /> Usage Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(() => {
              const latest = tenant.usageRecords[0];
              if (!latest) return <p className="text-sm text-muted-foreground">No usage data yet</p>;
              const maxStorage = tenant.plan?.maxStorage || 5;
              const storagePct = Math.min((latest.storageUsedMB / (maxStorage * 1024)) * 100, 100);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <UsageStat icon={Users} label="Users" value={latest.userCount} />
                    <UsageStat icon={Stethoscope} label="Doctors" value={latest.doctorCount} />
                    <UsageStat icon={Activity} label="Patients" value={latest.patientCount} />
                    <UsageStat icon={CalendarClock} label="Appointments" value={latest.appointmentCount} />
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-muted-foreground" /> Storage Used</span>
                      <span className="font-semibold tabular-nums">{latest.storageUsedMB.toFixed(1)} MB / {maxStorage} GB</span>
                    </div>
                    <Progress value={storagePct} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-muted-foreground" /> API Calls (this period)</span>
                      <span className="font-semibold tabular-nums">{latest.apiCalls.toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min((latest.apiCalls / 100000) * 100, 100)} className="h-1.5" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">Last reported: {timeAgo(latest.date)}</p>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* ── Enabled Modules (Enhanced) ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-600" /> Enabled Modules
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setAddModuleOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Module
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tenant.tenantModules.length === 0 ? (
            <div className="text-center py-6">
              <Cpu className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No modules enabled</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setAddModuleOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add First Module
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category counts */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(moduleCategoryCounts).map(([cat, counts]) => (
                  <Badge key={cat} variant="outline" className="text-[10px] gap-1">
                    <span className="capitalize">{cat}</span>
                    <span className="text-muted-foreground">{counts.enabled}/{counts.total}</span>
                  </Badge>
                ))}
              </div>

              {/* Module list with toggles */}
              <div className="space-y-1.5">
                {tenant.tenantModules.map((tm) => {
                  const modMeta = PLATFORM_MODULES.find((m) => m.key.toLowerCase() === tm.module.name.toLowerCase() || m.name === tm.module.name);
                  const iconName = modMeta?.icon || "Cpu";
                  const IconComp = getModuleIcon(iconName);
                  const catMeta = MODULE_CATEGORIES.find((c) => c.id.toLowerCase() === tm.module.category?.toLowerCase());

                  return (
                    <motion.div
                      key={tm.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${tm.enabled ? "bg-teal-100 dark:bg-teal-900/40" : "bg-muted"}`}>
                          <IconComp className={`w-4 h-4 ${tm.enabled ? "text-teal-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tm.module.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{tm.module.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {catMeta && (
                          <Badge className={`text-[9px] ${catMeta.color}`}>
                            {catMeta.label}
                          </Badge>
                        )}
                        <Switch
                          checked={tm.enabled}
                          onCheckedChange={() => handleToggleModule(tm.module.id, tm.enabled)}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Control Panel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-teal-600" /> Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleResetPassword}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Reset Password</p>
                <p className="text-[11px] text-muted-foreground">Send a password reset link to the owner</p>
              </div>
            </button>

            <button
              onClick={handleSendWelcome}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Send Welcome Email</p>
                <p className="text-[11px] text-muted-foreground">Send onboarding and welcome instructions</p>
              </div>
            </button>

            <button
              onClick={handleExportData}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Export Data</p>
                <p className="text-[11px] text-muted-foreground">Export clinic data as CSV or PDF</p>
              </div>
            </button>

            <button
              onClick={handleImpersonate}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-left group"
            >
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Impersonate / Login As</p>
                <p className="text-[11px] text-muted-foreground">Access the clinic workspace directly</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent tickets */}
      {tenant.supportTickets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="w-4 h-4 text-teal-600" /> Recent Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenant.supportTickets.slice(0, 4).map((tk) => (
                <div key={tk.id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tk.subject}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{tk.ticketNo}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] ${
                      tk.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" :
                      tk.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" :
                      "bg-gray-100 text-gray-600"
                    }`}>{tk.priority}</Badge>
                    <Badge className={`text-[9px] ${statusColors[tk.status] || "bg-gray-100"}`}>{statusLabel(tk.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Module Dialog */}
      <AddModuleDialog
        open={addModuleOpen}
        onClose={() => setAddModuleOpen(false)}
        existingModuleKeys={tenant.tenantModules.map((tm) => tm.module.name)}
        onAdd={handleAddModules}
      />

      {/* ── Branches ── */}
      <TenantBranches tenantId={tenantId} onRefresh={refreshFn} />

      {/* ── Clinic Settings ── */}
      <ClinicSettingsForm tenantId={tenantId} onRefresh={refreshFn} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function UsageStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TENANT BRANCHES
// ═══════════════════════════════════════════════════════════════════════
interface TenantBranch {
  id: string; name: string; code: string; clinicType: string; address: string | null;
  city: string | null; state: string | null; country: string | null; phone: string | null;
  email: string | null; manager: string | null; capacity: number; operatingHours: string | null;
  status: string; createdAt: string;
}

const CLINIC_TYPES = ["General", "Dental", "IVF & Fertility", "Telemedicine", "Pediatrics", "Orthopedics", "Cardiology", "Neurology", "Ophthalmology", "Dermatology", "ENT", "Oncology", "Psychiatry", "Rehabilitation", "Diagnostic Center"];

function TenantBranches({ tenantId, onRefresh }: { tenantId: string; onRefresh: () => void }) {
  const [tick, setTick] = useState(0);
  const { data: branches, loading } = useFetch<TenantBranch[]>(
    tick ? `/api/tenants/${tenantId}/branches?_r=${tick}` : `/api/tenants/${tenantId}/branches`
  );
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<TenantBranch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<TenantBranch | null>(null);
  const [form, setForm] = useState({ name: "", code: "", clinicType: "General", address: "", city: "", state: "", country: "Nepal", phone: "", email: "", manager: "", capacity: 50, operatingHours: "09:00-17:00", status: "active" });
  const [saving, setSaving] = useState(false);

  const allBranches = Array.isArray(branches) ? branches : [];

  const openAdd = () => { setForm({ name: "", code: "", clinicType: "General", address: "", city: "", state: "", country: "Nepal", phone: "", email: "", manager: "", capacity: 50, operatingHours: "09:00-17:00", status: "active" }); setAddOpen(true); };
  const openEdit = (b: TenantBranch) => {
    setForm({ name: b.name, code: b.code, clinicType: b.clinicType, address: b.address || "", city: b.city || "", state: b.state || "", country: b.country || "Nepal", phone: b.phone || "", email: b.email || "", manager: b.manager || "", capacity: b.capacity, operatingHours: b.operatingHours || "09:00-17:00", status: b.status });
    setEditBranch(b);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 50, address: form.address || null, city: form.city || null, state: form.state || null, country: form.country || null, phone: form.phone || null, email: form.email || null, manager: form.manager || null, operatingHours: form.operatingHours || null };
      const url = editBranch ? `/api/tenants/${tenantId}/branches/${editBranch.id}` : `/api/tenants/${tenantId}/branches`;
      const method = editBranch ? "PUT" : "POST";
      const res = await fetchAPI(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed");
      toast.success(editBranch ? "Branch updated" : "Branch created");
      setAddOpen(false); setEditBranch(null); refresh(); onRefresh();
    } catch { toast.error("Failed to save branch"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteBranch) return;
    const res = await fetchAPI(`/api/tenants/${tenantId}/branches/${deleteBranch.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Branch deleted"); setDeleteBranch(null); refresh(); onRefresh(); }
    else toast.error("Failed to delete branch");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" /> Branches ({allBranches.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add Branch
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : allBranches.length === 0 ? (
          <div className="text-center py-6">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No branches configured</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add First Branch</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {allBranches.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {b.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-mono">{b.code}</span>
                      <span>·</span>
                      <span>{b.clinicType}</span>
                      {b.city && <><span>·</span><span>{b.city}</span></>}
                      {b.manager && <><span>·</span><span>{b.manager}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${statusColors[b.status] || "bg-gray-100"}`}>{statusLabel(b.status)}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => setDeleteBranch(b)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen || !!editBranch} onOpenChange={() => { setAddOpen(false); setEditBranch(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editBranch ? "Edit Branch" : "Add Branch"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Branch name" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BR-001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Clinic Type</Label>
                <Select value={form.clinicType} onValueChange={(v) => setForm({ ...form, clinicType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLINIC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Manager</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 0 })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Hours</Label><Input value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} placeholder="09:00-17:00" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditBranch(null); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editBranch ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBranch} onOpenChange={() => setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>Delete <span className="font-semibold">"{deleteBranch?.name}"</span>? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CLINIC SETTINGS FORM
// ═══════════════════════════════════════════════════════════════════════
interface ClinicSettingsData {
  id: string; clinicName: string | null; clinicEmail: string | null; clinicPhone: string | null;
  clinicWebsite: string | null; clinicLogo: string | null; address: string | null; city: string | null;
  state: string | null; country: string | null; zipCode: string | null; timezone: string | null;
  currency: string | null; currencySymbol: string | null; locale: string | null; dateFormat: string | null;
  timeFormat: string | null; fiscalYearStart: string | null; taxRate: number; taxEnabled: boolean;
  appointmentSlot: number; maxAppointments: number; autoReminder: boolean; reminderHours: number;
  smsEnabled: boolean; emailEnabled: boolean; whatsappEnabled: boolean; logo: string | null;
  primaryColor: string | null; secondaryColor: string | null; footerText: string | null;
  termsAndCond: string | null; privacyPolicy: string | null;
}

function ClinicSettingsForm({ tenantId, onRefresh }: { tenantId: string; onRefresh: () => void }) {
  const { data: settings, loading } = useFetch<ClinicSettingsData>(`/api/tenants/${tenantId}/settings`);
  const [form, setForm] = useState<Partial<ClinicSettingsData>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const update = (patch: Partial<ClinicSettingsData>) => setForm((prev) => ({ ...prev, ...patch }));

  // Load settings into form
  useMemo(() => {
    if (settings && !loaded) { setForm(settings); setLoaded(true); }
  }, [settings, loaded]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/tenants/${tenantId}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { toast.success("Settings saved"); onRefresh(); }
      else toast.error("Failed to save settings");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-teal-600" /> Clinic Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-48 rounded-lg" /> : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Clinic Name</Label><Input value={form.clinicName || ""} onChange={(e) => update({ clinicName: e.target.value })} placeholder="Carelim Clinic" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={form.clinicEmail || ""} onChange={(e) => update({ clinicEmail: e.target.value })} placeholder="info@carelim.com" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.clinicPhone || ""} onChange={(e) => update({ clinicPhone: e.target.value })} placeholder="+977-1-XXXXXXX" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Website</Label><Input value={form.clinicWebsite || ""} onChange={(e) => update({ clinicWebsite: e.target.value })} placeholder="https://carelim.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={(e) => update({ address: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={(e) => update({ city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={(e) => update({ state: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={form.country || ""} onChange={(e) => update({ country: e.target.value })} /></div>
              </div>
            </div>

            <Separator />

            {/* Localization */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Localization & Format</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Currency</Label>
                  <Select value={form.currency || "NPR"} onValueChange={(v) => update({ currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NPR">NPR (Nepali Rupee)</SelectItem>
                      <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Timezone</Label>
                  <Select value={form.timezone || "Asia/Kathmandu"} onValueChange={(v) => update({ timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kathmandu">Asia/Kathmandu</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Date Format</Label>
                  <Select value={form.dateFormat || "YYYY-MM-DD"} onValueChange={(v) => update({ dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="space-y-1.5"><Label className="text-xs">Time Format</Label>
                  <Select value={form.timeFormat || "24h"} onValueChange={(v) => update({ timeFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="24h">24 Hour</SelectItem><SelectItem value="12h">12 Hour (AM/PM)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Fiscal Year Start</Label><Input value={form.fiscalYearStart || "01-01"} onChange={(e) => update({ fiscalYearStart: e.target.value })} placeholder="MM-DD" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Locale</Label>
                  <Select value={form.locale || "en"} onValueChange={(v) => update({ locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ne">Nepali</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Appointments */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Appointments</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Slot Duration (minutes)</Label><Input type="number" value={form.appointmentSlot || 15} onChange={(e) => update({ appointmentSlot: Number(e.target.value) || 15 })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Max Appointments/Day</Label><Input type="number" value={form.maxAppointments || 50} onChange={(e) => update({ maxAppointments: Number(e.target.value) || 50 })} /></div>
              </div>
            </div>

            <Separator />

            {/* Notifications */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notifications & Integrations</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Email Notifications</span></div>
                  <Switch checked={form.emailEnabled ?? true} onCheckedChange={(v) => update({ emailEnabled: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-muted-foreground" /><span className="text-sm">SMS Notifications</span></div>
                  <Switch checked={form.smsEnabled ?? false} onCheckedChange={(v) => update({ smsEnabled: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-muted-foreground" /><span className="text-sm">WhatsApp</span></div>
                  <Switch checked={form.whatsappEnabled ?? false} onCheckedChange={(v) => update({ whatsappEnabled: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Auto Reminders</span></div>
                  <Switch checked={form.autoReminder ?? true} onCheckedChange={(v) => update({ autoReminder: v })} />
                </div>
              </div>
              {form.autoReminder && (
                <div className="mt-3"><Label className="text-xs">Reminder Before (hours)</Label><Input type="number" className="w-32 mt-1" value={form.reminderHours || 24} onChange={(e) => update({ reminderHours: Number(e.target.value) || 24 })} /></div>
              )}
            </div>

            <Separator />

            {/* Tax & Billing */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tax & Billing</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Tax Enabled</span></div>
                  <Switch checked={form.taxEnabled ?? false} onCheckedChange={(v) => update({ taxEnabled: v })} />
                </div>
                {form.taxEnabled && (
                  <div className="space-y-1.5"><Label className="text-xs">Tax Rate (%)</Label><Input type="number" step="0.1" value={form.taxRate || 0} onChange={(e) => update({ taxRate: Number(e.target.value) || 0 })} /></div>
                )}
              </div>
            </div>

            <Separator />

            {/* Branding */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Branding & Legal</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2"><input type="color" value={form.primaryColor || "#0d9488"} onChange={(e) => update({ primaryColor: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" /><Input value={form.primaryColor || "#0d9488"} onChange={(e) => update({ primaryColor: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Secondary Color</Label>
                  <div className="flex gap-2"><input type="color" value={form.secondaryColor || "#10b981"} onChange={(e) => update({ secondaryColor: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" /><Input value={form.secondaryColor || "#10b981"} onChange={(e) => update({ secondaryColor: e.target.value })} /></div>
                </div>
              </div>
              <div className="space-y-1.5 mt-3"><Label className="text-xs">Footer Text</Label><Input value={form.footerText || ""} onChange={(e) => update({ footerText: e.target.value })} placeholder="Footer text for invoices" /></div>
              <div className="space-y-1.5 mt-3"><Label className="text-xs">Terms & Conditions</Label><Input value={form.termsAndCond || ""} onChange={(e) => update({ termsAndCond: e.target.value })} placeholder="Terms and conditions text" /></div>
              <div className="space-y-1.5 mt-3"><Label className="text-xs">Privacy Policy URL</Label><Input value={form.privacyPolicy || ""} onChange={(e) => update({ privacyPolicy: e.target.value })} placeholder="https://..." /></div>
            </div>

            {/* Save */}
            <div className="flex justify-end pt-2 border-t">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
