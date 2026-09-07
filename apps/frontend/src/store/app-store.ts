import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, FileText, Pill,
  FlaskConical, Scan, Receipt, Boxes, BarChart3, UserCog, Settings, ShieldCheck, Wallet,
  ClipboardList, UserRound, CalendarOff, Globe, Bell, Shield,
  Building2,
  Handshake,
  Landmark,
  Smile,
  Heart,
  Activity,
  FileImage,
  GitBranch,
  Zap,
  Wrench,
  BellRing,
  FlaskConical as FlaskConicalIcon,
  Microscope,
  Egg,
  TestTubes,
  TestTube2,
  Snowflake,
  Syringe,
  Baby,
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
  | "branches"
  | "crm"
  | "tenant-settings"
  | "dental-odontogram"
  | "dental-examination"
  | "dental-treatment"
  | "dental-procedures"
  | "dental-imaging"
  | "dental-lab"
  | "dental-ortho"
  | "dental-implant"
  | "dental-followup"
  | "dental-reports"
  | "ivf-couples"
  | "ivf-cycles"
  | "ivf-protocols"
  | "ivf-stimulation"
  | "ivf-follicular"
  | "ivf-opu"
  | "ivf-andrology"
  | "ivf-embryology"
  | "ivf-cryobank"
  | "ivf-transfer"
  | "ivf-pregnancy"
  | "ivf-donors"
  | "ivf-consents"
  | "ivf-packages"
  | "ivf-reports";

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
  // Dental-specific items
  { key: "dental-odontogram", label: "Odontogram", icon: Smile, group: "Dental Clinical" },
  { key: "dental-examination", label: "Clinical Examination", icon: Stethoscope, group: "Dental Clinical" },
  { key: "dental-treatment", label: "Treatment Plan", icon: ClipboardList, group: "Dental Clinical" },
  { key: "dental-procedures", label: "Procedures", icon: Activity, group: "Dental Clinical" },
  { key: "dental-imaging", label: "Dental Imaging", icon: FileImage, group: "Dental Imaging & Lab" },
  { key: "dental-lab", label: "Dental Laboratory", icon: GitBranch, group: "Dental Imaging & Lab" },
  { key: "dental-ortho", label: "Orthodontics", icon: Zap, group: "Dental Specialty" },
  { key: "dental-implant", label: "Implant Module", icon: Wrench, group: "Dental Specialty" },
  { key: "dental-followup", label: "Follow-up", icon: BellRing, group: "Dental Administration" },
  { key: "dental-reports", label: "Dental Reports", icon: BarChart3, group: "Dental Administration" },
  // IVF-specific items
  { key: "ivf-couples", label: "Couple Management", icon: Users, group: "IVF Treatment" },
  { key: "ivf-cycles", label: "IVF Cycles", icon: FlaskConicalIcon, group: "IVF Treatment" },
  { key: "ivf-protocols", label: "Treatment Protocols", icon: Stethoscope, group: "IVF Treatment" },
  { key: "ivf-stimulation", label: "Stimulation", icon: Activity, group: "IVF Treatment" },
  { key: "ivf-follicular", label: "Follicular Monitoring", icon: Microscope, group: "IVF Treatment" },
  { key: "ivf-opu", label: "Egg Retrieval (OPU)", icon: Egg, group: "IVF Treatment" },
  { key: "ivf-andrology", label: "Andrology", icon: TestTubes, group: "IVF Laboratory" },
  { key: "ivf-embryology", label: "Embryology Lab", icon: TestTube2, group: "IVF Laboratory" },
  { key: "ivf-cryobank", label: "Cryobank", icon: Snowflake, group: "IVF Laboratory" },
  { key: "ivf-transfer", label: "Embryo Transfer", icon: Syringe, group: "IVF Outcomes" },
  { key: "ivf-pregnancy", label: "Pregnancy Tracking", icon: Baby, group: "IVF Outcomes" },
  { key: "ivf-donors", label: "Donor Management", icon: Heart, group: "IVF Administration" },
  { key: "ivf-consents", label: "Consent Forms", icon: FileText, group: "IVF Administration" },
  { key: "ivf-packages", label: "IVF Packages", icon: Boxes, group: "IVF Administration" },
  { key: "ivf-reports", label: "IVF Reports", icon: BarChart3, group: "IVF Administration" },
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
  { key: "crm", label: "CRM & Sales", icon: Handshake, group: "Platform" },
  { key: "tenant-settings", label: "Tenant Settings", icon: Landmark, group: "Administration" },
];

