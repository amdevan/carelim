"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Heart, User, UserPlus, FileText, Search as SearchIcon, Stethoscope, Calendar,
  CreditCard, Bell, Video, Pill, ClipboardList, FlaskConical, Upload, Users,
  MessageSquare, Wallet, Sparkles, ChevronDown, ChevronRight, Menu, X, LogOut,
  UserCircle, Plus, ChevronLeft, Mail, Eye, EyeOff, ArrowRight, ShieldCheck,
  Home, Activity, Package, Clock, Star, MapPin, Phone, Check, Pencil, Trash2, Download,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================
type ViewTab =
  | "dashboard" | "health-profile" | "find-doctors" | "my-doctors"
  | "appointments" | "book-appointment" | "payments" | "reminders"
  | "telehealth" | "prescriptions" | "medical-records" | "lab-reports"
  | "documents" | "family" | "notifications" | "activity" | "packages"
  | "messages" | "manage-payments" | "ai-features";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: ViewTab;
  description: string;
}
interface NavGroup { label: string; items: NavItem[]; }

interface PatientUser {
  id: string;
  patientId: string | null;
  name: string;
  email: string;
  phone: string | null;
}

interface PatientProfile {
  id: string;
  patientCode: string;
  name: string;
  email: string | null;
  phone: string;
  gender: string;
  dob: string | null;
  age: number;
  bloodGroup: string | null;
  address: string | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  allergies: string | null;
  chronicConditions: string | null;
  emergencyContact: string | null;
  emergencyName: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  status: string;
  registeredAt: string;
  appointments: Appointment[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  labTests: LabTest[];
  labOrders: LabOrder[];
  clinicalNotes: ClinicalNote[];
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  consultationFee: number;
  rating: number;
  experience: number;
  avatar: string | null;
  status: string;
  department: { name: string; color: string } | null;
  scheduleSlots: ScheduleSlot[];
}

interface ScheduleSlot {
  id: string;
  dayName: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  capacity: number;
  bookedCount: number;
  status: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  reason: string | null;
  fee: number;
  tokenNo: number;
  doctor: { id: string; name: string; specialization: string; department?: { name: string } };
}

interface Prescription {
  id: string;
  code: string;
  diagnosis: string | null;
  status: string;
  createdAt: string;
  doctor: { name: string; specialization: string };
  items: { id: string; medicineName: string; dosage: string; frequency: string; duration: string; instructions: string | null }[];
}

interface Invoice {
  id: string;
  invoiceNo: string;
  type: string;
  total: number;
  paid: number;
  due: number;
  status: string;
  date: string;
}

interface LabTest {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  status: string;
  result: string | null;
  fee: number;
  orderedAt: string;
}

interface LabOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  orderedAt: string;
  items: { test: { name: string } }[];
  results: { id: string; status: string }[];
}

interface ClinicalNote {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface PatientDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

interface PatientMessage {
  id: string;
  fromName: string;
  fromType: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface PatientNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface PatientReminder {
  id: string;
  title: string;
  time: string;
  type: string;
  active: boolean;
}

// ============================================================================
// API Helper
// ============================================================================
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// Auth Store (localStorage)
// ============================================================================
function getStoredUser(): PatientUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("patient-user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeUser(user: PatientUser) {
  localStorage.setItem("patient-user", JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem("patient-user");
}

// ============================================================================
// Navigation
// ============================================================================
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "My Dashboard", icon: Home, tab: "dashboard", description: "Health summary & quick actions" },
      { label: "Health Profile", icon: Heart, tab: "health-profile", description: "Personal health information" },
    ],
  },
  {
    label: "Doctors & Appointments",
    items: [
      { label: "Find Doctors", icon: SearchIcon, tab: "find-doctors", description: "Search & browse providers" },
      { label: "My Doctors", icon: Stethoscope, tab: "my-doctors", description: "Saved doctors & history" },
      { label: "Book Appointment", icon: Calendar, tab: "book-appointment", description: "Schedule a new visit" },
      { label: "My Appointments", icon: Clock, tab: "appointments", description: "Upcoming & past visits" },
    ],
  },
  {
    label: "Health Records",
    items: [
      { label: "Prescriptions", icon: Pill, tab: "prescriptions", description: "Medications & dosages" },
      { label: "Medical Records", icon: ClipboardList, tab: "medical-records", description: "Visit history & notes" },
      { label: "Lab Reports", icon: FlaskConical, tab: "lab-reports", description: "Test results & reports" },
      { label: "Documents", icon: Upload, tab: "documents", description: "Upload & manage files" },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Telehealth", icon: Video, tab: "telehealth", description: "Video consultations" },
      { label: "Messages", icon: MessageSquare, tab: "messages", description: "Chat with providers" },
      { label: "Reminders", icon: Bell, tab: "reminders", description: "Medication & appointment alerts" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "My Payments", icon: Wallet, tab: "payments", description: "Payment history & receipts" },
      { label: "Manage Payments", icon: CreditCard, tab: "manage-payments", description: "Cards & payment methods" },
      { label: "Health Packages", icon: Package, tab: "packages", description: "Wellness & care packages" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Family Members", icon: Users, tab: "family", description: "Manage family profiles" },
      { label: "Notifications", icon: Bell, tab: "notifications", description: "Alerts & updates" },
      { label: "Activity Tracker", icon: Activity, tab: "activity", description: "Healthcare activity log" },
      { label: "AI Health Assistant", icon: Sparkles, tab: "ai-features", description: "Smart health insights" },
    ],
  },
];

