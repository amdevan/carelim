"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { IvfDashboard } from "@/components/ivf/dashboard";
import { IvfCycles } from "@/components/ivf/cycles";
import {
  IvfAssessments, IvfProtocols, IvfFollicular, IvfOPU, IvfAndrology,
  IvfEmbryology, IvfCryobank, IvfTransfer, IvfPregnancy, IvfDonors,
  IvfConsents, IvfPackagesView, IvfReports,
} from "@/components/ivf/modules";
import { toast } from "sonner";
import {
  HeartPulse, LayoutDashboard, Users, FlaskConical, Stethoscope, Activity,
  Microscope, Egg, TestTubes, TestTube2, Snowflake, Syringe, Baby,
  FileText, BarChart3, Settings as SettingsIcon, ChevronDown, ChevronRight,
  Search, Bell, Menu, X, LogOut, UserCircle, Plus, Zap,
  ChevronLeft, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles,
  CircleDot, LayoutGrid,
} from "lucide-react";

// =====================================================================
// Navigation
// =====================================================================
type ViewTab =
  | "dashboard" | "couples" | "cycles" | "protocols" | "stimulation"
  | "follicular" | "opu" | "andrology" | "embryology" | "cryobank"
  | "transfer" | "pregnancy" | "donors" | "consents" | "packages" | "reports" | "settings";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: ViewTab;
  description: string;
  available: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, tab: "dashboard", description: "IVF KPIs, cycle trends, status breakdown", available: true },
    ],
  },
  {
    label: "Treatment",
    items: [
      { label: "Couple Management", icon: Users, tab: "couples", description: "Patient & partner fertility profiles", available: false },
      { label: "IVF Cycles", icon: FlaskConical, tab: "cycles", description: "Plan, monitor & track IVF cycles", available: true },
      { label: "Treatment Protocols", icon: Stethoscope, tab: "protocols", description: "Antagonist, agonist, natural & mild protocols", available: false },
      { label: "Stimulation", icon: Activity, tab: "stimulation", description: "Gonadotropin stimulation schedules", available: false },
      { label: "Follicular Monitoring", icon: Microscope, tab: "follicular", description: "Serial ultrasounds & E2 tracking", available: false },
      { label: "Egg Retrieval (OPU)", icon: Egg, tab: "opu", description: "Oocyte pick-up procedure records", available: false },
    ],
  },
  {
    label: "Laboratory",
    items: [
      { label: "Andrology", icon: TestTubes, tab: "andrology", description: "Semen analysis & processing", available: false },
      { label: "Embryology Lab", icon: TestTube2, tab: "embryology", description: "Embryo culture, grading & ICSI", available: false },
      { label: "Cryobank", icon: Snowflake, tab: "cryobank", description: "Frozen embryos, oocytes & sperm storage", available: false },
    ],
  },
  {
    label: "Outcomes",
    items: [
      { label: "Embryo Transfer", icon: Syringe, tab: "transfer", description: "Fresh, frozen & donor transfers", available: false },
      { label: "Pregnancy Tracking", icon: Baby, tab: "pregnancy", description: "β-hCG, ultrasound & EDD follow-ups", available: false },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Donor Management", icon: HeartPulse, tab: "donors", description: "Egg, sperm & embryo donor registry", available: false },
      { label: "Consent Forms", icon: FileText, tab: "consents", description: "IVF, ICSI, freezing & donor consents", available: false },
      { label: "IVF Reports", icon: BarChart3, tab: "reports", description: "Success rates, SART-style reports", available: false },
      { label: "Settings", icon: SettingsIcon, tab: "settings", description: "Module configuration & preferences", available: false },
    ],
  },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  dashboard: "Dashboard",
  couples: "Couple Management",
  cycles: "IVF Cycles",
  protocols: "Treatment Protocols",
  stimulation: "Stimulation",
  follicular: "Follicular Monitoring",
  opu: "Egg Retrieval (OPU)",
  andrology: "Andrology",
  embryology: "Embryology Lab",
  cryobank: "Cryobank",
  transfer: "Embryo Transfer",
  pregnancy: "Pregnancy Tracking",
  donors: "Donor Management",
  consents: "Consent Forms",
  packages: "IVF Packages",
  reports: "IVF Reports",
  settings: "Settings",
};

