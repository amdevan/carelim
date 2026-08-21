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
  Plug,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/saas", icon: LayoutDashboard },
  { label: "Tenants", href: "/saas/tenants", icon: Building2 },
  { label: "Plans", href: "/saas/plans", icon: CreditCard },
  { label: "Users", href: "/saas/users", icon: Users },
  { label: "Analytics", href: "/saas/analytics", icon: BarChart3 },
  { label: "Support", href: "/saas/support", icon: Headphones },
  { label: "Security", href: "/saas/security", icon: ShieldCheck },
  { label: "Integrations", href: "/saas/integrations", icon: Plug },
  { label: "Settings", href: "/saas/settings", icon: Settings },
];

export default function SaasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/saas") return pathname === "/saas";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-30 h-screen w-64 bg-white border-r border-teal-200 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-teal-800">Carelim OS</span>
            <span className="text-[10px] text-teal-600/70">SaaS Admin Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden p-1 rounded-md hover:bg-teal-100 text-teal-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-teal-500/70">
            Navigation
          </p>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20"
                      : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-teal-100 p-3">
          <div className="rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700">
              <Zap className="w-3 h-3" /> Platform Health
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">All systems operational</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-600 font-medium">99.98% uptime</span>
            </div>
          </div>
          <Link
            href="/"
            className="mt-3 flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CMS</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 flex items-center gap-3 border-b border-teal-100 bg-white/80 backdrop-blur-xl px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-teal-50 text-teal-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-teal-600 font-semibold">SaaS Admin</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 font-medium">
              {NAV_ITEMS.find((item) => isActive(item.href))?.label || "Dashboard"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Super Admin
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
