"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Avatar, AvatarFallback } from "@carelim/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@carelim/ui";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  Headphones,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Tenant Operations",
    items: [
      { label: "Tenants", href: "/admin/tenants", icon: Building2 },
      { label: "Plans & Billing", href: "/admin/plans", icon: CreditCard },
      { label: "Users", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Modules", href: "/admin/modules", icon: Boxes },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tickets", href: "/admin/tickets", icon: Headphones },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Security", href: "/admin/security", icon: ShieldCheck },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen transition-all duration-300",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20">
          {!collapsed && (
            <span className="text-lg font-bold text-gradient-teal">Carelim</span>
          )}
          {collapsed && (
            <span className="text-lg font-bold text-gradient-teal mx-auto">C</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {NAV_ITEMS.map((group) => (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                          : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30",
                        collapsed && "justify-center"
                      )}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5",
              collapsed && "flex justify-center"
            )}
          >
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
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-border z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <span className="text-lg font-bold text-gradient-teal">Carelim</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2.5">
              {NAV_ITEMS.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                              : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                          )}
                        >
                          <Icon className="w-[18px] h-[18px] shrink-0" />
                          <span className="flex-1 text-left truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex shrink-0" onClick={() => setCollapsed(!collapsed)}>
            <ChevronDown className={cn("w-[18px] h-[18px] transition-transform", collapsed ? "-rotate-90" : "rotate-90")} />
          </Button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col leading-tight">
              <p className="text-base font-semibold text-foreground">SaaS Admin</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent transition-colors">
                  <Avatar className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600">
                    <AvatarFallback className="bg-transparent text-white text-xs font-semibold">SA</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600 focus:text-rose-700">
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
