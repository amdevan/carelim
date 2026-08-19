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
import { DentalDashboard } from "@/components/dental/dashboard";
import { DentalOdontogram } from "@/components/dental/odontogram";
import {
  DentalExaminations, DentalTreatmentPlans, DentalProcedures,
  DentalImaging, DentalLab, DentalOrtho, DentalImplants,
  DentalFollowups, DentalReports, DentalSettings, DentalPatients,
} from "@/components/dental/modules";
import { toast } from "sonner";
import {
  Smile, LayoutDashboard, Users, Activity, Stethoscope, ClipboardList,
  Wrench, FileImage, GitBranch, BellRing, BarChart3, Settings as SettingsIcon,
  ChevronDown, ChevronRight, Search, Bell, Menu, X, LogOut,
  UserCircle, Plus, Zap, ChevronLeft, Mail, Eye, EyeOff, ArrowRight,
  ShieldCheck, Sparkles, CircleDot, CalendarClock, Heart, LayoutGrid,
} from "lucide-react";

// =====================================================================
// Navigation
// =====================================================================
type ViewTab =
  | "dashboard" | "patients" | "odontogram" | "examination" | "treatment"
  | "procedures" | "imaging" | "lab" | "followup" | "reports" | "settings"
  | "ortho" | "implant";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: ViewTab;
  description: string;
}

interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, tab: "dashboard", description: "Dental KPIs, trends & schedule" },
      { label: "Dental Patients", icon: Users, tab: "patients", description: "Patient roster with dental history" },
    ],
  },
  {
    label: "Clinical",
    items: [
      { label: "Odontogram", icon: Smile, tab: "odontogram", description: "Interactive FDI tooth chart" },
      { label: "Clinical Examination", icon: Stethoscope, tab: "examination", description: "Chief complaint, intra-oral, periodontal" },
      { label: "Treatment Plan", icon: ClipboardList, tab: "treatment", description: "Plan, cost estimate & consent" },
      { label: "Procedures", icon: Activity, tab: "procedures", description: "Procedure records with auto-invoice" },
    ],
  },
  {
    label: "Imaging & Lab",
    items: [
      { label: "Dental Imaging", icon: FileImage, tab: "imaging", description: "IOPA, OPG, CBCT, clinical photos" },
      { label: "Dental Laboratory", icon: GitBranch, tab: "lab", description: "Crowns, bridges, dentures tracking" },
    ],
  },
  {
    label: "Specialty",
    items: [
      { label: "Orthodontics", icon: Zap, tab: "ortho", description: "Brackets, aligners, wire changes" },
      { label: "Implant Module", icon: Wrench, tab: "implant", description: "Brand, size, graft, abutment, crown" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Follow-up", icon: BellRing, tab: "followup", description: "Recall visits & reminders" },
      { label: "Reports", icon: BarChart3, tab: "reports", description: "Revenue, procedures, doctor-wise" },
      { label: "Settings", icon: SettingsIcon, tab: "settings", description: "Module configuration" },
    ],
  },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  dashboard: "Dashboard",
  patients: "Dental Patients",
  odontogram: "Odontogram",
  examination: "Clinical Examination",
  treatment: "Treatment Plan",
  procedures: "Procedures",
  imaging: "Dental Imaging",
  lab: "Dental Laboratory",
  ortho: "Orthodontics",
  implant: "Implant Module",
  followup: "Follow-up",
  reports: "Reports",
  settings: "Settings",
};

const NOTIFICATIONS = [
  { title: "Lab order ready", desc: "DLO-00012 — Zirconia crown ready for try-in", time: "20m", type: "info" },
  { title: "Follow-up tomorrow", desc: "DFU-00018 — Implant check for patient PT-00007", time: "3h", type: "warn" },
  { title: "Procedure completed", desc: "DPR-00031 — Root canal on tooth 36 completed", time: "5h", type: "success" },
  { title: "Consent pending", desc: "Treatment plan DTP-00042 awaiting patient consent", time: "1d", type: "warn" },
  { title: "Ortho wire change due", desc: "Case ORT-00004 — schedule next wire change", time: "2d", type: "info" },
];

