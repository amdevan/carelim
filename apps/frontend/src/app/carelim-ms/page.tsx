"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CMSDashboard } from "@/components/carelim-ms/dashboard";
import {
  CMSPatients, CMSAppointments, CMSLeads, CMSClinics, CMSDoctors,
  CMSReferrals, CMSCommission, CMSCoordinators, CMSReports, CMSSettings,
} from "@/components/carelim-ms/modules";
import {
  CRMContacts, CRMDeals, CRMCommunications, CRMTasks, CRTemplates,
} from "@/components/carelim-ms/crm";
import { toast } from "sonner";
import {
  Network, LayoutDashboard, Users, CalendarClock, Megaphone, Building2,
  Stethoscope, GitBranch, Percent, UserCheck, BarChart3,
  Settings as SettingsIcon, ChevronDown, ChevronRight, Search, Bell,
  Menu, X, LogOut, UserCircle, Plus, ChevronLeft, Mail, Eye, EyeOff,
  ArrowRight, ShieldCheck, Sparkles, CircleDot, Heart, LayoutGrid,
  Contact, Handshake, MessageSquare, ListTodo, FileText,
} from "lucide-react";

type ViewTab =
  | "dashboard" | "patients" | "appointments" | "leads" | "clinics"
  | "doctors" | "referrals" | "commission" | "coordinators" | "reports" | "settings"
  | "crm_contacts" | "crm_deals" | "crm_comms" | "crm_tasks" | "crm_templates";

interface NavItem { label: string; icon: React.ComponentType<{ className?: string }>; tab: ViewTab; description: string; }
interface NavGroup { label: string; items: NavItem[]; }

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [
    { label: "Dashboard", icon: LayoutDashboard, tab: "dashboard", description: "KPIs, trends & cross-clinic analytics" },
    { label: "Patients", icon: Users, tab: "patients", description: "Carelim vs Clinic patient attribution" },
    { label: "Appointments", icon: CalendarClock, tab: "appointments", description: "Booking source & commission tracking" },
  ]},
  { label: "Marketing", items: [
    { label: "Leads", icon: Megaphone, tab: "leads", description: "Lead management & conversion" },
    { label: "Partner Clinics", icon: Building2, tab: "clinics", description: "Multi-tenant clinic management" },
    { label: "Doctors", icon: Stethoscope, tab: "doctors", description: "Doctor directory across clinics" },
  ]},
  { label: "CRM", items: [
    { label: "Contacts", icon: Contact, tab: "crm_contacts", description: "Unified contact directory & management" },
    { label: "Deals Pipeline", icon: Handshake, tab: "crm_deals", description: "Deal tracking & pipeline management" },
    { label: "Communications", icon: MessageSquare, tab: "crm_comms", description: "Call, email, WhatsApp & SMS log" },
    { label: "Tasks", icon: ListTodo, tab: "crm_tasks", description: "Follow-up tasks & activity tracking" },
    { label: "Templates", icon: FileText, tab: "crm_templates", description: "Email & message templates" },
  ]},
  { label: "Finance", items: [
    { label: "Referral Tracking", icon: GitBranch, tab: "referrals", description: "Referral sources & commission engine" },
    { label: "Commission", icon: Percent, tab: "commission", description: "Commission settlements & reports" },
  ]},
  { label: "Care", items: [
    { label: "Care Coordinators", icon: UserCheck, tab: "coordinators", description: "Patient follow-up & coordination" },
  ]},
  { label: "Administration", items: [
    { label: "Reports", icon: BarChart3, tab: "reports", description: "Revenue, commission & campaign analytics" },
    { label: "Settings", icon: SettingsIcon, tab: "settings", description: "Module configuration & permissions" },
  ]},
];

const VIEW_LABELS: Record<ViewTab, string> = {
  dashboard: "Dashboard", patients: "Patients", appointments: "Appointments",
  leads: "Leads", clinics: "Partner Clinics", doctors: "Doctors",
  referrals: "Referral Tracking", commission: "Commission",
  coordinators: "Care Coordinators", reports: "Reports", settings: "Settings",
  crm_contacts: "Contacts", crm_deals: "Deals Pipeline", crm_comms: "Communications",
  crm_tasks: "Tasks", crm_templates: "Templates",
};

