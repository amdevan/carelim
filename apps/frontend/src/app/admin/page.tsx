"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { SaasLogin, AdminUser } from "@/components/saas/login";
import { SaasDashboard } from "@/components/saas/dashboard";
import { fetchAPI } from "@/lib/api";
import { SaasTenants, SaasTenantProfile } from "@/components/saas/tenants";
import {
  SaasSubscriptions, SaasBilling, SaasModules, SaasAddOns, SaasSupport,
  SaasCRM, SaasAnalytics, SaasSecurity, SaasIntegrations, SaasUsers, SaasSettings,
} from "@/components/saas/modules";
import { toast } from "sonner";
import {
  LayoutDashboard, Building2, CreditCard, Receipt, Users,
  Boxes, Puzzle, BarChart3, Headphones, Megaphone, Plug, ShieldCheck,
  Settings as SettingsIcon, ChevronDown, ChevronRight, Search, Bell,
  Menu, X, LogOut, UserCircle, Plus, Zap, ChevronLeft,
  Activity, Lock,
} from "lucide-react";

// ============================================================================
// Navigation structure
// ============================================================================
type ViewTab =
  | "dashboard" | "tenants" | "tenantProfile" | "subscriptions" | "billing" | "users"
  | "modules" | "addons" | "analytics" | "support" | "crm"
  | "integrations" | "security" | "settings";

interface NavChild {
  label: string;
  tab: ViewTab;
  action?: string;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab?: ViewTab;
  children?: NavChild[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, tab: "dashboard" },
    ],
  },
  {
    label: "Tenant Operations",
    items: [
      {
        label: "Tenants", icon: Building2,
        children: [
          { label: "All Clinics", tab: "tenants", action: "all" },
          { label: "Active Clinics", tab: "tenants", action: "active" },
          { label: "Trial Accounts", tab: "tenants", action: "trial" },
          { label: "Suspended", tab: "tenants", action: "suspended" },
        ],
      },
      {
        label: "Subscription Mgmt", icon: CreditCard,
        children: [
          { label: "All Plans", tab: "subscriptions", action: "all" },
          { label: "Active Plans", tab: "subscriptions", action: "active" },
          { label: "Inactive Plans", tab: "subscriptions", action: "inactive" },
        ],
      },
      {
        label: "Revenue & Billing", icon: Receipt,
        children: [
          { label: "All Invoices", tab: "billing", action: "all" },
          { label: "Paid", tab: "billing", action: "paid" },
          { label: "Unpaid", tab: "billing", action: "unpaid" },
          { label: "Partial", tab: "billing", action: "partial" },
        ],
      },
      { label: "Users & Access", icon: Users, tab: "users" },
    ],
  },
  {
    label: "Platform Management",
    items: [
      {
        label: "Healthcare Modules", icon: Boxes,
        children: [
          { label: "All Modules", tab: "modules", action: "all" },
          { label: "Healthcare", tab: "modules", action: "healthcare" },
          { label: "Business", tab: "modules", action: "business" },
        ],
      },
      { label: "Add-ons Marketplace", icon: Puzzle, tab: "addons" },
      { label: "Analytics", icon: BarChart3, tab: "analytics" },
    ],
  },
  {
    label: "Customer Success",
    items: [
      {
        label: "Support Center", icon: Headphones,
        children: [
          { label: "All Tickets", tab: "support", action: "all" },
          { label: "Open", tab: "support", action: "open" },
          { label: "Assigned", tab: "support", action: "assigned" },
          { label: "Resolved", tab: "support", action: "resolved" },
          { label: "High Priority", tab: "support", action: "high" },
        ],
      },
      {
        label: "Marketing CRM", icon: Megaphone,
        children: [
          { label: "All Leads", tab: "crm", action: "all" },
          { label: "New", tab: "crm", action: "lead" },
          { label: "Demo", tab: "crm", action: "demo" },
          { label: "Trial", tab: "crm", action: "trial" },
          { label: "Converted", tab: "crm", action: "converted" },
        ],
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      { label: "Integrations", icon: Plug, tab: "integrations" },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Security", icon: ShieldCheck,
        children: [
          { label: "All Logs", tab: "security", action: "all" },
          { label: "Logins", tab: "security", action: "login" },
          { label: "Updates", tab: "security", action: "update" },
          { label: "Deletes", tab: "security", action: "delete" },
        ],
      },
      { label: "Settings", icon: SettingsIcon, tab: "settings" },
    ],
  },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  dashboard: "Dashboard",
  tenants: "Tenants",
  tenantProfile: "Tenant Profile",
  subscriptions: "Subscriptions",
  billing: "Revenue & Billing",
  users: "Users & Access",
  modules: "Healthcare Modules",
  addons: "Add-ons Marketplace",
  analytics: "Analytics",
  support: "Support Center",
  crm: "Marketing CRM",
  integrations: "Integrations",
  security: "Security",
  settings: "Settings",
};

