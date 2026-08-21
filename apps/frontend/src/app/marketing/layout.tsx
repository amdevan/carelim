"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Contact,
  Handshake,
  GitBranch,
  Settings,
  ChevronLeft,
  Menu,
  X,
  ArrowLeft,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/marketing", icon: LayoutDashboard },
  { label: "Campaigns", href: "/marketing/campaigns", icon: Megaphone },
  { label: "Leads", href: "/marketing/leads", icon: Users },
  { label: "Contacts", href: "/marketing/contacts", icon: Contact },
  { label: "Deals", href: "/marketing/deals", icon: Handshake },
  { label: "Referrals", href: "/marketing/referrals", icon: GitBranch },
  { label: "Settings", href: "/marketing/settings", icon: Settings },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/marketing") return pathname === "/marketing";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-purple-100 flex flex-col transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900">Marketing</p>
            <p className="text-[10px] text-purple-500 uppercase tracking-wider font-medium">
              CRM Panel
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden p-1 rounded hover:bg-purple-100"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-200"
                      : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Back to CMS */}
        <div className="border-t border-purple-100 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CMS</span>
          </Link>
        </div>

        {/* Footer badge */}
        <div className="p-3">
          <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-800">
                Marketing Panel
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-700 font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-purple-100">
          <div className="flex items-center gap-3 h-14 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-purple-50"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Link href="/" className="hover:text-purple-600 transition-colors">
                Carelim OS
              </Link>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="font-semibold text-purple-700">Marketing</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
