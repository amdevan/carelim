"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  UserPlus,
  Contact,
  Handshake,
  UsersRound,
  Settings,
  Menu,
  X,
  ArrowLeft,
  ChevronDown,
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/marketing", icon: LayoutDashboard },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Campaigns", href: "/marketing/campaigns", icon: Megaphone },
      { label: "Leads", href: "/marketing/leads", icon: UserPlus },
      { label: "Contacts", href: "/marketing/contacts", icon: Contact },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Deals", href: "/marketing/deals", icon: Handshake },
      { label: "Referrals", href: "/marketing/referrals", icon: UsersRound },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/marketing/settings", icon: Settings },
    ],
  },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === "/marketing" ? pathname === "/marketing" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 sticky top-0 h-screen transition-all duration-300 ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 h-16 px-4 border-b border-purple-100 dark:border-purple-900/40 bg-gradient-to-r from-purple-50/80 to-transparent dark:from-purple-950/30">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-lg font-bold">Carelim MS</span>
            </Link>
          )}
          {collapsed && (
            <span className="text-lg font-bold text-purple-600 mx-auto">C</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {NAV_ITEMS.map((group) => (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/20"
                          : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-purple-100 dark:border-purple-900/40 p-3">
          <div
            className={`rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40 border border-purple-100 dark:border-purple-900/50 p-2.5 ${
              collapsed ? "flex justify-center" : ""
            }`}
          >
            {collapsed ? (
              <Sparkles className="w-4 h-4 text-purple-600" />
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                  <Sparkles className="w-3 h-3" /> Marketing Suite
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Grow your practice
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                    Active
                  </span>
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
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-purple-100 dark:border-purple-900/40 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-purple-100 dark:border-purple-900/40">
              <Link href="/" className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-lg font-bold">Carelim MS</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2.5">
              {NAV_ITEMS.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ${
                            active
                              ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/20"
                              : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                          }`}
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-purple-100 dark:border-purple-900/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-3 sm:px-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden shrink-0 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex shrink-0 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
          >
            <ChevronDown
              className={`w-[18px] h-[18px] text-gray-600 dark:text-gray-400 transition-transform ${
                collapsed ? "-rotate-90" : "rotate-90"
              }`}
            />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col leading-tight">
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                Marketing & CRM
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/40 px-2.5 py-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Live
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