interface Notification {
  title: string;
  desc: string;
  time: string;
  type: "info" | "warn" | "error" | "success";
}

// ============================================================================
// Admin Page
// ============================================================================
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [filter, setFilter] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["Tenants"]));
  const [search, setSearch] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  // Build flat list of all nav children for global search
  const allNavChildren = useMemo(() => {
    const list: { label: string; tab: ViewTab; action?: string; parent: string }[] = [];
    NAV_GROUPS.forEach((g) => {
      g.items.forEach((item) => {
        if (item.tab) list.push({ label: item.label, tab: item.tab, parent: g.label });
        (item.children || []).forEach((c) => list.push({ label: c.label, tab: c.tab, action: c.action, parent: item.label }));
      });
    });
    return list;
  }, []);

  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return allNavChildren.filter((c) => c.label.toLowerCase().includes(q) || c.parent.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allNavChildren]);

  const navigate = (newTab: ViewTab, action?: string) => {
    setTab(newTab);
    setFilter(action || "");
    setMobileSidebarOpen(false);
    setSearch("");
  };

  const handleViewProfile = (id: string | null) => {
    setSelectedTenantId(id);
    setTab(id ? "tenantProfile" : "tenants");
    setFilter("");
    setMobileSidebarOpen(false);
    setSearch("");
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const notifs: Notification[] = [];

      // Fetch recent tenants
      try {
        const tenantRes = await fetchAPI("/api/tenants");
        if (tenantRes.ok) {
          const tenants = await tenantRes.json();
          const recentTenants = tenants.slice(0, 3);
          recentTenants.forEach((t: { name: string; status: string; createdAt: string }) => {
            const mins = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
            const time = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
            if (t.status === "trial") {
              notifs.push({ title: "Tenant on trial", desc: `${t.name} is on a trial plan`, time, type: "info" });
            } else if (t.status === "active") {
              notifs.push({ title: "Active tenant", desc: `${t.name} is actively using the platform`, time, type: "success" });
            }
          });
        }
      } catch { /* skip */ }

      // Fetch open support tickets
      try {
        const ticketRes = await fetchAPI("/api/support-tickets");
        if (ticketRes.ok) {
          const tickets = await ticketRes.json();
          const openTickets = tickets.filter((t: { status: string }) => t.status === "open");
          openTickets.slice(0, 3).forEach((t: { ticketNo: string; subject: string; priority: string; tenant?: { name: string } }) => {
            const type = t.priority === "high" || t.priority === "urgent" ? "error" : t.priority === "medium" ? "warn" : "info";
            notifs.push({
              title: `${type === "error" ? "High priority" : "Open"} ticket`,
              desc: `${t.subject} — ${t.tenant?.name || "Unknown tenant"}`,
              time: t.ticketNo,
              type,
            });
          });
        }
      } catch { /* skip */ }

      setNotifications(notifs.slice(0, 8));
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchNotifications();
  }, [authed, fetchNotifications]);

  const handleLogin = useCallback((user: AdminUser) => {
    setAdminUser(user);
    setAuthed(true);
  }, []);

  if (!authed) return <SaasLogin onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
      >
        <SidebarBrand collapsed={sidebarCollapsed} />
        <SidebarNav
          collapsed={sidebarCollapsed}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          activeTab={tab}
          activeFilter={filter}
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
              <SidebarNav
                collapsed={false}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                activeTab={tab}
                activeFilter={filter}
                navigate={navigate}
              />
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          tab={tab}
          filter={filter}
          toggleSidebar={() => setSidebarCollapsed((v) => !v)}
          openMobile={() => setMobileSidebarOpen(true)}
          search={search}
          setSearch={setSearch}
          searchResults={searchResults}
          navigate={navigate}
          logout={() => { setAuthed(false); setAdminUser(null); toast.success("Signed out"); }}
          adminUser={adminUser}
          notifications={notifications}
        />

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + filter}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ViewRenderer tab={tab} filter={filter} selectedTenantId={selectedTenantId} onViewProfile={handleViewProfile} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// View renderer
// ============================================================================
function ViewRenderer({ tab, filter, selectedTenantId, onViewProfile }: { tab: ViewTab; filter: string; selectedTenantId: string | null; onViewProfile: (id: string | null) => void }) {
  switch (tab) {
    case "dashboard": return <SaasDashboard />;
    case "tenants": return <SaasTenants filter={filter} onViewProfile={onViewProfile} />;
    case "tenantProfile": return <SaasTenantProfile tenantId={selectedTenantId} onBack={() => onViewProfile(null)} />;
    case "subscriptions": return <SaasSubscriptions filter={filter} />;
    case "billing": return <SaasBilling filter={filter} />;
    case "users": return <SaasUsers />;
    case "modules": return <SaasModules filter={filter} />;
    case "addons": return <SaasAddOns />;
    case "analytics": return <SaasAnalytics />;
    case "support": return <SaasSupport filter={filter} />;
    case "crm": return <SaasCRM filter={filter} />;
    case "integrations": return <SaasIntegrations />;
    case "security": return <SaasSecurity filter={filter} />;
    case "settings": return <SaasSettings />;
    default: return <SaasDashboard />;
  }
}