// =====================================================================
// Page
// =====================================================================
export default function DentalPage() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string; branchId?: number; permissions?: string[] } | null>(null);
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allNavItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dental-user");
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
    localStorage.removeItem("dental-user");
    setUser(null);
    setAuthed(false);
    toast.success("Signed out of Dental Module");
  };

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allNavItems.filter((i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allNavItems]);

  const navigate = (newTab: ViewTab) => {
    setTab(newTab);
    setMobileSidebarOpen(false);
    setSearch("");
  };

  if (!authed) return <DentalLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-pink-500" />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
      >
        <SidebarBrand collapsed={sidebarCollapsed} />
        <SidebarNav collapsed={sidebarCollapsed} activeTab={tab} navigate={navigate} />
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
        <DentalHeader
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
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Dental Module — Add-on Enabled</p>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-300/70 hidden sm:block">Odontogram, examinations, treatment plans, procedures, lab, orthodontics, implants &amp; follow-ups.</p>
            </div>
            <Badge className="text-[9px] bg-teal-600 text-white hidden sm:flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" /> Active
            </Badge>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
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
function ViewRenderer({ tab }: { tab: ViewTab; navigate: (t: ViewTab) => void }) {
  switch (tab) {
    case "dashboard": return <DentalDashboard />;
    case "patients": return <DentalPatients />;
    case "odontogram": return <DentalOdontogram />;
    case "examination": return <DentalExaminations />;
    case "treatment": return <DentalTreatmentPlans />;
    case "procedures": return <DentalProcedures />;
    case "imaging": return <DentalImaging />;
    case "lab": return <DentalLab />;
    case "ortho": return <DentalOrtho />;
    case "implant": return <DentalImplants />;
    case "followup": return <DentalFollowups />;
    case "reports": return <DentalReports />;
    case "settings": return <DentalSettings />;
    default: return <DentalDashboard />;
  }
}