const NOTIFICATIONS = [
  { title: "OPU scheduled", desc: "Cycle IVF-00021 scheduled for egg retrieval tomorrow", time: "12m", type: "info" },
  { title: "β-hCG positive", desc: "Cycle IVF-00018 tested positive — pregnancy confirmed", time: "2h", type: "success" },
  { title: "Embryo frozen", desc: "2 blastocysts vitrified and added to cryobank (tank T-3)", time: "5h", type: "info" },
  { title: "Consent pending", desc: "IVF treatment consent awaiting patient signature", time: "1d", type: "warn" },
  { title: "Cryobank alert", desc: "Tank T-2 liquid nitrogen level low — refill required", time: "2d", type: "error" },
];

// =====================================================================
// Page
// =====================================================================
export default function IvfPage() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string; branchId?: number; permissions?: string[] } | null>(null);
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allNavItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ivf-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user) {
          setUser(parsed.user);
          setAuthed(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const logout = () => {
    localStorage.removeItem("ivf-user");
    setUser(null);
    setAuthed(false);
    toast.success("Signed out of IVF Module");
  };

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allNavItems
      .filter((i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allNavItems]);

  const navigate = (newTab: ViewTab) => {
    setTab(newTab);
    setMobileSidebarOpen(false);
    setSearch("");
  };

  if (!authed) return <IvfLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Add-on banner */}
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-pink-500" />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
      >
        <SidebarBrand collapsed={sidebarCollapsed} />
        <SidebarNav
          collapsed={sidebarCollapsed}
          activeTab={tab}
          navigate={navigate}
        />
        <SidebarFooter collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <SidebarBrand collapsed={false} compact />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileSidebarOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <SidebarNav collapsed={false} activeTab={tab} navigate={navigate} />
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <IvfHeader
          tab={tab}
          toggleSidebar={() => setSidebarCollapsed((v) => !v)}
          openMobile={() => setMobileSidebarOpen(true)}
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          navigate={navigate}
          logout={logout}
          user={user}
        />

        {/* Add-on enabled banner */}
        <div className="px-4 sm:px-5 lg:px-6 pt-4">
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">
                IVF &amp; Fertility Module — Add-on Enabled
              </p>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-300/70 hidden sm:block">
                Full ART workflow: cycles, follicular monitoring, embryology, cryobank, pregnancy tracking.
              </p>
            </div>
            <Badge className="text-[9px] bg-teal-600 text-white hidden sm:flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" /> Active
            </Badge>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ViewRenderer tab={tab} navigate={navigate} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// =====================================================================
// View renderer
// =====================================================================
function ViewRenderer({ tab, navigate }: { tab: ViewTab; navigate: (t: ViewTab) => void }) {
  switch (tab) {
    case "dashboard": return <IvfDashboard />;
    case "cycles": return <IvfCycles />;
    case "couples": return <IvfAssessments />;
    case "protocols": return <IvfProtocols />;
    case "stimulation": return <IvfFollicular />;
    case "follicular": return <IvfFollicular />;
    case "opu": return <IvfOPU />;
    case "andrology": return <IvfAndrology />;
    case "embryology": return <IvfEmbryology />;
    case "cryobank": return <IvfCryobank />;
    case "transfer": return <IvfTransfer />;
    case "pregnancy": return <IvfPregnancy />;
    case "donors": return <IvfDonors />;
    case "consents": return <IvfConsents />;
    case "packages": return <IvfPackagesView />;
    case "reports": return <IvfReports />;
    default: return <IvfDashboard />;
  }
}

// =====================================================================
// Module placeholder
// =====================================================================
function ModulePlaceholder({
  item, navigate,
}: {
  item: NavItem;
  navigate: (t: ViewTab) => void;
}) {
  const Icon = item.icon;
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold leading-tight">{item.label}</h2>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="py-16 px-6 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-teal-500/10 rounded-2xl blur-xl" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 flex items-center justify-center">
              <Icon className="w-10 h-10 text-teal-500 dark:text-teal-400" />
            </div>
          </div>
          <Badge className="mb-3 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 gap-1">
            <Lock className="w-3 h-3" /> Coming soon
          </Badge>
          <h3 className="text-base font-semibold text-foreground mb-1">{item.label}</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-5">
            This sub-module of the IVF &amp; Fertility Add-on is being wired up.
            The Dashboard and IVF Cycles views are fully operational today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => navigate("dashboard")}>
              <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("cycles")}>
              <FlaskConical className="w-4 h-4" /> Open IVF Cycles
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// Sidebar brand
// =====================================================================
function SidebarBrand({ collapsed, compact }: { collapsed: boolean; compact?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20",
      compact ? "p-0" : "h-16 px-4",
    )}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden"
          >
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={130} height={40} className="shrink-0" />
          </motion.div>
        ) : (
          <Image src="/images/carelim-os.png" alt="Carelim OS" width={32} height={32} className="shrink-0 rounded-lg" />
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================================
// Sidebar nav
// =====================================================================
function SidebarNav({
  collapsed, activeTab, navigate,
}: {
  collapsed: boolean;
  activeTab: ViewTab;
  navigate: (tab: ViewTab) => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
              >
                {group.label}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                activeTab={activeTab}
                navigate={navigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({
  item, collapsed, activeTab, navigate,
}: {
  item: NavItem;
  collapsed: boolean;
  activeTab: ViewTab;
  navigate: (tab: ViewTab) => void;
}) {
  const Icon = item.icon;
  const isActive = item.tab === activeTab;
  return (
    <button
      onClick={() => navigate(item.tab)}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
          : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30",
        collapsed && "justify-center",
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            className="flex-1 text-left truncate flex items-center gap-1.5"
          >
            {item.label}
            {!item.available && (
              <Lock className="w-2.5 h-2.5 text-muted-foreground/60 inline" />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className={cn(
        "rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5",
        collapsed && "flex justify-center",
      )}>
        {collapsed ? (
          <HeartPulse className="w-4 h-4 text-teal-600" />
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              <HeartPulse className="w-3 h-3" /> IVF Module
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Add-on enabled</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Operational</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Header
// =====================================================================
function IvfHeader({
  tab, toggleSidebar, openMobile, search, setSearch, searchResults, navigate, logout, user,
}: {
  tab: ViewTab;
  toggleSidebar: () => void;
  openMobile: () => void;
  search: string;
  setSearch: (s: string) => void;
  searchResults: NavItem[];
  navigate: (t: ViewTab) => void;
  logout: () => void;
  user: { id: number; name: string; email: string; role: string; branchId?: number; permissions?: string[] } | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={openMobile}>
        <Menu className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden md:flex shrink-0" onClick={toggleSidebar}>
        <ChevronLeft className="w-[18px] h-[18px]" />
      </Button>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex flex-col leading-tight">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Carelim OS</span>
            <ChevronRight className="w-3 h-3" />
            <span>IVF Module</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{VIEW_LABELS[tab]}</span>
          </div>
          <p className="text-base font-semibold text-foreground">{VIEW_LABELS[tab]}</p>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => window.location.href = "/"}>
        <LayoutGrid className="w-3 h-3" /> CMS
      </Button>

      {/* Search */}
      <div className="relative ml-auto w-9 sm:w-48 md:w-56 lg:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IVF module…"
          className="pl-9 h-9 text-sm"
        />
        {search && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-elevated overflow-hidden z-50">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => navigate(r.tab)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <r.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                </div>
                {!r.available && <Lock className="w-3 h-3 text-muted-foreground" />}
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick action */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 hidden sm:flex">
            <Plus className="w-4 h-4" /> Quick Action
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase">IVF Quick Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("cycles")}>
            <FlaskConical className="w-4 h-4" /> New IVF Cycle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("donors")}>
            <HeartPulse className="w-4 h-4" /> Register Donor
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("consents")}>
            <FileText className="w-4 h-4" /> New Consent Form
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("cryobank")}>
            <Snowflake className="w-4 h-4" /> Cryobank Entry
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("reports")}>
            <BarChart3 className="w-4 h-4" /> View Reports
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="text-sm font-semibold">IVF Notifications</p>
            <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{NOTIFICATIONS.length} new</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="flex gap-2.5 p-3 border-b last:border-0 hover:bg-accent/50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  n.type === "info" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-600" :
                  n.type === "warn" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600" :
                  n.type === "error" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600" :
                  "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600",
                )}>
                  <CircleDot className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.time} ago</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => toast.info("Marked all as read")}>
              Mark all as read
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 pl-1 hover:bg-accent transition-colors">
            <Avatar className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600">
              <AvatarFallback className="bg-transparent text-white text-xs font-semibold">{user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "IVF"}</AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col leading-tight pr-1">
              <span className="text-xs font-semibold">{user?.name || "IVF Coordinator"}</span>
              <span className="text-[10px] text-muted-foreground">{user?.email || "ivf@carelim.com"}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user?.name || "IVF Coordinator"}</span>
              <span className="text-[11px] text-muted-foreground">{user?.email || "ivf@carelim.com"}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("settings")}>
            <UserCircle className="w-4 h-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("settings")}>
            <SettingsIcon className="w-4 h-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("consents")}>
            <Lock className="w-4 h-4" /> Consents
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={logout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// =====================================================================
// Login wall
// =====================================================================
function IvfLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("ivf@carelim.com");
  const [password, setPassword] = useState("carelim123");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter credentials");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        toast.error(result.error || "Invalid credentials");
        return;
      }
      localStorage.setItem("ivf-user", JSON.stringify(result));
      toast.success("Welcome to IVF Module", { description: "IVF & Fertility Add-on signed in" });
      onLogin();
    } catch {
      toast.error("Login failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-pink-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={140} height={43} className="rounded-lg" />
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-4 bg-white/15 text-white border-white/20 gap-1.5">
                <Sparkles className="w-3 h-3" /> Add-on Module
              </Badge>
              <h1 className="text-4xl font-bold leading-tight text-balance">
                IVF &amp; Fertility management, end-to-end.
              </h1>
              <p className="mt-4 text-teal-100/90 text-lg max-w-md">
                Plan cycles, track stimulation, manage the embryology lab, run the cryobank and follow pregnancies — all inside Carelim OS.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {[
                { icon: FlaskConical, title: "Cycle Tracking", desc: "Plan → Stim → OPU → Transfer → Pregnancy" },
                { icon: Microscope, title: "Follicular Monitoring", desc: "Daily ultrasounds & hormone trends" },
                { icon: TestTube2, title: "Embryology Lab", desc: "Embryo grading, ICSI & culture logs" },
                { icon: Snowflake, title: "Cryobank", desc: "Frozen embryos, oocytes & sperm" },
                { icon: Baby, title: "Pregnancy Tracking", desc: "β-hCG, ultrasound & EDD follow-ups" },
                { icon: HeartPulse, title: "Donor Registry", desc: "Egg, sperm & embryo donors" },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                  className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3.5"
                >
                  <f.icon className="w-5 h-5 mb-1.5 text-emerald-200" />
                  <p className="text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-[11px] text-teal-100/70 mt-0.5 leading-snug">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-teal-100/80">
            <span>16 Sub-modules</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>ART Compliant</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>HIPAA Ready</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>Add-on Enabled</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={120} height={37} />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 px-3 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 mb-4">
            <ShieldCheck className="w-3 h-3" /> IVF Module Access
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in to IVF Module</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome to the IVF &amp; Fertility Add-on. Manage cycles, embryos & pregnancies.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ivf-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="ivf-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="ivf@carelim.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ivf-password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-teal-600 hover:underline"
                  onClick={() => toast.info("Reset link sent to your email")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="ivf-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-input accent-teal-600" />
                Remember this device
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {loading ? "Signing in…" : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>

            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground text-center">
              <span className="font-medium text-foreground">Demo credentials</span> — ivf@carelim.com / carelim123
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by enterprise-grade encryption. By signing in you agree to our{" "}
            <span className="text-teal-600 hover:underline cursor-pointer">Terms</span> &amp;{" "}
            <span className="text-teal-600 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