const NOTIFICATIONS = [
  { title: "New CRM contact", desc: "CON-00042 added via Website inquiry", time: "5m", type: "success" },
  { title: "Deal won", desc: "DEAL-00012 — Rs. 45,000 IVF package closed", time: "15m", type: "success" },
  { title: "Commission earned", desc: "REF-00015 — Rs. 1,200 commission generated", time: "20m", type: "info" },
  { title: "Lead converted", desc: "LEAD-00018 → appointment booked (IVF)", time: "1h", type: "success" },
  { title: "Task overdue", desc: "2 follow-up tasks are past due date", time: "2h", type: "warn" },
  { title: "Follow-up due", desc: "3 patients due for follow-up in next 3 days", time: "3h", type: "warn" },
  { title: "Campaign alert", desc: "Summer Health Checkup 2025 — 70% budget utilized", time: "5h", type: "warn" },
];

export default function CarelimMSPage() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string; branchId?: number; permissions?: string[] } | null>(null);
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const allNavItems = useMemo(() => NAV_GROUPS.flatMap(g => g.items), []);
  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allNavItems.filter(i => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allNavItems]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cms-ms-user");
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
    localStorage.removeItem("cms-ms-user");
    setUser(null);
    setAuthed(false);
    toast.success("Signed out of Carelim MS");
  };

  const navigate = (newTab: ViewTab) => { setTab(newTab); setMobileSidebarOpen(false); setSearch(""); };
  if (!authed) return <CMSLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />

      {/* Desktop Sidebar */}
      <motion.aside animate={{ width: sidebarCollapsed ? 76 : 264 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30">
        <SidebarBrand collapsed={sidebarCollapsed} />
        <SidebarNav collapsed={sidebarCollapsed} activeTab={tab} navigate={navigate} />
        <SidebarFooter collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border"><SidebarBrand collapsed={false} compact /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileSidebarOpen(false)}><X className="w-4 h-4" /></Button></div>
              <SidebarNav collapsed={false} activeTab={tab} navigate={navigate} />
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <CMSHeader tab={tab} toggleSidebar={() => setSidebarCollapsed(v => !v)} openMobile={() => setMobileSidebarOpen(true)} search={search} setSearch={setSearch} searchResults={searchResults} navigate={navigate} logout={logout} user={user} />

        {/* Add-on banner */}
        <div className="px-4 sm:px-5 lg:px-6 pt-4">
          <div className="rounded-xl border border-teal-200 dark:border-teal-900/50 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0"><Network className="w-4 h-4 text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Carelim MS — CRM, Source &amp; Commission Module</p>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-300/70 hidden sm:block">Contact management · deal pipeline · communications · referral tracking · commission engine · care coordination.</p>
            </div>
            <Badge className="text-[9px] bg-teal-600 text-white hidden sm:flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" /> Active</Badge>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ViewRenderer tab={tab} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ViewRenderer({ tab }: { tab: ViewTab }) {
  switch (tab) {
    case "dashboard": return <CMSDashboard />;
    case "patients": return <CMSPatients />;
    case "appointments": return <CMSAppointments />;
    case "leads": return <CMSLeads />;
    case "clinics": return <CMSClinics />;
    case "doctors": return <CMSDoctors />;
    case "referrals": return <CMSReferrals />;
    case "commission": return <CMSCommission />;
    case "coordinators": return <CMSCoordinators />;
    case "crm_contacts": return <CRMContacts />;
    case "crm_deals": return <CRMDeals />;
    case "crm_comms": return <CRMCommunications />;
    case "crm_tasks": return <CRMTasks />;
    case "crm_templates": return <CRTemplates />;
    case "reports": return <CMSReports />;
    case "settings": return <CMSSettings />;
    default: return <CMSDashboard />;
  }
}

function SidebarBrand({ collapsed, compact }: { collapsed: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20", compact ? "p-0" : "h-16 px-4")}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0"><Network className="w-5 h-5 text-white" /></div>
            <div className="leading-tight"><p className="text-sm font-bold text-foreground">Carelim MS</p><p className="text-[9px] text-muted-foreground uppercase tracking-wider">Source &amp; Commission</p></div>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 mx-auto"><Network className="w-5 h-5 text-white" /></div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarNav({ collapsed, activeTab, navigate }: { collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-3">
          <AnimatePresence>{!collapsed && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</motion.p>}</AnimatePresence>
          <div className="space-y-0.5">{group.items.map(item => <SidebarItem key={item.label} item={item} collapsed={collapsed} activeTab={activeTab} navigate={navigate} />)}</div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({ item, collapsed, activeTab, navigate }: { item: NavItem; collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  const Icon = item.icon;
  const isActive = item.tab === activeTab;
  return (
    <button onClick={() => navigate(item.tab)} title={collapsed ? item.label : undefined} className={cn("group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200", isActive ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20" : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30", collapsed && "justify-center")}>
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <AnimatePresence>{!collapsed && <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }} className="flex-1 text-left truncate">{item.label}</motion.span>}</AnimatePresence>
      {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
      {collapsed && <span className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">{item.label}</span>}
    </button>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
      {!collapsed ? (
        <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5">
          <div className="flex items-center gap-2 mb-1"><div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5 text-white" /></div><span className="text-[11px] font-semibold text-teal-800 dark:text-teal-200">Carelim MS</span></div>
          <p className="text-[9px] text-teal-700/70 dark:text-teal-300/70">Add-on enabled · Multi-tenant</p>
          <div className="mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">All systems operational</span></div>
        </div>
      ) : (
        <div className="w-8 h-8 mx-auto rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-white" /></div>
      )}
    </div>
  );
}

function CMSHeader({ tab, toggleSidebar, openMobile, search, setSearch, searchResults, navigate, logout, user }: {
  tab: ViewTab; toggleSidebar: () => void; openMobile: () => void;
  search: string; setSearch: (s: string) => void; searchResults: NavItem[]; navigate: (t: ViewTab) => void; logout: () => void;
  user: { id: number; name: string; email: string; role: string; branchId?: number; permissions?: string[] } | null;
}) {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 sm:px-5 lg:px-6 h-16">
        <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" onClick={toggleSidebar}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={openMobile}><Menu className="w-4 h-4" /></Button>
        <div className="flex items-center gap-1.5 text-sm"><span className="text-muted-foreground hidden sm:inline">Carelim OS</span><ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" /><span className="text-muted-foreground">Carelim MS</span><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-semibold">{VIEW_LABELS[tab]}</span></div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => window.location.href = "/"}>
          <LayoutGrid className="w-3 h-3" /> CMS
        </Button>
        <div className="flex-1 max-w-md mx-auto relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Carelim MS modules…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
          {search && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-elevated overflow-hidden z-30">
              {searchResults.map(r => (<button key={r.tab} onClick={() => navigate(r.tab)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors text-left"><r.icon className="w-4 h-4 text-teal-500" /><div><p className="text-xs font-medium">{r.label}</p><p className="text-[10px] text-muted-foreground">{r.description}</p></div></button>))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 hidden sm:flex"><Plus className="w-4 h-4" /> Quick Action</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Carelim MS Actions</DropdownMenuLabel><DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("patients")}><Users className="w-4 h-4 mr-2" /> View Patients</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("leads")}><Megaphone className="w-4 h-4 mr-2" /> New Lead</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("crm_contacts")}><Contact className="w-4 h-4 mr-2" /> CRM Contacts</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("crm_deals")}><Handshake className="w-4 h-4 mr-2" /> New Deal</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("crm_tasks")}><ListTodo className="w-4 h-4 mr-2" /> CRM Tasks</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("referrals")}><GitBranch className="w-4 h-4 mr-2" /> View Referrals</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("coordinators")}><UserCheck className="w-4 h-4 mr-2" /> Assign Coordinator</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("reports")}><BarChart3 className="w-4 h-4 mr-2" /> View Reports</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between"><span className="text-sm font-semibold">Notifications</span><Badge variant="outline" className="text-[9px]">{NOTIFICATIONS.length} new</Badge></div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} className={cn("px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent/50 transition-colors", n.type === "success" && "bg-emerald-50/50 dark:bg-emerald-950/20", n.type === "warn" && "bg-amber-50/50 dark:bg-amber-950/20")}>
                    <div className="flex items-start gap-2.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", n.type === "success" ? "bg-emerald-100 dark:bg-emerald-950/60" : n.type === "warn" ? "bg-amber-100 dark:bg-amber-950/60" : "bg-teal-100 dark:bg-teal-950/60")}><CircleDot className={cn("w-3.5 h-3.5", n.type === "success" ? "text-emerald-600" : n.type === "warn" ? "text-amber-600" : "text-teal-600")} /></div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold">{n.title}</p><p className="text-[10px] text-muted-foreground line-clamp-2">{n.desc}</p><p className="text-[9px] text-muted-foreground/70 mt-0.5">{n.time} ago</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-9 px-1.5 gap-2"><Avatar className="w-7 h-7"><AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[11px] font-semibold">{user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "CA"}</AvatarFallback></Avatar><span className="text-xs font-medium hidden sm:inline">{user?.name || "Carelim Admin"}</span><ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel><div><p className="text-sm font-semibold">{user?.name || "Carelim Admin"}</p><p className="text-[10px] text-muted-foreground font-normal">{user?.email || "carelim-admin@carelim.health"}</p></div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><UserCircle className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("settings")}><SettingsIcon className="w-4 h-4 mr-2" /> MS Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function CMSLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("carelim-admin@carelim.health");
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
      localStorage.setItem("cms-ms-user", JSON.stringify(result));
      toast.success("Welcome to Carelim MS");
      onLogin();
    } catch {
      toast.error("Login failed — please try again");
    } finally {
      setLoading(false);
    }
  };
  const features = [
    { icon: Users, title: "Patient Attribution", desc: "Distinguish Carelim vs Clinic patients with tracking IDs" },
    { icon: GitBranch, title: "Referral Tracking", desc: "Track every referral source & campaign attribution" },
    { icon: Percent, title: "Commission Engine", desc: "Auto-calculate & settle commissions on billing" },
    { icon: Megaphone, title: "Lead Management", desc: "Capture & convert marketing leads from all channels" },
    { icon: UserCheck, title: "Care Coordinators", desc: "Assign coordinators & track patient follow-ups" },
    { icon: Network, title: "Multi-Tenant", desc: "Clinic isolation with cross-clinic super admin view" },
  ];
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-[52%] bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><Network className="w-7 h-7 text-white" /></div>
          <div><p className="text-lg font-bold">Carelim MS</p><p className="text-xs text-white/70">Patient Source &amp; Commission Module</p></div>
        </div>
        <div className="relative mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-3">Know exactly where every patient comes from.</h1>
          <p className="text-white/80 text-sm max-w-md">Carelim MS sits on top of your existing HMS — distinguishing Carelim-acquired patients from direct clinic walk-ins, tracking referrals, calculating commissions, and orchestrating care coordinators across all partner clinics.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 mb-auto">
          {features.map((f, i) => (<motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10"><f.icon className="w-5 h-5 mb-2" /><p className="text-sm font-semibold mb-0.5">{f.title}</p><p className="text-[10px] text-white/70 leading-snug">{f.desc}</p></motion.div>))}
        </div>
        <div className="relative flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
          <div><p className="text-2xl font-bold">Multi</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Tenant</p></div>
          <div><p className="text-2xl font-bold">9</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Roles</p></div>
          <div><p className="text-2xl font-bold">HIPAA</p><p className="text-[10px] text-white/70 uppercase tracking-wide">Compliant</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><Network className="w-6 h-6 text-white" /></div>
            <div><p className="font-bold">Carelim MS</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Source &amp; Commission</p></div>
          </div>
          <Badge variant="outline" className="mb-4 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1.5"><Heart className="w-3 h-3" /> Carelim MS Add-on</Badge>
          <h2 className="text-2xl font-bold mb-1">Sign in to Carelim MS</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your Carelim MS admin credentials to continue.</p>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email" className="text-xs font-medium">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-10" /></div></div>
            <div className="space-y-1.5"><Label htmlFor="password" className="text-xs font-medium">Password</Label><div className="relative"><Input id="password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-9 h-10" onKeyDown={e => e.key === "Enter" && submit()} /><button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <div className="flex items-center justify-between"><label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"><input type="checkbox" className="rounded border-border" defaultChecked /> Remember this device</label><button className="text-xs text-teal-600 hover:underline">Forgot password?</button></div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white h-10 gap-2" onClick={submit} disabled={loading}>{loading ? "Signing in…" : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}</Button>
          </div>
          <div className="mt-6 p-3 rounded-lg bg-muted/40 border border-border text-center"><p className="text-[10px] text-muted-foreground mb-1">Demo credentials</p><p className="text-xs font-mono">carelim-admin@carelim.health · carelim123</p></div>
        </div>
      </div>
    </div>
  );
}
