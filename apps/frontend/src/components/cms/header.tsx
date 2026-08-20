"use client";

import { useAppStore, navItems } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { PatientQuickLookup } from "@/components/cms/patient-quick-lookup";
import {
  Search,
  Menu,
  Plus,
  ChevronDown,
  LogOut,
  User,
  UserCircle,
  Settings as SettingsIcon,
  Command,
  Keyboard,
  ArrowLeftFromLine,
  Building2,
  LayoutGrid,
  Stethoscope,
  HeartPulse,
  Smile,
  Baby,
  Shield,
  Network,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { toast } from "sonner";

export function Header() {
  const { view, setView, user, logout, setCommandOpen, toggleSidebar, impersonation, exitImpersonation } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = navItems.find((n) => n.key === view);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setMobileOpen((v) => !v)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="w-[18px] h-[18px]" />
        </Button>
        <div className="hidden sm:flex flex-col leading-tight">
          <h1 className="text-base font-semibold text-foreground">{current?.label ?? "Dashboard"}</h1>
          <p className="text-[11px] text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Global search */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex items-center gap-2 ml-auto mr-1 w-9 sm:w-48 md:w-56 lg:w-64 h-9 rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted hover:border-teal-300 transition-colors shrink-0"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline flex-1 text-left truncate">Search…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium shrink-0">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Patient Quick Lookup */}
      <PatientQuickLookup onSelect={() => { setView("patients"); toast.success("Patient selected", { description: "Opening patient module…" }); }}>
        <button className="hidden md:flex items-center gap-1.5 h-9 rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted hover:border-teal-300 transition-colors shrink-0">
          <User className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="hidden lg:inline">Find Patient</span>
          <span className="lg:hidden">Patient</span>
        </button>
      </PatientQuickLookup>

      <Button
        size="sm"
        className="hidden sm:flex gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shrink-0"
        onClick={() => toast.success("Quick action menu", { description: "Register patient, book appointment, create invoice…" })}
      >
        <Plus className="w-4 h-4" /> <span className="hidden lg:inline">Quick</span>
      </Button>

      {/* Impersonation Banner */}
      {impersonation && (
        <div className="flex items-center gap-2 ml-auto mr-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate max-w-[120px]">
            {impersonation.tenantName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 gap-1 text-[10px] text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={() => {
              exitImpersonation();
              logout();
              window.location.href = "/admin";
            }}
          >
            <ArrowLeftFromLine className="w-3 h-3" /> Exit
          </Button>
        </div>
      )}

      {!impersonation && <div className="flex-1" />}

      {/* Modules Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <LayoutGrid className="w-4 h-4" /> Modules
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Switch Module</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.href = "/doctor"}>
            <Stethoscope className="w-4 h-4" /> Doctor Panel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/patient"}>
            <HeartPulse className="w-4 h-4" /> Patient Portal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/dental"}>
            <Smile className="w-4 h-4" /> Dental Module
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/ivf"}>
            <Baby className="w-4 h-4" /> IVF Module
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/admin"}>
            <Shield className="w-4 h-4" /> SaaS Admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/carelim-ms"}>
            <Network className="w-4 h-4" /> Carelim MS
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = "/book"}>
            <CalendarCheck className="w-4 h-4" /> Public Booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-accent transition-colors shrink-0">
            <Avatar className="w-8 h-8 border border-border">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase() ?? "A"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:flex flex-col leading-tight text-left">
              <span className="text-xs font-semibold text-foreground">{user?.name ?? "Admin"}</span>
              <span className="text-[10px] text-muted-foreground">{user?.role ?? "Administrator"}</span>
            </div>
            <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Signed in as</DropdownMenuLabel>
          <DropdownMenuLabel className="font-medium text-sm -mt-1">{user?.email ?? "admin@carelim.health"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setView("settings")}>
            <SettingsIcon className="w-4 h-4 mr-2" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Profile coming soon")}>
            <UserCircle className="w-4 h-4 mr-2" /> My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { const e = new KeyboardEvent("keydown", { key: "?", shiftKey: true }); window.dispatchEvent(e); }}>
            <Keyboard className="w-4 h-4 mr-2" /> Keyboard Shortcuts
            <kbd className="ml-auto text-[10px] text-muted-foreground">⇧?</kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => { logout(); toast.success("Signed out"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur p-4 overflow-y-auto" onClick={() => setMobileOpen(false)}>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setMobileOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium",
                  view === item.key ? "bg-teal-600 text-white" : "text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