export const navGroups = ["Overview", "Clinical", "Dental Clinical", "Dental Imaging & Lab", "Dental Specialty", "Dental Administration", "IVF Treatment", "IVF Laboratory", "IVF Outcomes", "IVF Administration", "Specialty", "Diagnostics", "Operations", "Finance", "Administration", "Platform"];

/** Modules shown per clinic business type. General is the base — Dental/IVF include all General modules + their specialty. */
export const CLINIC_TYPE_MODULES: Record<string, ViewKey[]> = {
  General: ["dashboard", "appointments", "patients", "doctors", "emr", "clinical-notes", "laboratory", "radiology", "pharmacy", "inventory", "billing", "accounting", "reports", "insurance", "hr", "staff", "leave", "audit", "settings", "public-booking", "notifications", "branches", "crm", "tenant-settings"],
  Dental: ["dashboard", "appointments", "patients", "doctors", "emr", "clinical-notes", "dental-odontogram", "dental-examination", "dental-treatment", "dental-procedures", "dental-imaging", "dental-lab", "dental-ortho", "dental-implant", "dental-followup", "dental-reports", "laboratory", "radiology", "pharmacy", "inventory", "billing", "accounting", "reports", "insurance", "hr", "staff", "leave", "audit", "settings", "public-booking", "notifications", "branches", "crm", "tenant-settings"],
  IVF: ["dashboard", "appointments", "patients", "doctors", "emr", "clinical-notes", "ivf-couples", "ivf-cycles", "ivf-protocols", "ivf-stimulation", "ivf-follicular", "ivf-opu", "ivf-andrology", "ivf-embryology", "ivf-cryobank", "ivf-transfer", "ivf-pregnancy", "ivf-donors", "ivf-consents", "ivf-packages", "ivf-reports", "laboratory", "radiology", "pharmacy", "inventory", "billing", "accounting", "reports", "insurance", "hr", "staff", "leave", "audit", "settings", "public-booking", "notifications", "branches", "crm", "tenant-settings"],
};

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
  token: string | null;
  user: { name: string; email: string; role: string; tenantId?: string | null; permissions?: string[] } | null;
  login: (email: string, token?: string, tenantId?: string | null, permissions?: string[], name?: string, role?: string) => void;
  loginAs: (email: string, name: string, role: string, tenantId?: string | null, permissions?: string[]) => void;
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
  branchId: string | null;
  setBranchId: (id: string | null) => void;
  branchClinicType: string | null;
  setBranchClinicType: (ct: string | null) => void;
  tenantBranding: { clinicName: string | null; logoUrl: string | null; primaryColor: string | null } | null;
  setTenantBranding: (b: { clinicName: string | null; logoUrl: string | null; primaryColor: string | null } | null) => void;
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
      token: null,
      user: null,
      login: (email, token, tenantId, permissions, name, role) =>
        set({
          authed: true,
          token: token || null,
          impersonation: null,
          enabledModules: [],
          user: {
            name: name || email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase()),
            email,
            role: role || "User",
            tenantId: tenantId || null,
            permissions: permissions || [],
          },
        }),
      loginAs: (email, name, role, tenantId, permissions) =>
        set({
          authed: true,
          user: { name, email, role, tenantId: tenantId || null, permissions: permissions || [] },
          enabledModules: [],
        }),
      logout: () => {
        // Clear the auth cookie
        document.cookie = "carelim_token=; path=/; max-age=0";
        set({ authed: false, token: null, user: null, impersonation: null, enabledModules: [], view: "dashboard" });
      },
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
      branchId: null,
      setBranchId: (id) => set({ branchId: id }),
      branchClinicType: null,
      setBranchClinicType: (ct) => set({ branchClinicType: ct }),
      tenantBranding: null,
      setTenantBranding: (b) => set({ tenantBranding: b }),
    }),
    { name: "carelim-store", partialize: (state) => ({ view: state.view, sidebarCollapsed: state.sidebarCollapsed, recentViews: state.recentViews, favorites: state.favorites, enabledModules: state.enabledModules, impersonation: state.impersonation, branchId: state.branchId, branchClinicType: state.branchClinicType, authed: state.authed, user: state.user, tenantBranding: state.tenantBranding }) }
  )
);