// =====================================================================
// Sidebar brand
// =====================================================================
function SidebarBrand({ collapsed, compact }: { collapsed: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20", compact ? "p-0" : "h-16 px-4")}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">Carelim Dental</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Add-on Module</p>
            </div>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 mx-auto">
            <Smile className="w-5 h-5 text-white" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================================
// Sidebar nav
// =====================================================================
function SidebarNav({ collapsed, activeTab, navigate }: { collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <AnimatePresence>
            {!collapsed && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</motion.p>
            )}
          </AnimatePresence>
          <div className="space-y-0.5">
            {group.items.map((item) => <SidebarItem key={item.label} item={item} collapsed={collapsed} activeTab={activeTab} navigate={navigate} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({ item, collapsed, activeTab, navigate }: { item: NavItem; collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  const Icon = item.icon;
  const isActive = item.tab === activeTab;
  return (
    <button
      onClick={() => navigate(item.tab)}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
        isActive ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20" : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30",
        collapsed && "justify-center",
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <AnimatePresence>
        {!collapsed && (
          <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }} className="flex-1 text-left truncate">{item.label}</motion.span>
        )}
      </AnimatePresence>
      {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">{item.label}</span>
      )}
    </button>
  );
}

// =====================================================================
// Sidebar footer
// =====================================================================
function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
      {!collapsed ? (
        <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-200">Dental Module</span>
          </div>
          <p className="text-[9px] text-teal-700/70 dark:text-teal-300/70">Add-on enabled · Operational</p>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">All systems operational</span>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 mx-auto rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Header
// =====================================================================
function DentalHeader({
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
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 sm:px-5 lg:px-6 h-16">
        <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" onClick={toggleSidebar}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={openMobile}>
          <Menu className="w-4 h-4" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground hidden sm:inline">Carelim OS</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
          <span className="text-muted-foreground">Dental</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{VIEW_LABELS[tab]}</span>
        </div>

        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => window.location.href = "/"}>
          <LayoutGrid className="w-3 h-3" /> CMS
        </Button>

        {/* Search */}
        <div className="flex-1 max-w-md mx-auto relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dental modules…"
            className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background"
          />
          {search && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-elevated overflow-hidden z-30">
              {searchResults.map((r) => (
                <button key={r.tab} onClick={() => navigate(r.tab)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left">
                  <r.icon className="w-4 h-4 text-teal-500" />
                  <div>
                    <p className="text-xs font-medium">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Quick action */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 hidden sm:flex">
                <Plus className="w-4 h-4" /> Quick Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Dental Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("examination")}><Stethoscope className="w-4 h-4 mr-2" /> New Examination</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("treatment")}><ClipboardList className="w-4 h-4 mr-2" /> New Treatment Plan</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("procedures")}><Activity className="w-4 h-4 mr-2" /> Log Procedure</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("lab")}><GitBranch className="w-4 h-4 mr-2" /> Place Lab Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("followup")}><BellRing className="w-4 h-4 mr-2" /> Schedule Follow-up</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("reports")}><BarChart3 className="w-4 h-4 mr-2" /> View Reports</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <Badge variant="outline" className="text-[9px]">{NOTIFICATIONS.length} new</Badge>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} className={cn("px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent/50 transition-colors", n.type === "success" && "bg-emerald-50/50 dark:bg-emerald-950/20", n.type === "warn" && "bg-amber-50/50 dark:bg-amber-950/20", n.type === "error" && "bg-rose-50/50 dark:bg-rose-950/20")}>
                    <div className="flex items-start gap-2.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", n.type === "success" ? "bg-emerald-100 dark:bg-emerald-950/60" : n.type === "warn" ? "bg-amber-100 dark:bg-amber-950/60" : n.type === "error" ? "bg-rose-100 dark:bg-rose-950/60" : "bg-teal-100 dark:bg-teal-950/60")}>
                        <CircleDot className={cn("w-3.5 h-3.5", n.type === "success" ? "text-emerald-600" : n.type === "warn" ? "text-amber-600" : n.type === "error" ? "text-rose-600" : "text-teal-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{n.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{n.desc}</p>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5">{n.time} ago</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-1.5 gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[11px] font-semibold">{user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "DS"}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium hidden sm:inline">{user?.name || "Dental Surgeon"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-semibold">{user?.name || "Dental Surgeon"}</p>
                  <p className="text-[10px] text-muted-foreground font-normal">{user?.email || "dental@carelim.health"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><UserCircle className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("settings")}><SettingsIcon className="w-4 h-4 mr-2" /> Dental Settings</DropdownMenuItem>
              <DropdownMenuItem><CalendarClock className="w-4 h-4 mr-2" /> My Schedule</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// =====================================================================
// Login
// =====================================================================
function DentalLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("dental@carelim.health");
  const [password, setPassword] = useState("carelim123");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
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
        toast.error(result.error || "Login failed");
        return;
      }
      localStorage.setItem("dental-user", JSON.stringify(result));
      toast.success("Welcome to Dental Module");
      onLogin();
    } catch {
      toast.error("Login failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Smile, title: "Interactive Odontogram", desc: "FDI / Universal tooth chart with color-coded conditions" },
    { icon: Stethoscope, title: "Clinical Examination", desc: "Comprehensive intra-oral, periodontal & TMJ assessment" },
    { icon: ClipboardList, title: "Treatment Planning", desc: "Plan, cost estimate, consent & doctor assignment" },
    { icon: Activity, title: "Procedure Management", desc: "Auto-invoicing via Billing + EMR timeline append" },
    { icon: GitBranch, title: "Dental Laboratory", desc: "Crowns, bridges, dentures & aligner tracking" },
    { icon: Wrench, title: "Implant & Orthodontics", desc: "Brand, size, bone graft, wire sequence, progress" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-[52%] bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-800 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Smile className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold">Carelim OS · Dental</p>
            <p className="text-xs text-white/70">Enterprise Dental Add-on Module</p>
          </div>
        </div>
        <div className="relative mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-3">Complete dental practice, beautifully charted.</h1>
          <p className="text-white/80 text-sm max-w-md">From the first intra-oral exam to the final crown cementation — Carelim Dental adds a full clinical workflow on top of your existing Carelim OS HMS.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 mb-auto">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <f.icon className="w-5 h-5 mb-2" />
              <p className="text-sm font-semibold mb-0.5">{f.title}</p>
              <p className="text-[10px] text-white/70 leading-snug">{f.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="relative flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
          <div><p className="text-2xl font-bold">15+</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Dental Views</p></div>
          <div><p className="text-2xl font-bold">32</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Tooth Chart</p></div>
          <div><p className="text-2xl font-bold">HIPAA</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Compliant</p></div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Smile className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold">Carelim OS · Dental</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Add-on Module</p>
            </div>
          </div>
          <Badge variant="outline" className="mb-4 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1.5">
            <Heart className="w-3 h-3" /> Dental Add-on
          </Badge>
          <h2 className="text-2xl font-bold mb-1">Sign in to Dental</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your dental clinic credentials to continue.</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-10" placeholder="dental@carelim.health" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 h-10" placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border" defaultChecked /> Remember this device
              </label>
              <button className="text-xs text-teal-600 hover:underline">Forgot password?</button>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-10 gap-2" onClick={submit} disabled={loading}>
              {loading ? "Signing in…" : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
          <div className="mt-6 p-3 rounded-lg bg-muted/40 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Demo credentials</p>
            <p className="text-xs font-mono">dental@carelim.health · carelim123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
