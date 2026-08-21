"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  BarChart3,
  Headphones,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ArrowLeft,
  Zap,
  ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/saas", icon: LayoutDashboard },
  { label: "Tenants", href: "/saas/tenants", icon: Building2 },
  { label: "Plans", href: "/saas/plans", icon: CreditCard },
  { label: "Users", href: "/saas/users", icon: Users },
  { label: "Analytics", href: "/saas/analytics", icon: BarChart3 },
  { label: "Support", href: "/saas/support", icon: Headphones },
  { label: "Security", href: "/saas/security", icon: ShieldCheck },
  { label: "Settings", href: "/saas/settings", icon: Settings },
];

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 w-64 border-r border-border bg-sidebar sticky top-0 h-screen">
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20">
          <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Carelim
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/saas"
                  ? pathname === "/saas"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                      : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              <Zap className="w-3 h-3" /> Platform Health
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">All systems operational</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">99.98% uptime</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-border z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <span className="text-lg font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                Carelim
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2.5">
              <div className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/saas"
                      ? pathname === "/saas"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                          : "text-sidebar-foreground/75 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
          {/* Mobile hamburger */}
          <button
            className="md:hidden shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Back to home */}
          <Link
            href="/"
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col leading-tight">
              <p className="text-base font-semibold text-foreground">SaaS Admin</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 px-2.5 py-1 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
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
