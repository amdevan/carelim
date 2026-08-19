import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, FileText, Pill,
  FlaskConical, Scan, Receipt, Boxes, BarChart3, UserCog, Settings, ShieldCheck, Wallet,
  ClipboardList, UserRound, CalendarOff, Globe, Bell, Shield,
  Building2,
} from "lucide-react";

export type ViewKey =
  | "dashboard"
  | "patients"
  | "doctors"
  | "appointments"
  | "emr"
  | "pharmacy"
  | "laboratory"
  | "radiology"
  | "billing"
  | "inventory"
  | "accounting"
  | "reports"
  | "hr"
  | "settings"
  | "audit"
  | "dental"
  | "ivf"
  | "telemedicine"
  | "clinical-notes"
  | "staff"
  | "leave"
  | "public-booking"
  | "notifications"
  | "insurance"
  | "branches";

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  badge?: string;
}

export const navItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "appointments", label: "Appointments", icon: CalendarClock, group: "Clinical" },
  { key: "patients", label: "Patients", icon: Users, group: "Clinical" },
  { key: "doctors", label: "Doctors", icon: Stethoscope, group: "Clinical" },
  { key: "emr", label: "EMR & Prescription", icon: FileText, group: "Clinical" },
  { key: "clinical-notes", label: "Clinical Notes", icon: ClipboardList, group: "Clinical" },
  { key: "laboratory", label: "Laboratory (LIMS)", icon: FlaskConical, group: "Diagnostics" },
  { key: "radiology", label: "Radiology (RIS)", icon: Scan, group: "Diagnostics" },
  { key: "pharmacy", label: "Pharmacy", icon: Pill, group: "Operations" },
  { key: "inventory", label: "Inventory", icon: Boxes, group: "Operations" },
  { key: "billing", label: "Billing", icon: Receipt, group: "Finance" },
  { key: "accounting", label: "Accounting", icon: Wallet, group: "Finance" },
  { key: "reports", label: "Reports", icon: BarChart3, group: "Finance" },
  { key: "insurance", label: "Insurance Claims", icon: Shield, group: "Finance" },
  { key: "hr", label: "HR & Staff", icon: UserCog, group: "Administration" },
  { key: "staff", label: "Staff Management", icon: UserRound, group: "Administration" },
  { key: "leave", label: "Leave Management", icon: CalendarOff, group: "Administration" },
  { key: "audit", label: "Audit Log", icon: ShieldCheck, group: "Administration" },
  { key: "settings", label: "Settings", icon: Settings, group: "Administration" },
  { key: "public-booking", label: "Public Booking", icon: Globe, group: "Platform" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "Platform" },
  { key: "branches", label: "Branches", icon: Building2, group: "Administration" },
];

export const navGroups = ["Overview", "Clinical", "Diagnostics", "Operations", "Finance", "Administration", "Platform"];

interface ImpersonationContext {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  enabledModules: string[];
}

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  authed: boolean;
  user: { name: string; email: string; role: string } | null;
  login: (email: string) => void;
  loginAs: (email: string, name: string, role: string) => void;
  logout: () => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  recentViews: ViewKey[];
  toggleFavorite: (v: ViewKey) => void;
  favorites: ViewKey[];
  impersonation: ImpersonationContext | null;
  startImpersonation: (ctx: ImpersonationContext) => void;
  exitImpersonation: () => void;
  enabledModules: string[];
  setEnabledModules: (modules: string[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "dashboard",
      setView: (v) => set((s) => ({
        view: v,
        recentViews: [v, ...s.recentViews.filter((rv) => rv !== v)].slice(0, 5),
      })),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      authed: false,
      user: null,
      login: (email) =>
        set({
          authed: true,
          impersonation: null,
          enabledModules: [],
          user: {
            name: email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase()),
            email,
            role: email.includes("admin") ? "Super Admin" : "Administrator",
          },
        }),
      loginAs: (email, name, role) =>
        set({
          authed: true,
          user: { name, email, role },
          enabledModules: [],
        }),
      logout: () => set({ authed: false, user: null, impersonation: null, enabledModules: [], view: "dashboard" }),
      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),
      recentViews: [],
      favorites: [],
      toggleFavorite: (v) => set((s) => ({
        favorites: s.favorites.includes(v)
          ? s.favorites.filter((f) => f !== v)
          : [...s.favorites, v],
      })),
      impersonation: null,
      startImpersonation: (ctx) => set({ impersonation: ctx, enabledModules: ctx.enabledModules }),
      exitImpersonation: () => set({ impersonation: null, enabledModules: [], view: "dashboard" }),
      enabledModules: [],
      setEnabledModules: (modules) => set({ enabledModules: modules }),
    }),
    { name: "medcore-store" }
  )
);