// ============================================================================
// Sidebar brand
// ============================================================================
function SidebarBrand({ collapsed, compact }: { collapsed: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20", compact ? "p-0" : "h-16 px-4")}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={130} height={40} className="shrink-0" />
          </motion.div>
        ) : (
          <Image src="/images/carelim-os.png" alt="Carelim OS" width={32} height={32} className="shrink-0 rounded-lg" />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sidebar nav
// ============================================================================
function SidebarNav({
  collapsed, expandedItems, toggleExpand, activeTab, activeFilter, navigate,
}: {
  collapsed: boolean;
  expandedItems: Set<string>;
  toggleExpand: (label: string) => void;
  activeTab: ViewTab;
  activeFilter: string;
  navigate: (tab: ViewTab, action?: string) => void;
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
                expanded={expandedItems.has(item.label)}
                toggleExpand={() => toggleExpand(item.label)}
                activeTab={activeTab}
                activeFilter={activeFilter}
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
  item, collapsed, expanded, toggleExpand, activeTab, activeFilter, navigate,
}: {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  toggleExpand: () => void;
  activeTab: ViewTab;
  activeFilter: string;
  navigate: (tab: ViewTab, action?: string) => void;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const isActive = item.tab === activeTab;
  const childActive = hasChildren && (item.children || []).some((c) => c.tab === activeTab && (!c.action || c.action === activeFilter));

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) toggleExpand();
          else if (item.tab) navigate(item.tab);
        }}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
          (isActive || childActive)
            ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
            : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30",
          collapsed && "justify-center"
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="flex-1 text-left truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && hasChildren && (
          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", expanded && "rotate-180")} />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && hasChildren && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
              {(item.children || []).map((c) => {
                const active = c.tab === activeTab && (c.action || "") === activeFilter;
                return (
                  <button
                    key={c.label}
                    onClick={() => navigate(c.tab, c.action)}
                    className={cn(
                      "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-[13px] transition-all",
                      active
                        ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span className={cn("w-1 h-1 rounded-full", active ? "bg-teal-600" : "bg-muted-foreground/40")} />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className={cn(
        "rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5",
        collapsed && "flex justify-center"
      )}>
        {collapsed ? (
          <Zap className="w-4 h-4 text-teal-600" />
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              <Zap className="w-3 h-3" /> Platform Health
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">All systems operational</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">99.98% uptime</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Admin Header
// ============================================================================
function AdminHeader({
  tab, filter, toggleSidebar, openMobile, search, setSearch, searchResults, navigate, logout, adminUser, notifications,
}: {
  tab: ViewTab;
  filter: string;
  toggleSidebar: () => void;
  openMobile: () => void;
  search: string;
  setSearch: (s: string) => void;
  searchResults: { label: string; tab: ViewTab; action?: string; parent: string }[];
  navigate: (tab: ViewTab, action?: string) => void;
  logout: () => void;
  adminUser: AdminUser | null;
  notifications: Notification[];
}) {
  const displayName = adminUser?.name || "Admin";
  const displayEmail = adminUser?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={openMobile}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Collapse sidebar (desktop) */}
      <Button variant="ghost" size="icon" className="hidden md:flex shrink-0" onClick={toggleSidebar}>
        <ChevronLeft className="w-[18px] h-[18px]" />
      </Button>

      {/* Back button for tenant profile */}
      {tab === "tenantProfile" && (
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("tenants")}>
          <ChevronLeft className="w-[18px] h-[18px]" />
        </Button>
      )}

      {/* Breadcrumb / page title */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex flex-col leading-tight">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Carelim OS</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{VIEW_LABELS[tab]}</span>
            {filter && filter !== "all" && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Badge className="text-[9px] capitalize bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">{filter}</Badge>
              </>
            )}
          </div>
          <p className="text-base font-semibold text-foreground">
            {VIEW_LABELS[tab]}
            {filter && filter !== "all" && <span className="text-muted-foreground font-normal"> · {filter}</span>}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative ml-auto w-9 sm:w-48 md:w-56 lg:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search navigation…"
          className="pl-9 h-9 text-sm"
        />
        {search && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-elevated overflow-hidden z-50">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => navigate(r.tab, r.action)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <Search className="w-3 h-3 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground">{r.parent}</p>
                </div>
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-[10px] uppercase">Create</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("tenants")}>
            <Building2 className="w-4 h-4" /> New Tenant
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("subscriptions")}>
            <CreditCard className="w-4 h-4" /> New Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("addons")}>
            <Puzzle className="w-4 h-4" /> New Add-on
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("crm")}>
            <Megaphone className="w-4 h-4" /> New Lead
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("users")}>
            <Users className="w-4 h-4" /> New Admin User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("tenants")}>
            <Building2 className="w-4 h-4" /> New Clinic
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("modules")}>
            <Boxes className="w-4 h-4" /> Manage Modules
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
            <p className="text-sm font-semibold">Notifications</p>
            <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{notifications.length} new</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No new notifications</p>
              </div>
            ) : notifications.map((n, i) => (
              <div key={i} className="flex gap-2.5 p-3 border-b last:border-0 hover:bg-accent/50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  n.type === "info" ? "bg-teal-50 dark:bg-teal-950/40 text-teal-600" :
                  n.type === "warn" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600" :
                  n.type === "error" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600" :
                  "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                )}>
                  <Activity className="w-4 h-4" />
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
              <AvatarFallback className="bg-transparent text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col leading-tight pr-1">
              <span className="text-xs font-semibold">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">{displayEmail}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">{displayEmail}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("users")}>
            <UserCircle className="w-4 h-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("settings")}>
            <SettingsIcon className="w-4 h-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("security")}>
            <Lock className="w-4 h-4" /> Security
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
