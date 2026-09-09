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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Header() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const impersonation = useAppStore((s) => s.impersonation);
  const exitImpersonation = useAppStore((s) => s.exitImpersonation);
  const branchId = useAppStore((s) => s.branchId);
  const setBranchId = useAppStore((s) => s.setBranchId);
  const setBranchClinicType = useAppStore((s) => s.setBranchClinicType);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; clinicType: string }[]>([]);

  useEffect(() => {
    fetchAPI("/api/branches")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.branches || [];
        setBranches(list);
        // Auto-select if only 1 branch, clear if 0 branches
        if (list.length === 1 && !branchId) {
          setBranchId(list[0].id);
          setBranchClinicType(list[0].clinicType || "General");
        } else if (list.length === 0) {
          setBranchId(null);
          setBranchClinicType(null);
        } else if (branchId) {
          // Restore selected branch clinic type
          const branch = list.find((b: { id: string; name: string; clinicType: string }) => b.id === branchId);
          if (branch) {
            setBranchClinicType(branch.clinicType || "General");
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleBranchChange = (id: string | null) => {
    setBranchId(id);
    if (!id) {
      setBranchClinicType(null);
    } else {
      const branch = branches.find((b) => b.id === id);
      setBranchClinicType(branch?.clinicType || "General");
    }
  };

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

      {/* Branch Selector — only show for non-staff users with 2+ branches */}
      {user?.type !== "staff" && branches.length >= 2 && (
        <Select value={branchId ?? "__all__"} onValueChange={(v) => handleBranchChange(v === "__all__" ? null : v)}>
          <SelectTrigger size="sm" className="h-8 gap-1.5 border border-input bg-muted/50 text-xs px-2.5">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name} <span className="text-[10px] text-muted-foreground ml-1">({b.clinicType})</span></SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