const VIEW_LABELS: Record<ViewTab, string> = {
  dashboard: "My Dashboard",
  "health-profile": "Health Profile",
  "find-doctors": "Find Doctors",
  "my-doctors": "My Doctors",
  "book-appointment": "Book Appointment",
  appointments: "My Appointments",
  payments: "My Payments",
  reminders: "Reminders",
  telehealth: "Telehealth",
  prescriptions: "Prescriptions",
  "medical-records": "Medical Records",
  "lab-reports": "Lab Reports",
  documents: "Documents",
  family: "Family Members",
  notifications: "Notifications",
  activity: "Activity Tracker",
  packages: "Health Packages",
  messages: "Messages",
  "manage-payments": "Manage Payments",
  "ai-features": "AI Health Assistant",
};

// ============================================================================
// Main Page
// ============================================================================
export default function PatientPage() {
  const [user, setUser] = useState<PatientUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <PatientLogin onLogin={(u) => { storeUser(u); setUser(u); }} />;

  return <PatientApp user={user} onLogout={() => { clearUser(); setUser(null); }} />;
}

// ============================================================================
// Patient App (authenticated)
// ============================================================================
function PatientApp({ user, onLogout }: { user: PatientUser; onLogout: () => void }) {
  const [tab, setTab] = useState<ViewTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (newTab: ViewTab) => {
    setTab(newTab);
    setMobileSidebarOpen(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 h-0.5 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500" />

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30"
      >
        <SidebarBrand collapsed={sidebarCollapsed} />
        <SidebarNav collapsed={sidebarCollapsed} activeTab={tab} navigate={navigate} />
        <SidebarFooter collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <SidebarBrand collapsed={false} compact />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileSidebarOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <SidebarNav collapsed={false} activeTab={tab} navigate={navigate} />
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <PatientHeader tab={tab} user={user} toggleSidebar={() => setSidebarCollapsed((v) => !v)}
          openMobile={() => setMobileSidebarOpen(true)} navigate={navigate} logout={onLogout} />

        <div className="px-4 sm:px-5 lg:px-6 pt-4">
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Patient Portal</p>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-300/70 hidden sm:block">Your personal healthcare dashboard</p>
            </div>
            <Badge className="text-[9px] bg-blue-600 text-white hidden sm:flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" /> Active
            </Badge>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={`${tab}-${refreshKey}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ViewRenderer tab={tab} user={user} onNavigate={navigate} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// View Renderer
// ============================================================================
function ViewRenderer({ tab, user, onNavigate }: { tab: ViewTab; user: PatientUser; onNavigate: (t: ViewTab) => void }) {
  switch (tab) {
    case "dashboard": return <DashboardView user={user} onNavigate={onNavigate} />;
    case "health-profile": return <HealthProfileView user={user} />;
    case "find-doctors": return <FindDoctorsView />;
    case "my-doctors": return <MyDoctorsView />;
    case "book-appointment": return <BookAppointmentView user={user} onNavigate={onNavigate} />;
    case "appointments": return <AppointmentsView user={user} />;
    case "payments": return <PaymentsView user={user} />;
    case "reminders": return <RemindersView user={user} />;
    case "telehealth": return <TelehealthView />;
    case "prescriptions": return <PrescriptionsView user={user} />;
    case "medical-records": return <MedicalRecordsView user={user} />;
    case "lab-reports": return <LabReportsView user={user} />;
    case "documents": return <DocumentsView user={user} />;
    case "family": return <FamilyView user={user} />;
    case "notifications": return <NotificationsView user={user} />;
    case "activity": return <ActivityView user={user} />;
    case "packages": return <PackagesView />;
    case "messages": return <MessagesView user={user} />;
    case "manage-payments": return <ManagePaymentsView />;
    case "ai-features": return <AiFeaturesView />;
    default: return <DashboardView user={user} onNavigate={onNavigate} />;
  }
}

// ============================================================================
// Sidebar Components
// ============================================================================
function SidebarBrand({ collapsed, compact }: { collapsed: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-sidebar-border bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20", compact ? "p-0" : "h-16 px-4")}>
      <AnimatePresence>
        {!collapsed ? (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">Patient Portal</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Carelim Health</p>
            </div>
          </motion.div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shrink-0 mx-auto">
            <Heart className="w-5 h-5 text-white" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarNav({ collapsed, activeTab, navigate }: { collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <AnimatePresence>
            {!collapsed && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</motion.p>
            )}
          </AnimatePresence>
          <div className="space-y-0.5">
            {group.items.map((item) => <SidebarItem key={item.tab} item={item} collapsed={collapsed} activeTab={activeTab} navigate={navigate} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({ item, collapsed, activeTab, navigate }: { item: NavItem; collapsed: boolean; activeTab: ViewTab; navigate: (tab: ViewTab) => void }) {
  const Icon = item.icon;
  const isActive = item.tab === activeTab;
  return (
    <button onClick={() => navigate(item.tab)} title={collapsed ? item.label : undefined}
      className={cn("group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
        isActive ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md shadow-blue-500/20" : "text-sidebar-foreground/75 hover:bg-blue-50 dark:hover:bg-blue-950/30",
        collapsed && "justify-center",
      )}>
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <AnimatePresence>
        {!collapsed && <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }} className="flex-1 text-left truncate">{item.label}</motion.span>}
      </AnimatePresence>
      {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
    </button>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
      {!collapsed ? (
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/40 dark:to-teal-950/40 border border-blue-100 dark:border-blue-900/50 p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-200">Patient Portal</span>
          </div>
          <p className="text-[9px] text-blue-700/70 dark:text-blue-300/70">HIPAA Compliant · Secure</p>
        </div>
      ) : (
        <div className="w-8 h-8 mx-auto rounded-md bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================
function PatientHeader({ tab, user, toggleSidebar, openMobile, navigate, logout }: {
  tab: ViewTab; user: PatientUser; toggleSidebar: () => void; openMobile: () => void; navigate: (t: ViewTab) => void; logout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3 px-4 sm:px-5 lg:px-6 h-16">
        <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" onClick={toggleSidebar}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={openMobile}><Menu className="w-4 h-4" /></Button>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground hidden sm:inline">Carelim</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
          <span className="text-muted-foreground">Patient</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{VIEW_LABELS[tab]}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={() => navigate("notifications")}>
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 px-1.5 gap-2">
                <Avatar className="w-7 h-7"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white text-[11px] font-semibold">{user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                <span className="text-xs font-medium hidden sm:inline">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel><div><p className="text-sm font-semibold">{user.name}</p><p className="text-[10px] text-muted-foreground font-normal">{user.email}</p></div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("health-profile")}><UserCircle className="w-4 h-4 mr-2" /> My Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("family")}><Users className="w-4 h-4 mr-2" /> Family Members</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Login / Register
// ============================================================================
function PatientLogin({ onLogin }: { onLogin: (u: PatientUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const u = await apiFetch("/api/patient/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        toast.success("Welcome back!");
        onLogin(u);
      } else {
        const u = await apiFetch("/api/patient/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, phone }) });
        toast.success("Account created!");
        onLogin(u);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Calendar, title: "Book Appointments", desc: "Schedule visits with top doctors" },
    { icon: Video, title: "Telehealth", desc: "Consult doctors from home" },
    { icon: ClipboardList, title: "Health Records", desc: "Access prescriptions & labs" },
    { icon: Pill, title: "Prescriptions", desc: "Track your medications" },
    { icon: FlaskConical, title: "Lab Reports", desc: "Digital test results" },
    { icon: Bell, title: "Smart Reminders", desc: "Never miss appointments" },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-[52%] bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-700 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><Heart className="w-7 h-7 text-white" /></div>
          <div><p className="text-lg font-bold">Carelim · Patient Portal</p><p className="text-xs text-white/70">Your Health, Your Control</p></div>
        </div>
        <div className="relative mb-8">
          <h1 className="text-4xl font-bold leading-tight mb-3">Healthcare made simple, personal & accessible.</h1>
          <p className="text-white/80 text-sm max-w-md">Book appointments, consult doctors remotely, access your medical records, and manage your family&apos;s health — all from one secure portal.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 mb-auto">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
              <f.icon className="w-5 h-5 mb-2" />
              <p className="text-sm font-semibold mb-0.5">{f.title}</p>
              <p className="text-[10px] text-white/70 leading-snug">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center"><Heart className="w-6 h-6 text-white" /></div>
            <div><p className="font-bold">Carelim Patient Portal</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthcare Platform</p></div>
          </div>
          <Badge variant="outline" className="mb-4 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 gap-1.5">
            <Heart className="w-3 h-3" /> {mode === "login" ? "Patient Login" : "Patient Registration"}
          </Badge>
          <h2 className="text-2xl font-bold mb-1">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="text-sm text-muted-foreground mb-6">{mode === "login" ? "Sign in to access your health dashboard." : "Join Carelim to manage your healthcare."}</p>
          <div className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5"><Label className="text-xs font-medium">Full Name</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-9 h-10" placeholder="Alex Wilson" /></div></div>
            )}
            <div className="space-y-1.5"><Label className="text-xs font-medium">Email</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-10" placeholder="alex@carelim.health" /></div></div>
            {mode === "register" && (
              <div className="space-y-1.5"><Label className="text-xs font-medium">Phone</Label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9 h-10" placeholder="+977-9841234567" /></div></div>
            )}
            <div className="space-y-1.5"><Label className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 h-10" placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div></div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 gap-2" onClick={submit} disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === "login"
              ? <>Don&apos;t have an account? <button onClick={() => setMode("register")} className="text-blue-600 hover:underline font-medium">Register</button></>
              : <>Already have an account? <button onClick={() => setMode("login")} className="text-blue-600 hover:underline font-medium">Sign in</button></>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Dashboard
// ============================================================================
function DashboardView({ user, onNavigate }: { user: PatientUser; onNavigate: (t: ViewTab) => void }) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/patient/profile?userId=${user.id}`).then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading dashboard...</div>;

  const upcomingAppts = profile?.appointments?.filter(a => a.status === "scheduled" || a.status === "checked-in").slice(0, 3) || [];
  const recentRx = profile?.prescriptions?.slice(0, 2) || [];
  const recentLabs = profile?.labOrders?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-500 to-teal-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-1">Good morning, {user.name.split(" ")[0]}!</h1>
        <p className="text-white/80 text-sm">Here&apos;s your health summary.</p>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2"><p className="text-lg font-bold">{upcomingAppts.length}</p><p className="text-[10px] text-white/70">Upcoming</p></div>
          <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2"><p className="text-lg font-bold">{profile?.prescriptions?.length || 0}</p><p className="text-[10px] text-white/70">Prescriptions</p></div>
          <div className="bg-white/15 backdrop-blur rounded-lg px-4 py-2"><p className="text-lg font-bold">{recentLabs.length}</p><p className="text-[10px] text-white/70">Lab Reports</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: "Book Appointment", color: "blue", tab: "book-appointment" as ViewTab },
          { icon: Video, label: "Start Telehealth", color: "teal", tab: "telehealth" as ViewTab },
          { icon: Pill, label: "Prescriptions", color: "emerald", tab: "prescriptions" as ViewTab },
          { icon: FlaskConical, label: "Lab Reports", color: "purple", tab: "lab-reports" as ViewTab },
        ].map((a) => (
          <Card key={a.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate(a.tab)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", a.color === "blue" && "bg-blue-100", a.color === "teal" && "bg-teal-100", a.color === "emerald" && "bg-emerald-100", a.color === "purple" && "bg-purple-100")}>
                <a.icon className={cn("w-5 h-5", a.color === "blue" && "text-blue-600", a.color === "teal" && "text-teal-600", a.color === "emerald" && "text-emerald-600", a.color === "purple" && "text-purple-600")} />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4">Upcoming Appointments</h3>
          {upcomingAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map(a => (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-accent/50">
                  <Avatar className="w-10 h-10"><AvatarFallback className="bg-blue-500 text-white text-xs font-semibold">{a.doctor.name.split(" ").slice(1).map(n => n[0]).join("")}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{a.doctor.name}</p><p className="text-xs text-muted-foreground">{a.doctor.specialization} · {a.type}</p></div>
                  <div className="text-right shrink-0"><p className="text-xs font-medium">{new Date(a.date).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{a.time}</p></div>
                  <Badge className="text-[10px] bg-blue-100 text-blue-700">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Recent Prescriptions</h3>
            {recentRx.length === 0 ? <p className="text-sm text-muted-foreground">No prescriptions yet.</p> : recentRx.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Pill className="w-4 h-4 text-blue-600" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{p.code}</p><p className="text-xs text-muted-foreground">{p.diagnosis || "No diagnosis"}</p></div>
                <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">Recent Lab Reports</h3>
            {recentLabs.length === 0 ? <p className="text-sm text-muted-foreground">No lab reports yet.</p> : recentLabs.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><FlaskConical className="w-4 h-4 text-emerald-600" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{l.orderNo}</p><p className="text-xs text-muted-foreground">{l.items.map(i => i.test.name).join(", ")}</p></div>
                <Badge className={cn("text-[10px]", l.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{l.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Health Profile
// ============================================================================
function HealthProfileView({ user }: { user: PatientUser }) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/patient/profile?userId=${user.id}`).then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading profile...</div>;
  if (!profile) return <div className="text-center py-8 text-muted-foreground text-sm">Profile not found.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">Health Profile</h2><p className="text-sm text-muted-foreground">Your personal health information</p></div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white text-xl font-bold">{profile.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
            <div>
              <h3 className="text-lg font-bold">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">Patient ID: {profile.patientCode}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{profile.gender}</Badge>
                <Badge variant="outline" className="text-xs">Age {profile.age}</Badge>
                {profile.bloodGroup && <Badge variant="outline" className="text-xs">Blood: {profile.bloodGroup}</Badge>}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal</h4>
              {[{ label: "Email", value: profile.email }, { label: "Phone", value: profile.phone }, { label: "DOB", value: profile.dob || "Not set" }, { label: "Address", value: profile.address || "Not set" }].map(i => (
                <div key={i.label}><p className="text-xs text-muted-foreground">{i.label}</p><p className="text-sm font-medium">{i.value || "—"}</p></div>
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Health</h4>
              {[
                { label: "Blood Group", value: profile.bloodGroup || "Not set" },
                { label: "Weight", value: profile.weight ? `${profile.weight} kg` : "Not set" },
                { label: "Height", value: profile.height ? `${profile.height} cm` : "Not set" },
                { label: "BMI", value: profile.bmi ? String(profile.bmi) : "Not set" },
                { label: "Allergies", value: profile.allergies || "None" },
                { label: "Chronic Conditions", value: profile.chronicConditions || "None" },
              ].map(i => (
                <div key={i.label}><p className="text-xs text-muted-foreground">{i.label}</p><p className="text-sm font-medium">{i.value}</p></div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Emergency Contact</h4>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center"><Phone className="w-4 h-4 text-rose-600" /></div>
              <div><p className="text-sm font-medium">{profile.emergencyName || "Not set"}</p><p className="text-xs text-muted-foreground">{profile.emergencyContact || "—"}</p></div>
            </div>
          </div>
          {profile.insuranceProvider && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Insurance</h4>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-purple-600" /></div>
                <div><p className="text-sm font-medium">{profile.insuranceProvider}</p><p className="text-xs text-muted-foreground">Policy: {profile.insuranceNumber}</p></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// VIEW: Find Doctors
// ============================================================================
function FindDoctorsView() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("all");

  useEffect(() => {
    apiFetch(`/api/patient/doctors?q=${search}`).then(setDoctors).catch(() => {}).finally(() => setLoading(false));
  }, [search]);

  const filtered = doctors.filter(d => specFilter === "all" || d.specialization === specFilter);
  const specializations = [...new Set(doctors.map(d => d.specialization))];

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Find Doctors</h2><p className="text-sm text-muted-foreground">Search and book with healthcare providers</p></div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or specialty..." className="pl-9" /></div>
        <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All Specializations</option>
          {specializations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <div className="text-center py-8 text-muted-foreground text-sm">Loading doctors...</div> : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white font-semibold">{d.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><h3 className="font-semibold">{d.name}</h3>{d.status === "active" && <span className="w-2 h-2 rounded-full bg-emerald-500" />}</div>
                    <p className="text-sm text-muted-foreground">{d.specialization}</p>
                    {d.department && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {d.department.name}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {d.rating}</span>
                      <span className="text-xs text-muted-foreground">{d.experience} yrs exp</span>
                      <span className="text-xs font-semibold text-blue-600">रू {d.consultationFee}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: My Doctors
// ============================================================================
function MyDoctorsView() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/api/patient/doctors").then(setDoctors).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">My Doctors</h2><p className="text-sm text-muted-foreground">Available doctors at Carelim</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        {doctors.map(d => (
          <Card key={d.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="w-12 h-12"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white font-semibold">{d.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
              <div className="flex-1"><h3 className="font-semibold text-sm">{d.name}</h3><p className="text-xs text-muted-foreground">{d.specialization}</p><div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="text-xs">{d.rating}</span></div></div>
              <Button size="sm" variant="outline" className="text-xs gap-1"><Phone className="w-3 h-3" /> Contact</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Book Appointment
// ============================================================================
function BookAppointmentView({ user, onNavigate }: { user: PatientUser; onNavigate: (t: ViewTab) => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { apiFetch("/api/patient/doctors").then(setDoctors).catch(() => {}).finally(() => setFetching(false)); }, []);

  const book = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    try {
      await apiFetch("/api/patient/appointments", { method: "POST", body: JSON.stringify({ userId: user.id, doctorId: selectedDoctor, date: selectedDate, time: selectedTime, reason, type: "online" }) });
      toast.success("Appointment booked!");
      onNavigate("appointments");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); }
  };

  const selectedDoc = doctors.find(d => d.id === selectedDoctor);

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">Book Appointment</h2><p className="text-sm text-muted-foreground">Schedule a visit with your doctor</p></div>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Doctor</Label>
            {fetching ? <p className="text-sm text-muted-foreground">Loading doctors...</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.filter(d => d.status === "active").map(d => (
                  <button key={d.id} onClick={() => setSelectedDoctor(d.id)} className={cn("flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left", selectedDoctor === d.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-border hover:border-blue-200")}>
                    <Avatar className="w-10 h-10"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white text-xs font-semibold">{d.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                    <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.specialization} · रू {d.consultationFee}</p></div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedDoc && selectedDoc.scheduleSlots.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Time Slots</Label>
              <div className="flex flex-wrap gap-2">
                {selectedDoc.scheduleSlots.filter(s => s.status === "available").map(s => (
                  <button key={s.id} onClick={() => setSelectedTime(s.startTime)} className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", selectedTime === s.startTime ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border hover:border-blue-200")}>
                    {s.dayName} {s.startTime}-{s.endTime}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-sm font-medium">Preferred Date</Label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Time</Label>
              <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select time</option>
                <option>09:00 AM</option><option>09:30 AM</option><option>10:00 AM</option><option>10:30 AM</option>
                <option>11:00 AM</option><option>11:30 AM</option><option>02:00 PM</option><option>02:30 PM</option>
                <option>03:00 PM</option><option>03:30 PM</option><option>04:00 PM</option>
              </select>
            </div>
          </div>
          <div className="space-y-2"><Label className="text-sm font-medium">Reason</Label><textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your symptoms..." /></div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={book} disabled={loading || !selectedDoctor || !selectedDate || !selectedTime}>
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// VIEW: Appointments
// ============================================================================
function AppointmentsView({ user }: { user: PatientUser }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/appointments?userId=${user.id}`).then(setAppointments).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">My Appointments</h2><p className="text-sm text-muted-foreground">Your appointment history</p></div>
      {appointments.length === 0 ? <p className="text-sm text-muted-foreground">No appointments yet.</p> : (
        <div className="space-y-3">
          {appointments.map(a => (
            <Card key={a.id}><CardContent className="p-4 flex items-center gap-4">
              <Avatar className="w-10 h-10"><AvatarFallback className={cn("text-white text-xs font-semibold", a.status === "completed" ? "bg-gray-400" : a.status === "scheduled" ? "bg-blue-500" : "bg-emerald-500")}>{a.doctor.name.split(" ").slice(1).map(n => n[0]).join("")}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium">{a.doctor.name}</p><p className="text-xs text-muted-foreground">{a.doctor.specialization} · {a.type}</p></div>
              <div className="text-center shrink-0"><p className="text-sm font-medium">{new Date(a.date).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{a.time}</p></div>
              <Badge className={cn("text-[10px]", a.status === "completed" ? "bg-gray-100 text-gray-700" : a.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>{a.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Prescriptions
// ============================================================================
function PrescriptionsView({ user }: { user: PatientUser }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => { apiFetch(`/api/patient/prescriptions?userId=${user.id}`).then(setPrescriptions).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Prescriptions</h2><p className="text-sm text-muted-foreground">Your medications and dosage instructions</p></div>
      {prescriptions.length === 0 ? <p className="text-sm text-muted-foreground">No prescriptions yet.</p> : (
        <div className="space-y-4">
          {prescriptions.map(p => (
            <Card key={p.id}><CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-semibold">{p.code}</h3><Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge></div>
                  <p className="text-sm text-muted-foreground">{p.doctor.name} · {new Date(p.createdAt).toLocaleDateString()}</p>
                  {p.diagnosis && <p className="text-sm mt-1">Diagnosis: <span className="font-medium">{p.diagnosis}</span></p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>{expandedId === p.id ? "Less" : "Details"}</Button>
              </div>
              {expandedId === p.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {p.items.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                      <Pill className="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="flex-1"><p className="text-sm font-medium">{m.medicineName}</p><p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency} · {m.duration}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Medical Records
// ============================================================================
function MedicalRecordsView({ user }: { user: PatientUser }) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/profile?userId=${user.id}`).then(setProfile).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  const notes = profile?.clinicalNotes || [];
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Medical Records</h2><p className="text-sm text-muted-foreground">Your clinical notes and visit history</p></div>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">No medical records yet.</p> : (
        <div className="space-y-4">{notes.map(n => (
          <Card key={n.id}><CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold capitalize">{n.type} Note</h3><Badge variant="outline" className="text-[10px]">{n.type}</Badge></div>
              <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p>
              <p className="text-sm mt-2">{n.content}</p>
            </div>
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Lab Reports
// ============================================================================
function LabReportsView({ user }: { user: PatientUser }) {
  const [labData, setLabData] = useState<{ orders: LabOrder[]; tests: LabTest[] }>({ orders: [], tests: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/lab-reports?userId=${user.id}`).then(setLabData).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Lab Reports</h2><p className="text-sm text-muted-foreground">Your test results and reports</p></div>
      {labData.orders.length === 0 && labData.tests.length === 0 ? <p className="text-sm text-muted-foreground">No lab reports yet.</p> : (
        <div className="space-y-3">
          {labData.orders.map(l => (
            <Card key={l.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{l.orderNo}</p>
                <p className="text-xs text-muted-foreground">{l.items.map(i => i.test.name).join(", ")} · {new Date(l.orderedAt).toLocaleDateString()}</p>
              </div>
              <Badge className={cn("text-[10px]", l.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{l.status}</Badge>
            </CardContent></Card>
          ))}
          {labData.tests.map(t => (
            <Card key={t.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.testName}</p>
                <p className="text-xs text-muted-foreground">{t.testCode} · {new Date(t.orderedAt).toLocaleDateString()}</p>
              </div>
              <Badge className={cn("text-[10px]", t.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{t.status}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Documents
// ============================================================================
function DocumentsView({ user }: { user: PatientUser }) {
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchDocs = useCallback(() => { apiFetch(`/api/patient/documents?userId=${user.id}`).then(setDocs).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    try {
      await apiFetch("/api/patient/documents", { method: "POST", body: JSON.stringify({ userId: user.id, name: file.name, type: file.type.includes("pdf") ? "pdf" : "image", size: sizeStr }) });
      toast.success("Document uploaded");
      fetchDocs();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
  };

  const deleteDoc = async (id: string) => {
    try { await apiFetch(`/api/patient/documents?id=${id}`, { method: "DELETE" }); toast.success("Deleted"); fetchDocs(); } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Documents</h2><p className="text-sm text-muted-foreground">Upload & manage medical documents</p></div></div>
      <Card className="border-2 border-dashed border-blue-200 dark:border-blue-900"><CardContent className="p-8 text-center">
        <Upload className="w-10 h-10 text-blue-500 mx-auto mb-3" />
        <p className="text-sm font-medium mb-1">Upload your documents</p>
        <p className="text-xs text-muted-foreground mb-3">PDF, JPG, PNG up to 10MB</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm cursor-pointer"><Upload className="w-4 h-4" /> Browse Files<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={upload} /></label>
      </CardContent></Card>
      <div className="space-y-3">
        {docs.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="w-4 h-4 text-blue-600" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.size} · {new Date(d.uploadedAt).toLocaleDateString()}</p></div>
            <Button size="sm" variant="ghost" className="text-xs text-rose-600 gap-1" onClick={() => deleteDoc(d.id)}><Trash2 className="w-3 h-3" /> Delete</Button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Family Members
// ============================================================================
function FamilyView({ user }: { user: PatientUser }) {
  const [family, setFamily] = useState<{ id: string; name: string; phone: string | null; gender: string; patientCode: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");

  const fetchFamily = useCallback(() => { apiFetch(`/api/patient/family?userId=${user.id}`).then(setFamily).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);
  useEffect(() => { fetchFamily(); }, [fetchFamily]);

  const addMember = async () => {
    if (!name) { toast.error("Name required"); return; }
    try { await apiFetch("/api/patient/family", { method: "POST", body: JSON.stringify({ userId: user.id, name, phone, gender }) }); toast.success("Member added"); setName(""); setPhone(""); setShowForm(false); fetchFamily(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Family Members</h2><p className="text-sm text-muted-foreground">Manage profiles for your family</p></div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setShowForm(!showForm)}><UserPlus className="w-4 h-4" /> Add Member</Button></div>
      {showForm && (
        <Card><CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Gender</Label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
          </div>
          <div className="flex gap-2"><Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={addMember}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {family.map(f => (
          <Card key={f.id}><CardContent className="p-5 flex items-center gap-4">
            <Avatar className="w-12 h-12"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-600 text-white font-semibold">{f.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
            <div className="flex-1"><h3 className="font-semibold">{f.name}</h3><p className="text-xs text-muted-foreground">{f.patientCode} · {f.gender} {f.phone ? `· ${f.phone}` : ""}</p></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Notifications
// ============================================================================
function NotificationsView({ user }: { user: PatientUser }) {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/notifications?userId=${user.id}`).then(setNotifications).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  const markAllRead = async () => {
    try { await apiFetch("/api/patient/notifications", { method: "PUT", body: JSON.stringify({ userId: user.id }) }); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); } catch { /* */ }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Notifications</h2><p className="text-sm text-muted-foreground">Stay updated on your health</p></div>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button></div>
      {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications.</p> : (
        <div className="space-y-2">{notifications.map(n => (
          <div key={n.id} className={cn("flex items-start gap-3 p-4 rounded-lg border transition-colors", !n.read && "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50")}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", n.type === "reminder" ? "bg-blue-100" : n.type === "result" ? "bg-emerald-100" : "bg-gray-100")}>
              <Bell className={cn("w-4 h-4", n.type === "reminder" ? "text-blue-600" : n.type === "result" ? "text-emerald-600" : "text-gray-600")} />
            </div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground mt-0.5">{n.message}</p><p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p></div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
          </div>
        ))}</div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Reminders
// ============================================================================
function RemindersView({ user }: { user: PatientUser }) {
  const [reminders, setReminders] = useState<PatientReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("medication");

  const fetchReminders = useCallback(() => { apiFetch(`/api/patient/reminders?userId=${user.id}`).then(setReminders).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);
  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const addReminder = async () => {
    if (!title || !time) { toast.error("Fill all fields"); return; }
    try { await apiFetch("/api/patient/reminders", { method: "POST", body: JSON.stringify({ userId: user.id, title, time, type }) }); toast.success("Reminder added"); setTitle(""); setTime(""); setShowForm(false); fetchReminders(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const toggleReminder = async (r: PatientReminder) => {
    try { await apiFetch("/api/patient/reminders", { method: "PUT", body: JSON.stringify({ id: r.id, active: !r.active }) }); setReminders(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x)); } catch { /* */ }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Reminders</h2><p className="text-sm text-muted-foreground">Never miss medication or appointments</p></div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4" /> Add Reminder</Button></div>
      {showForm && (
        <Card><CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Reminder title" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Schedule</Label><Input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. Every day, 8:00 AM" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Type</Label><select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="medication">Medication</option><option value="appointment">Appointment</option><option value="health">Health</option></select></div>
          </div>
          <div className="flex gap-2"><Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={addReminder}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}
      <div className="space-y-3">
        {reminders.map(r => (
          <Card key={r.id}><CardContent className="p-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", r.type === "medication" ? "bg-blue-100" : r.type === "appointment" ? "bg-emerald-100" : "bg-purple-100")}>
              {r.type === "medication" ? <Pill className="w-5 h-5 text-blue-600" /> : r.type === "appointment" ? <Calendar className="w-5 h-5 text-emerald-600" /> : <Activity className="w-5 h-5 text-purple-600" />}
            </div>
            <div className="flex-1"><p className="text-sm font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.time}</p></div>
            <Button size="sm" variant={r.active ? "default" : "outline"} className="text-[10px] h-7" onClick={() => toggleReminder(r)}>{r.active ? "Active" : "Paused"}</Button>
          </CardContent></Card>
        ))}
        {reminders.length === 0 && <p className="text-sm text-muted-foreground">No reminders yet.</p>}
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Messages
// ============================================================================
function MessagesView({ user }: { user: PatientUser }) {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");

  useEffect(() => { apiFetch(`/api/patient/messages?userId=${user.id}`).then(setMessages).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  const send = async () => {
    if (!newMsg.trim()) return;
    try { await apiFetch("/api/patient/messages", { method: "POST", body: JSON.stringify({ userId: user.id, message: newMsg }) }); toast.success("Message sent"); setNewMsg(""); apiFetch(`/api/patient/messages?userId=${user.id}`).then(setMessages); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">Messages</h2><p className="text-sm text-muted-foreground">Communicate with your healthcare providers</p></div>
      <div className="space-y-2">
        {[...messages].reverse().map(m => (
          <Card key={m.id} className={cn("hover:shadow-sm transition-shadow", m.fromType === "patient" && "ml-8 border-blue-200 dark:border-blue-900/50")}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8"><AvatarFallback className={cn("text-white text-[10px] font-semibold", m.fromType === "patient" ? "bg-blue-500" : "bg-teal-600")}>{m.fromName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium">{m.fromName}</p><p className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</p></div>
                  <p className="text-sm mt-0.5">{m.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      </div>
      <div className="flex gap-2">
        <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && send()} />
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={send}>Send</Button>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW: Telehealth
// ============================================================================
function TelehealthView() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">Telehealth Consultations</h2><p className="text-sm text-muted-foreground">Consult doctors remotely via video call</p></div>
      <Card className="border-2 border-dashed border-blue-200 dark:border-blue-900"><CardContent className="p-8 text-center">
        <Video className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Start a Video Consultation</h3>
        <p className="text-sm text-muted-foreground mb-4">Connect with a doctor instantly or schedule a virtual visit</p>
        <div className="flex gap-3 justify-center">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Video className="w-4 h-4" /> Start Now</Button>
          <Button variant="outline" className="gap-2"><Calendar className="w-4 h-4" /> Schedule</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-5"><h3 className="font-semibold mb-2">How Telehealth Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">{[
          { icon: Calendar, title: "Book", desc: "Schedule a virtual consultation" },
          { icon: Video, title: "Connect", desc: "Join via secure video link" },
          { icon: ClipboardList, title: "Follow-up", desc: "Receive prescriptions & notes" },
        ].map((s, i) => (
          <div key={i} className="text-center"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2"><s.icon className="w-5 h-5 text-blue-600" /></div><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.desc}</p></div>
        ))}</div>
      </CardContent></Card>
    </div>
  );
}

// ============================================================================
// VIEW: Payments
// ============================================================================
function PaymentsView({ user }: { user: PatientUser }) {
  const [data, setData] = useState<{ payments: { id: string; amount: number; method: string; date: string; type: string }[]; invoices: Invoice[]; totalPaid: number; totalDue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/payments?userId=${user.id}`).then(setData).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">My Payments</h2><p className="text-sm text-muted-foreground">Payment history & receipts</p></div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">रू {data?.totalPaid?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Total Paid</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">रू {data?.totalDue?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{data?.payments?.length || 0}</p><p className="text-xs text-muted-foreground">Transactions</p></CardContent></Card>
      </div>
      <Card><CardContent className="p-5"><h3 className="font-semibold mb-4">Payment History</h3>
        <div className="space-y-3">{(data?.payments || []).map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium capitalize">{p.type}</p><p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()} · {p.method}</p></div>
            <p className="text-sm font-semibold">रू {p.amount.toLocaleString()}</p>
          </div>
        ))}{(data?.payments || []).length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}</div>
      </CardContent></Card>
    </div>
  );
}

// ============================================================================
// VIEW: Manage Payments
// ============================================================================
function ManagePaymentsView() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Manage Payments</h2><p className="text-sm text-muted-foreground">Manage your payment methods</p></div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Plus className="w-4 h-4" /> Add Payment Method</Button></div>
      <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Connect your eSewa, Khalti, or bank account to make payments.</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">{["eSewa", "Khalti", "Bank Transfer", "Cash"].map(m => (
          <div key={m} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer"><CreditCard className="w-5 h-5 text-blue-500" /><span className="text-sm font-medium">{m}</span></div>
        ))}</div>
      </CardContent></Card>
    </div>
  );
}

// ============================================================================
// VIEW: Activity Tracker
// ============================================================================
function ActivityView({ user }: { user: PatientUser }) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch(`/api/patient/profile?userId=${user.id}`).then(setProfile).catch(() => {}).finally(() => setLoading(false)); }, [user.id]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>;
  const activities = [
    ...(profile?.appointments || []).map(a => ({ action: "Appointment", detail: `${a.doctor.name} - ${a.status}`, date: new Date(a.date).toLocaleDateString(), icon: Calendar, color: "blue" })),
    ...(profile?.prescriptions || []).map(p => ({ action: "Prescription", detail: `${p.code} - ${p.diagnosis || "N/A"}`, date: new Date(p.createdAt).toLocaleDateString(), icon: Pill, color: "purple" })),
    ...(profile?.labOrders || []).map(l => ({ action: "Lab Report", detail: l.orderNo, date: new Date(l.orderedAt).toLocaleDateString(), icon: FlaskConical, color: "teal" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">Activity Tracker</h2><p className="text-sm text-muted-foreground">Your healthcare activity timeline</p></div>
      {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
        <div className="relative"><div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4">{activities.map((a, i) => (
            <div key={i} className="relative flex items-start gap-4 pl-2">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background", a.color === "blue" ? "bg-blue-100" : a.color === "purple" ? "bg-purple-100" : "bg-teal-100")}>
                <a.icon className={cn("w-4 h-4", a.color === "blue" ? "text-blue-600" : a.color === "purple" ? "text-purple-600" : "text-teal-600")} />
              </div>
              <div className="flex-1 pb-4"><p className="text-sm font-medium">{a.action}</p><p className="text-xs text-muted-foreground">{a.detail}</p><p className="text-[10px] text-muted-foreground/70 mt-1">{a.date}</p></div>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VIEW: Health Packages
// ============================================================================
function PackagesView() {
  const packages = [
    { id: "1", name: "Executive Health Check", price: 5500, description: "Complete body checkup with specialist consultation.", includes: ["CBC, LIPID, Thyroid, Sugar", "ECG & Chest X-Ray", "General Physician Consult"], popular: true },
    { id: "2", name: "Women's Wellness", price: 4200, description: "Comprehensive health package for women.", includes: ["CBC, Thyroid, Iron Studies", "Gynecologist Consult", "Ultrasound"], popular: false },
    { id: "3", name: "Cardiac Care", price: 7500, description: "Heart health screening package.", includes: ["ECG, Echo, TMT", "Lipid Profile", "Cardiologist Consult"], popular: false },
  ];
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold">Health Packages</h2><p className="text-sm text-muted-foreground">Comprehensive checkup packages at special rates</p></div>
      <div className="grid md:grid-cols-3 gap-4">{packages.map(p => (
        <Card key={p.id} className={cn("relative", p.popular && "border-2 border-blue-500")}>
          {p.popular && <Badge className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px]">Most Popular</Badge>}
          <CardContent className="p-5"><h3 className="font-bold text-lg mb-1">{p.name}</h3><p className="text-sm text-muted-foreground mb-3">{p.description}</p><p className="text-2xl font-bold text-blue-600 mb-4">रू {p.price.toLocaleString()}</p>
            <ul className="space-y-2 mb-4">{p.includes.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul>
            <Button className={cn("w-full", p.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "")}>Book Package</Button>
          </CardContent>
        </Card>
      ))}</div>
    </div>
  );
}

// ============================================================================
// VIEW: AI Features
// ============================================================================
function AiFeaturesView() {
  const features = [
    { icon: Sparkles, title: "AI Health Insights", desc: "Personalized health recommendations.", status: "Coming Soon" },
    { icon: Activity, title: "Symptom Checker", desc: "Describe symptoms for preliminary guidance.", status: "Coming Soon" },
    { icon: Pill, title: "Medication Interaction", desc: "Check drug interaction risks.", status: "Coming Soon" },
    { icon: Heart, title: "Risk Assessment", desc: "AI-powered health risk analysis.", status: "Coming Soon" },
  ];
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-xl font-bold">AI Health Assistant</h2><p className="text-sm text-muted-foreground">Smart healthcare features powered by AI</p></div>
      <div className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6">
        <div className="flex items-center gap-3 mb-3"><Sparkles className="w-8 h-8" /><div><h3 className="font-bold text-lg">AI-Powered Healthcare</h3><p className="text-white/80 text-sm">Smart insights coming soon</p></div></div>
        <p className="text-sm text-white/70">Our AI features will provide intelligent health recommendations, symptom analysis, and proactive health management.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{features.map((f, i) => (
        <Card key={i} className="opacity-80"><CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><f.icon className="w-5 h-5 text-purple-600" /></div><Badge variant="outline" className="text-[10px]">{f.status}</Badge></div>
          <h3 className="font-semibold mb-1">{f.title}</h3><p className="text-xs text-muted-foreground">{f.desc}</p>
        </CardContent></Card>
      ))}</div>
    </div>
  );
}