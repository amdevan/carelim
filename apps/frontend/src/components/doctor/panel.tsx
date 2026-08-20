"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  LayoutDashboard, User, CalendarClock, Users, FileText, Pill, FlaskConical,
  MessageSquare, BarChart3, Bell, Shield, Settings, ChevronLeft, ChevronRight,
  ChevronDown, Search, Menu, LogOut, Star, Video, Phone, ClipboardList,
  Upload, Download, Clock, Activity, Stethoscope,
  DollarSign, Calendar, Edit, Eye, Plus, MoreHorizontal,
  Send, CheckCircle2, XCircle, AlertTriangle, File, BookOpen, X,
  CalendarCheck, Mail, Award,
  Brain, FileCheck, Target, CircleDot, LayoutGrid,
} from "lucide-react";
import { formatRs, formatDate, formatDateTime, statusColors, statusLabel } from "@/lib/format";

// ============================================================================
// Types
// ============================================================================
type ViewKey =
  | "dashboard" | "profile" | "availability" | "appointments" | "requests"
  | "patients" | "patient-history" | "consultations" | "telehealth"
  | "clinical-notes" | "prescriptions" | "documents" | "lab-tests"
  | "lab-reports" | "diagnoses" | "treatment-plans" | "follow-ups"
  | "messages" | "consultation-history" | "analytics" | "notifications"
  | "account";

interface NavItem { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; group: string; badge?: string; }

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "profile", label: "My Profile", icon: User, group: "Professional" },
  { key: "availability", label: "Availability", icon: CalendarClock, group: "Professional" },
  { key: "appointments", label: "Appointments", icon: Calendar, group: "Clinical" },
  { key: "requests", label: "Appointment Requests", icon: AlertTriangle, group: "Clinical", badge: "3" },
  { key: "patients", label: "My Patients", icon: Users, group: "Clinical" },
  { key: "patient-history", label: "Patient History", icon: BookOpen, group: "Clinical" },
  { key: "consultations", label: "Start Consultation", icon: Stethoscope, group: "Consultation" },
  { key: "telehealth", label: "Telehealth", icon: Video, group: "Consultation" },
  { key: "clinical-notes", label: "Clinical Notes", icon: ClipboardList, group: "Documentation" },
  { key: "prescriptions", label: "Prescriptions", icon: Pill, group: "Documentation" },
  { key: "documents", label: "Medical Documents", icon: Upload, group: "Documentation" },
  { key: "lab-tests", label: "Request Lab Tests", icon: FlaskConical, group: "Diagnostics" },
  { key: "lab-reports", label: "Lab Reports", icon: FileCheck, group: "Diagnostics" },
  { key: "diagnoses", label: "Diagnoses", icon: Brain, group: "Treatment" },
  { key: "treatment-plans", label: "Treatment Plans", icon: Target, group: "Treatment" },
  { key: "follow-ups", label: "Follow-ups", icon: CalendarCheck, group: "Treatment" },
  { key: "messages", label: "Messages", icon: MessageSquare, group: "Communication", badge: "5" },
  { key: "consultation-history", label: "Consultation History", icon: Clock, group: "Records" },
  { key: "analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "System" },
  { key: "account", label: "Account & Security", icon: Shield, group: "System" },
];

const NAV_GROUPS = ["Overview", "Professional", "Clinical", "Consultation", "Documentation", "Diagnostics", "Treatment", "Communication", "Records", "Insights", "System"];

const VIEW_LABELS: Record<ViewKey, string> = {
  dashboard: "Dashboard", profile: "My Profile", availability: "Availability", appointments: "Appointments",
  requests: "Appointment Requests", patients: "My Patients", "patient-history": "Patient History",
  consultations: "Start Consultation", telehealth: "Telehealth", "clinical-notes": "Clinical Notes",
  prescriptions: "Prescriptions", documents: "Medical Documents", "lab-tests": "Request Lab Tests",
  "lab-reports": "Lab Reports", diagnoses: "Diagnoses", "treatment-plans": "Treatment Plans",
  "follow-ups": "Follow-ups", messages: "Messages", "consultation-history": "Consultation History",
  analytics: "Analytics", notifications: "Notifications", account: "Account & Security",
};

// ============================================================================
// Mock data
// ============================================================================
const DOCTOR = { id: "doc-1", name: "Dr. Aisha Sharma", email: "aisha.sharma@carelim.com", phone: "+977-9841234567", qualification: "MBBS, MD (Internal Medicine)", specialization: "Internal Medicine", department: "General Medicine", licenseNumber: "NMC-2024-1234", experience: 12, consultationFee: 1500, rating: 4.8, workingDays: "Mon,Tue,Wed,Thu,Fri", startTime: "09:00", endTime: "17:00", status: "active" };

const APPTS = [
  { id: "a1", time: "09:00", patient: "Ram Bahadur Thapa", code: "P-1001", status: "completed", type: "walk-in", reason: "Routine checkup", token: 1 },
  { id: "a2", time: "09:30", patient: "Sita Devi Poudel", code: "P-1002", status: "completed", type: "follow-up", reason: "Follow-up for diabetes", token: 2 },
  { id: "a3", time: "10:00", patient: "Hari Prasad Gurung", code: "P-1003", status: "in-consult", type: "walk-in", reason: "Chest pain", token: 3 },
  { id: "a4", time: "10:30", patient: "Gita Magar", code: "P-1004", status: "scheduled", type: "online", reason: "Consultation for headache", token: 4 },
  { id: "a5", time: "11:00", patient: "Krishna Bahadur Rai", code: "P-1005", status: "scheduled", type: "walk-in", reason: "Blood pressure monitoring", token: 5 },
  { id: "a6", time: "11:30", patient: "Laxmi Tamang", code: "P-1006", status: "scheduled", type: "video", reason: "Telehealth follow-up", token: 6 },
  { id: "a7", time: "14:00", patient: "Bikash Shrestha", code: "P-1007", status: "scheduled", type: "walk-in", reason: "Annual physical", token: 7 },
];

const REQUESTS = [
  { id: "r1", patient: "Nabin Adhikari", code: "P-1009", type: "video", date: "2026-08-12", time: "10:00", reason: "Post-surgery follow-up via telehealth", priority: "high" },
  { id: "r2", patient: "Sunita Bhandari", code: "P-1010", type: "walk-in", date: "2026-08-12", time: "11:00", reason: "Persistent cough and fever", priority: "normal" },
  { id: "r3", patient: "Deepak Lama", code: "P-1011", type: "walk-in", date: "2026-08-13", time: "09:30", reason: "Routine blood work review", priority: "low" },
];

const PATIENTS = [
  { id: "p1", name: "Ram Bahadur Thapa", code: "P-1001", age: 45, gender: "male", phone: "+977-9841111111", lastVisit: "2026-08-11", visits: 8, conditions: ["Hypertension", "Type 2 Diabetes"] },
  { id: "p2", name: "Sita Devi Poudel", code: "P-1002", age: 38, gender: "female", phone: "+977-9842222222", lastVisit: "2026-08-11", visits: 5, conditions: ["Type 2 Diabetes"] },
  { id: "p3", name: "Hari Prasad Gurung", code: "P-1003", age: 52, gender: "male", phone: "+977-9843333333", lastVisit: "2026-08-11", visits: 12, conditions: ["Coronary Artery Disease"] },
  { id: "p4", name: "Gita Magar", code: "P-1004", age: 29, gender: "female", phone: "+977-9844444444", lastVisit: "2026-08-05", visits: 3, conditions: ["Migraine"] },
  { id: "p5", name: "Krishna Bahadur Rai", code: "P-1005", age: 61, gender: "male", phone: "+977-9845555555", lastVisit: "2026-08-08", visits: 15, conditions: ["Hypertension", "CKD"] },
  { id: "p6", name: "Laxmi Tamang", code: "P-1006", age: 34, gender: "female", phone: "+977-9846666666", lastVisit: "2026-07-28", visits: 2, conditions: ["Hypothyroidism"] },
];

const NOTES = [
  { id: "cn1", patient: "Ram Bahadur Thapa", code: "P-1001", category: "SOAP", title: "Routine Follow-up - Hypertension", content: "BP 130/85 mmHg, HR 78 bpm. Well-controlled hypertension. Continue current medication.", createdAt: "2026-08-11T10:30:00Z" },
  { id: "cn2", patient: "Sita Devi Poudel", code: "P-1002", category: "SOAP", title: "Diabetes Management Review", content: "HbA1c 7.2%. Suboptimal glycemic control. Increase Metformin to 1000mg BD.", createdAt: "2026-08-11T09:45:00Z" },
  { id: "cn3", patient: "Hari Prasad Gurung", code: "P-1003", category: "Progress", title: "Chest Pain Evaluation", content: "Acute substernal chest pain. ECG normal sinus rhythm. Troponin pending. Cardiology referral.", createdAt: "2026-08-11T10:15:00Z" },
];

const PRESCRIPTIONS = [
  { id: "pr1", code: "RX-2026-001", patient: "Ram Bahadur Thapa", code_: "P-1001", diagnosis: "Essential Hypertension", status: "active", items: [{ medicine: "Amlodipine", dosage: "5mg", freq: "Once daily", duration: "3 months" }, { medicine: "Metformin", dosage: "500mg", freq: "Twice daily", duration: "3 months" }], createdAt: "2026-08-11" },
  { id: "pr2", code: "RX-2026-002", patient: "Sita Devi Poudel", code_: "P-1002", diagnosis: "Type 2 Diabetes", status: "active", items: [{ medicine: "Metformin", dosage: "1000mg", freq: "Twice daily", duration: "3 months" }], createdAt: "2026-08-11" },
  { id: "pr3", code: "RX-2026-003", patient: "Gita Magar", code_: "P-1004", diagnosis: "Migraine", status: "completed", items: [{ medicine: "Sumatriptan", dosage: "50mg", freq: "As needed", duration: "1 month" }], createdAt: "2026-08-05" },
];

const LAB_REPORTS = [
  { id: "lr1", patient: "Ram Bahadur Thapa", code: "P-1001", test: "Complete Blood Count", status: "completed", result: "WBC: 7.2, RBC: 4.8, Hb: 14.2", ordered: "2026-08-05", completed: "2026-08-06" },
  { id: "lr2", patient: "Sita Devi Poudel", code: "P-1002", test: "HbA1c", status: "completed", result: "HbA1c: 7.2% (Above target)", ordered: "2026-08-01", completed: "2026-08-02" },
  { id: "lr3", patient: "Hari Prasad Gurung", code: "P-1003", test: "Lipid Panel", status: "pending", result: null, ordered: "2026-08-11", completed: null },
  { id: "lr4", patient: "Krishna Bahadur Rai", code: "P-1005", test: "Renal Function Test", status: "completed", result: "Creatinine: 2.1 mg/dL (Elevated), GFR: 38", ordered: "2026-08-08", completed: "2026-08-09" },
];

const DIAGNOSES = [
  { id: "d1", patient: "Ram Bahadur Thapa", code: "P-1001", icd: "I10", diagnosis: "Essential Hypertension", status: "active", date: "2024-03-15" },
  { id: "d2", patient: "Ram Bahadur Thapa", code: "P-1001", icd: "E11.9", diagnosis: "Type 2 Diabetes Mellitus", status: "active", date: "2024-06-20" },
  { id: "d3", patient: "Sita Devi Poudel", code: "P-1002", icd: "E11.65", diagnosis: "Type 2 Diabetes with Hyperglycemia", status: "active", date: "2025-01-10" },
  { id: "d4", patient: "Hari Prasad Gurung", code: "P-1003", icd: "I25.1", diagnosis: "Atherosclerotic Heart Disease", status: "active", date: "2023-08-01" },
  { id: "d5", patient: "Gita Magar", code: "P-1004", icd: "G43.9", diagnosis: "Migraine, Unspecified", status: "active", date: "2025-11-20" },
];

const TREATMENT_PLANS = [
  { id: "tp1", patient: "Ram Bahadur Thapa", code: "P-1001", title: "Hypertension & Diabetes Management", goals: "Target BP < 130/80, HbA1c < 7%", meds: "Amlodipine 5mg, Metformin 500mg", lifestyle: "Low sodium diet, 30 min daily exercise", duration: "Ongoing", status: "active" },
  { id: "tp2", patient: "Hari Prasad Gurung", code: "P-1003", title: "Cardiac Rehabilitation Phase 1", goals: "Improve cardiac function", meds: "Aspirin 75mg, Atorvastatin 40mg", lifestyle: "Cardiac diet, supervised exercise", duration: "12 weeks", status: "active" },
];

const FOLLOWUPS = [
  { id: "fu1", patient: "Ram Bahadur Thapa", code: "P-1001", reason: "BP recheck & HbA1c", date: "2026-11-11", type: "in-person", status: "scheduled" },
  { id: "fu2", patient: "Sita Devi Poudel", code: "P-1002", reason: "Diabetes follow-up", date: "2026-09-15", type: "telehealth", status: "scheduled" },
  { id: "fu3", patient: "Krishna Bahadur Rai", code: "P-1005", reason: "Renal function monitoring", date: "2026-08-25", type: "in-person", status: "scheduled" },
];

const MESSAGES = [
  { id: "m1", from: "Sita Devi Poudel", msg: "Doctor, I've been experiencing dizziness since increasing Metformin. Should I continue?", time: "8:00 AM", read: false },
  { id: "m2", from: "Hari Prasad Gurung", msg: "Thank you for the cardiology referral. When should I schedule the echo?", time: "Yesterday", read: false },
  { id: "m3", from: "Nurse Priya", msg: "Room 3 patient ECG is ready for review", time: "10:10 AM", read: true },
  { id: "m4", from: "Lab Department", msg: "Krishna Bahadur Rai's Renal Function Test results are available", time: "Yesterday", read: true },
  { id: "m5", from: "Ram Bahadur Thapa", msg: "Can I get my prescription refilled for next month?", time: "7:45 AM", read: false },
];

const NOTIFICATIONS = [
  { id: "n1", title: "New appointment request", desc: "Nabin Adhikari requested a video consultation", type: "info", time: "30m ago" },
  { id: "n2", title: "Lab report ready", desc: "Krishna Bahadur Rai's Renal Function Test is ready", type: "success", time: "2h ago" },
  { id: "n3", title: "Patient message", desc: "Sita Devi Poudel sent a message about medication", type: "warn", time: "3h ago" },
  { id: "n4", title: "Upcoming follow-up", desc: "Follow-up with Ram Bahadur Thapa in 3 months", type: "info", time: "5h ago" },
  { id: "n5", title: "Schedule change", desc: "Tomorrow's 2:00 PM slot moved to 2:30 PM", type: "warn", time: "1d ago" },
];

const DOCUMENTS = [
  { id: "d1", name: "Lab_Report_Ram_Thapa.pdf", patient: "Ram Bahadur Thapa", type: "Lab Report", date: "2026-08-06", size: "245 KB" },
  { id: "d2", name: "ECG_Report_Hari_Gurung.pdf", patient: "Hari Prasad Gurung", type: "Diagnostic", date: "2026-08-11", size: "1.2 MB" },
  { id: "d3", name: "Prescription_Ram_Thapa.pdf", patient: "Ram Bahadur Thapa", type: "Prescription", date: "2026-08-11", size: "128 KB" },
];

const CONSULTATION_HISTORY = [
  { id: "ch1", patient: "Ram Bahadur Thapa", code: "P-1001", date: "2026-08-11", type: "Follow-up", diagnosis: "Hypertension - well controlled", duration: "15 min", status: "completed" },
  { id: "ch2", patient: "Sita Devi Poudel", code: "P-1002", date: "2026-08-11", type: "Follow-up", diagnosis: "Type 2 DM - suboptimal control", duration: "20 min", status: "completed" },
  { id: "ch3", patient: "Hari Prasad Gurung", code: "P-1003", date: "2026-08-11", type: "Walk-in", diagnosis: "Acute chest pain - workup in progress", duration: "30 min", status: "in-progress" },
  { id: "ch4", patient: "Gita Magar", code: "P-1004", date: "2026-08-05", type: "Walk-in", diagnosis: "Migraine - Sumatriptan prescribed", duration: "15 min", status: "completed" },
  { id: "ch5", patient: "Krishna Bahadur Rai", code: "P-1005", date: "2026-08-08", type: "Follow-up", diagnosis: "CKD Stage 3 - monitoring", duration: "25 min", status: "completed" },
];

// ============================================================================
// Login
// ============================================================================
function DoctorLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("aisha.sharma@carelim.com");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pw) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/doctor-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid credentials");
        return;
      }
      localStorage.setItem("doctor-user", JSON.stringify(data));
      toast.success("Signed in successfully");
      onLogin();
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-teal-950/30 dark:via-emerald-950/20 dark:to-cyan-950/30 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="shadow-xl border-border/60">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-8">
              <Image src="/images/carelim-os.png" alt="Carelim OS" width={160} height={40} className="h-10 w-auto mb-6" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-bold">Doctor Portal</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to access your practice</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@carelim.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter password" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Demo password: carelim123</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Sidebar
// ============================================================================
function DocSidebar({ collapsed, expandedGroups, toggleGroup, activeView, navigate }: { collapsed: boolean; expandedGroups: Set<string>; toggleGroup: (g: string) => void; activeView: ViewKey; navigate: (v: ViewKey) => void }) {
  return (
    <motion.aside animate={{ width: collapsed ? 76 : 264 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen z-30">
      <div className="flex items-center justify-center h-16 px-4 border-b border-sidebar-border bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20">
        <Image src="/images/carelim-os.png" alt="Carelim OS" width={160} height={40} className="h-9 w-auto object-contain" />
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2.5">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          if (!items.length) return null;
          const expanded = expandedGroups.has(group);
          return (
            <div key={group} className="mb-2">
              {!collapsed && (
                <button onClick={() => toggleGroup(group)} className="flex items-center justify-between w-full px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                  <span>{group}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
                </button>
              )}
              {(collapsed || expanded) && (
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = activeView === item.key;
                    const Icon = item.icon;
                    return (
                      <button key={item.key} onClick={() => navigate(item.key)} title={collapsed ? item.label : undefined} className={cn("group relative flex items-center gap-3 w-full rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200", active ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-md shadow-teal-600/20" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "justify-center")}>
                        <Icon className={cn("w-[18px] h-[18px] shrink-0", active && "scale-110")} />
                        {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                        {item.badge && !collapsed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );
}

// ============================================================================
// Header
// ============================================================================
function DocHeader({ view, toggleSidebar, openMobile, logout, notifications }: { view: ViewKey; toggleSidebar: () => void; openMobile: () => void; logout: () => void; notifications: typeof NOTIFICATIONS }) {
  const initials = DOCTOR.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const unread = notifications.filter((n) => n.type !== "success").length;
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-5">
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={openMobile}><Menu className="w-5 h-5" /></Button>
      <Button variant="ghost" size="icon" className="hidden md:flex shrink-0" onClick={toggleSidebar}><ChevronLeft className="w-[18px] h-[18px]" /></Button>
      <div className="hidden sm:flex flex-col leading-tight">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Doctor Portal</span><ChevronRight className="w-3 h-3" /><span className="text-foreground font-medium">{VIEW_LABELS[view]}</span></div>
        <p className="text-base font-semibold text-foreground">{VIEW_LABELS[view]}</p>
      </div>
      <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => window.location.href = "/"}>
        <LayoutGrid className="w-3 h-3" /> CMS
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell className="w-[18px] h-[18px]" />{unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background" />}</Button></PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-3 border-b"><p className="text-sm font-semibold">Notifications</p><Badge className="text-[9px] bg-rose-100 text-rose-700">{unread} new</Badge></div>
            <ScrollArea className="max-h-80">
              {notifications.map((n) => (
                <div key={n.id} className="flex gap-2.5 p-3 border-b last:border-0 hover:bg-accent/50 transition-colors">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", n.type === "info" ? "bg-teal-50 text-teal-600" : n.type === "warn" ? "bg-amber-50 text-amber-600" : n.type === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}><Bell className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground truncate">{n.desc}</p><p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p></div>
                </div>
              ))}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent transition-colors">
              <Avatar className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600"><AvatarFallback className="bg-transparent text-white text-xs font-semibold">{initials}</AvatarFallback></Avatar>
              <div className="hidden lg:flex flex-col leading-tight pr-1"><span className="text-xs font-semibold">{DOCTOR.name}</span><span className="text-[10px] text-muted-foreground">{DOCTOR.specialization}</span></div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel><div className="flex flex-col"><span className="text-sm font-semibold">{DOCTOR.name}</span><span className="text-[11px] text-muted-foreground">{DOCTOR.email}</span></div></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Profile")}><User className="w-4 h-4" /> My Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Settings")}><Settings className="w-4 h-4" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={logout}><LogOut className="w-4 h-4" /> Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ============================================================================
// VIEWS
// ============================================================================

function DashboardView() {
  const [dashData, setDashData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/doctor-dashboard")
      .then((r) => r.json())
      .then((data) => setDashData(data))
      .catch(() => setDashData(null));
  }, []);

  const kpis = (dashData as { kpis?: Record<string, number> } | null)?.kpis;
  const todayTotal = kpis?.todayPatients ?? APPTS.filter((a) => a.status !== "cancelled").length;
  const done = kpis?.inConsultation != null ? todayTotal - kpis.inConsultation : APPTS.filter((a) => a.status === "completed").length;
  const live = kpis?.inConsultation ?? APPTS.filter((a) => a.status === "in-consult").length;
  const pending = APPTS.filter((a) => a.status === "scheduled").length;
  const totalPatients = PATIENTS.length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h2 className="text-xl font-bold">{greeting}, Dr. Sharma</h2><p className="text-sm text-muted-foreground">Here is your practice overview for today</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Today's Appointments" value={todayTotal} icon={Calendar} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Completed" value={done} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="In Consultation" value={live} icon={Stethoscope} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Pending" value={pending} icon={Clock} accent="from-amber-500 to-orange-500" index={3} />
        <KpiCard label="Total Patients" value={totalPatients} icon={Users} accent="from-violet-500 to-purple-600" index={4} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-teal-600" /> Today&apos;s Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {APPTS.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="text-xs font-mono text-muted-foreground w-12">{a.time}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.patient}</p><p className="text-[11px] text-muted-foreground">{a.reason}</p></div>
                  <Badge className={cn("text-[9px]", statusColors[a.status])}>{statusLabel(a.status)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Pending Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {REQUESTS.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", r.priority === "high" ? "bg-rose-500" : r.priority === "normal" ? "bg-amber-500" : "bg-emerald-500")} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{r.patient}</p><p className="text-[11px] text-muted-foreground">{r.reason}</p></div>
                  <span className="text-[10px] text-muted-foreground">{r.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">My Profile</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-4"><AvatarFallback className="bg-transparent text-white text-2xl font-bold">AS</AvatarFallback></Avatar>
            <h3 className="text-lg font-bold">{DOCTOR.name}</h3>
            <p className="text-sm text-muted-foreground">{DOCTOR.specialization}</p>
            <p className="text-xs text-muted-foreground mt-1">{DOCTOR.department}</p>
            <div className="flex items-center gap-1 mt-2"><Star className="w-4 h-4 text-amber-500 fill-current" /><span className="text-sm font-semibold">{DOCTOR.rating}</span></div>
            <Separator className="my-4" />
            <div className="w-full space-y-3 text-left text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{DOCTOR.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{DOCTOR.phone}</div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-muted-foreground" />{DOCTOR.licenseNumber}</div>
            </div>
            <Button className="w-full mt-4 gap-1.5" variant="outline"><Edit className="w-4 h-4" /> Edit Profile</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Professional Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Qualification</Label><p className="text-sm font-medium mt-1">{DOCTOR.qualification}</p></div>
              <div><Label className="text-xs text-muted-foreground">Experience</Label><p className="text-sm font-medium mt-1">{DOCTOR.experience} years</p></div>
              <div><Label className="text-xs text-muted-foreground">Consultation Fee</Label><p className="text-sm font-medium mt-1">{formatRs(DOCTOR.consultationFee)}</p></div>
              <div><Label className="text-xs text-muted-foreground">Working Days</Label><p className="text-sm font-medium mt-1">{DOCTOR.workingDays}</p></div>
              <div><Label className="text-xs text-muted-foreground">Working Hours</Label><p className="text-sm font-medium mt-1">{DOCTOR.startTime} - {DOCTOR.endTime}</p></div>
              <div><Label className="text-xs text-muted-foreground">Status</Label><p className="text-sm font-medium mt-1 capitalize">{DOCTOR.status}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AvailabilityView() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const active = DOCTOR.workingDays.split(",");
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Availability Management</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Edit className="w-4 h-4" /> Edit Schedule</Button></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Weekly Schedule</CardTitle><CardDescription className="text-xs">Manage your availability for each day</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {days.map((day) => (
              <div key={day} className={cn("flex items-center justify-between p-3 rounded-xl border transition-colors", active.includes(day) ? "bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50" : "bg-muted/30")}>
                <div className="flex items-center gap-3"><Checkbox checked={active.includes(day)} /><span className="text-sm font-medium w-8">{day}</span></div>
                {active.includes(day) ? <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{DOCTOR.startTime} - {DOCTOR.endTime}</span> : <Badge className="text-[9px] bg-gray-100 text-gray-600">Off</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Slot Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label className="text-xs">Slot Duration</Label><Select defaultValue="15"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10 min</SelectItem><SelectItem value="15">15 min</SelectItem><SelectItem value="20">20 min</SelectItem><SelectItem value="30">30 min</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Max Patients Per Day</Label><Input type="number" defaultValue={20} className="h-9" /></div>
            <div className="space-y-2"><Label className="text-xs">Break Time</Label><div className="flex items-center gap-2"><Input type="time" defaultValue="12:00" className="h-9 flex-1" /><span className="text-muted-foreground text-xs">to</span><Input type="time" defaultValue="13:00" className="h-9 flex-1" /></div></div>
            <Separator />
            <div className="flex items-center justify-between"><span className="text-sm">Enable telehealth</span><Switch defaultChecked /></div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">Save Configuration</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AppointmentsView() {
  const [filter, setFilter] = useState("all");
  const [appts, setAppts] = useState(APPTS);

  useEffect(() => {
    const stored = localStorage.getItem("doctor-user");
    if (stored) {
      try {
        const { doctor } = JSON.parse(stored);
        if (doctor?.id) {
          fetch(`/api/appointments?doctorId=${doctor.id}`)
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data) && data.length > 0) {
                const mapped = data.map((a: Record<string, unknown>, i: number) => ({
                  id: a.id as string,
                  time: (a.time as string) || "09:00",
                  patient: (a.patient as Record<string, unknown>)?.name as string || "Unknown",
                  code: (a.patient as Record<string, unknown>)?.patientCode as string || "",
                  status: (a.status as string) || "scheduled",
                  type: (a.type as string) || "walk-in",
                  reason: (a.reason as string) || "",
                  token: (a.tokenNo as number) || i + 1,
                }));
                setAppts(mapped);
              }
            })
            .catch(() => {});
        }
      } catch { /* fallback to mock */ }
    }
  }, []);

  const list = filter === "all" ? appts : appts.filter((a) => a.status === filter);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Appointments</h2>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in-consult">In Consultation</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Time</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs hidden sm:table-cell">Type</TableHead><TableHead className="text-xs hidden md:table-cell">Reason</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.token}</TableCell>
                <TableCell className="text-xs">{a.time}</TableCell>
                <TableCell><p className="text-sm font-medium">{a.patient}</p><p className="text-[11px] text-muted-foreground">{a.code}</p></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge className="text-[9px] capitalize" variant="outline">{a.type}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{a.reason}</TableCell>
                <TableCell><Badge className={cn("text-[9px]", statusColors[a.status])}>{statusLabel(a.status)}</Badge></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="w-4 h-4" /> View</DropdownMenuItem>
                      {a.status === "scheduled" && <DropdownMenuItem><Stethoscope className="w-4 h-4" /> Start</DropdownMenuItem>}
                      <DropdownMenuItem><CalendarClock className="w-4 h-4" /> Reschedule</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function RequestsView() {
  const [reqs, setReqs] = useState(REQUESTS);
  const accept = (id: string) => { setReqs((p) => p.filter((r) => r.id !== id)); toast.success("Request accepted"); };
  const decline = (id: string) => { setReqs((p) => p.filter((r) => r.id !== id)); toast.info("Request declined"); };
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Appointment Requests</h2>
      {!reqs.length ? <EmptyState icon={Calendar} title="No pending requests" /> : reqs.map((r) => (
        <Card key={r.id}><CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full shrink-0", r.priority === "high" ? "bg-rose-500" : r.priority === "normal" ? "bg-amber-500" : "bg-emerald-500")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold">{r.patient}</p><Badge className="text-[9px]" variant="outline">{r.code}</Badge><Badge className={cn("text-[9px]", r.priority === "high" ? "bg-rose-100 text-rose-700" : r.priority === "normal" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{r.priority}</Badge></div>
              <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.date}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.time}</span><Badge className="text-[9px] capitalize" variant="outline">{r.type}</Badge></div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => accept(r.id)}><CheckCircle2 className="w-3.5 h-3.5" /> Accept</Button>
              <Button size="sm" variant="outline" className="gap-1 text-rose-600" onClick={() => decline(r.id)}><XCircle className="w-3.5 h-3.5" /> Decline</Button>
            </div>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function PatientsView() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState(PATIENTS);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: (p.name as string) || "Unknown",
            code: (p.patientCode as string) || "",
            age: (p.age as number) || 0,
            gender: (p.gender as string) || "unknown",
            phone: (p.phone as string) || "",
            lastVisit: p.createdAt ? new Date(p.createdAt as string).toISOString().split("T")[0] : "",
            visits: 1,
            conditions: [] as string[],
          }));
          setPatients(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const list = patients.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">My Patients</h2><span className="text-sm text-muted-foreground">{list.length} patients</span></div>
      <Card><CardContent className="p-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div></CardContent></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shrink-0"><AvatarFallback className="bg-transparent text-white text-xs font-bold">{p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.code} · {p.age}y · {p.gender}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">{p.conditions.map((c) => <Badge key={c} className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">{c}</Badge>)}</div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Last: {formatDate(p.lastVisit)} · {p.visits} visits</p>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function PatientHistoryView() {
  const [sel, setSel] = useState(PATIENTS[0]);
  const pNotes = NOTES.filter((n) => n.code === sel.code);
  const pRx = PRESCRIPTIONS.filter((p) => p.code_ === sel.code);
  const pDiag = DIAGNOSES.filter((d) => d.code === sel.code);
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Patient History</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Select Patient</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
            {PATIENTS.map((p) => (<button key={p.id} onClick={() => setSel(p)} className={cn("w-full text-left p-2 rounded-lg text-sm transition-colors", sel.id === p.id ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 font-medium" : "hover:bg-accent")}><p className="font-medium truncate">{p.name}</p><p className="text-[11px] text-muted-foreground">{p.code}</p></button>))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-teal-600" /> {sel.name}</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="diagnoses">
              <TabsList className="w-full sm:w-auto"><TabsTrigger value="diagnoses" className="text-xs">Diagnoses ({pDiag.length})</TabsTrigger><TabsTrigger value="notes" className="text-xs">Notes ({pNotes.length})</TabsTrigger><TabsTrigger value="rx" className="text-xs">Prescriptions ({pRx.length})</TabsTrigger></TabsList>
              <TabsContent value="diagnoses" className="mt-3">
                {!pDiag.length ? <EmptyState icon={Brain} title="No diagnoses" className="py-8" /> : pDiag.map((d) => (<div key={d.id} className="flex items-center justify-between p-3 rounded-xl border mb-2"><div><p className="text-sm font-medium">{d.diagnosis}</p><p className="text-[11px] text-muted-foreground">ICD: {d.icd} · {formatDate(d.date)}</p></div><Badge className="text-[9px]" variant="outline">{d.status}</Badge></div>))}
              </TabsContent>
              <TabsContent value="notes" className="mt-3">
                {!pNotes.length ? <EmptyState icon={ClipboardList} title="No notes" className="py-8" /> : pNotes.map((n) => (<div key={n.id} className="p-3 rounded-xl border mb-2"><div className="flex items-center gap-2 mb-1"><Badge className="text-[9px]">{n.category}</Badge><span className="text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</span></div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</p></div>))}
              </TabsContent>
              <TabsContent value="rx" className="mt-3">
                {!pRx.length ? <EmptyState icon={Pill} title="No prescriptions" className="py-8" /> : pRx.map((rx) => (<div key={rx.id} className="p-3 rounded-xl border mb-2"><div className="flex items-center justify-between mb-1"><Badge className="text-[9px]">{rx.code}</Badge><Badge className={cn("text-[9px]", rx.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>{rx.status}</Badge></div><p className="text-sm font-medium">{rx.diagnosis}</p><div className="mt-1 space-y-0.5">{rx.items.map((it, i) => <p key={i} className="text-xs text-muted-foreground">{it.medicine} — {it.dosage}, {it.freq} × {it.duration}</p>)}</div></div>))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConsultationsView() {
  const cur = APPTS.find((a) => a.status === "in-consult");
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Start Consultation</h2>
      {cur ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4 text-teal-600" /> Active Consultation</CardTitle><Badge className="bg-emerald-100 text-emerald-700 text-[9px] animate-pulse"><CircleDot className="w-3 h-3 mr-1" /> Live</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl">
                <Avatar className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600"><AvatarFallback className="bg-transparent text-white text-sm font-bold">{cur.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
                <div><p className="text-sm font-semibold">{cur.patient}</p><p className="text-[11px] text-muted-foreground">Token #{cur.token} · {cur.code} · {cur.reason}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label className="text-xs">Chief Complaint</Label><Textarea placeholder="Patient's chief complaint…" rows={2} /></div>
                <div className="space-y-2"><Label className="text-xs">Vitals</Label><div className="grid grid-cols-2 gap-2"><Input placeholder="BP" className="h-8 text-xs" /><Input placeholder="HR" className="h-8 text-xs" /><Input placeholder="Temp" className="h-8 text-xs" /><Input placeholder="SpO2" className="h-8 text-xs" /></div></div>
              </div>
              <div className="space-y-2"><Label className="text-xs">Clinical Notes</Label><Textarea placeholder="Enter consultation notes…" rows={4} /></div>
              <div className="flex gap-2">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><FileText className="w-4 h-4" /> Create Prescription</Button>
                <Button variant="outline" className="gap-1.5"><FlaskConical className="w-4 h-4" /> Order Lab Test</Button>
                <Button variant="outline" className="gap-1.5"><CheckCircle2 className="w-4 h-4" /> Complete</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: ClipboardList, label: "Clinical Note", desc: "SOAP note" },
                { icon: Pill, label: "Prescription", desc: "Digital Rx" },
                { icon: FlaskConical, label: "Lab Order", desc: "Request tests" },
                { icon: Brain, label: "Add Diagnosis", desc: "ICD coding" },
                { icon: Target, label: "Treatment Plan", desc: "Care plan" },
                { icon: CalendarCheck, label: "Schedule Follow-up", desc: "Next visit" },
                { icon: Upload, label: "Upload Document", desc: "Attach file" },
              ].map((a, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center shrink-0"><a.icon className="w-4 h-4 text-teal-600" /></div>
                  <div><p className="text-sm font-medium">{a.label}</p><p className="text-[10px] text-muted-foreground">{a.desc}</p></div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState icon={Stethoscope} title="No active consultation" description="Select a patient from appointments to start a consultation" />
      )}
    </div>
  );
}

function TelehealthView() {
  const sessions = [
    { id: "ts1", patient: "Laxmi Tamang", code: "P-1006", type: "video", scheduled: "11:30 AM", status: "scheduled", duration: "30 min" },
    { id: "ts2", patient: "Gita Magar", code: "P-1004", type: "video", scheduled: "Yesterday", status: "completed", duration: "20 min" },
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Telehealth</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Video className="w-4 h-4" /> Start Video Session</Button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Today's Sessions" value={2} icon={Video} accent="from-teal-500 to-cyan-600" index={0} />
        <KpiCard label="Completed" value={1} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Upcoming" value={1} icon={Clock} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Avg Duration" value="25 min" icon={Activity} accent="from-violet-500 to-purple-600" index={3} />
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Sessions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Scheduled</TableHead><TableHead className="text-xs">Duration</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><p className="text-sm font-medium">{s.patient}</p><p className="text-[11px] text-muted-foreground">{s.code}</p></TableCell>
                  <TableCell><Badge className="text-[9px] capitalize" variant="outline">{s.type}</Badge></TableCell>
                  <TableCell className="text-xs">{s.scheduled}</TableCell>
                  <TableCell className="text-xs">{s.duration}</TableCell>
                  <TableCell><Badge className={cn("text-[9px]", s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right">{s.status === "scheduled" ? <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1 text-xs"><Video className="w-3 h-3" /> Join</Button> : <Button size="sm" variant="outline" className="gap-1 text-xs"><Eye className="w-3 h-3" /> Review</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ClinicalNotesView() {
  const [notes, setNotes] = useState(NOTES);
  const [addOpen, setAddOpen] = useState(false);
  const [newNote, setNewNote] = useState({ category: "SOAP", title: "", content: "", patient: "" });
  const addNote = () => { if (!newNote.title || !newNote.patient) { toast.error("Fill required fields"); return; } setNotes((p) => [{ id: `cn${Date.now()}`, patient: newNote.patient, code: "P-NEW", category: newNote.category as typeof NOTES[0]["category"], title: newNote.title, content: newNote.content, createdAt: new Date().toISOString() }, ...p]); setAddOpen(false); setNewNote({ category: "SOAP", title: "", content: "", patient: "" }); toast.success("Note created"); };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Clinical Notes</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Note</Button></div>
      <div className="space-y-3">
        {notes.map((n) => (
          <Card key={n.id}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Badge className="text-[9px]">{n.category}</Badge><span className="text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</span><span className="text-[11px] text-muted-foreground">· {n.patient}</span></div>
            <p className="text-sm font-semibold">{n.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{n.content}</p>
          </CardContent></Card>
        ))}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Clinical Note</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs">Patient Name</Label><Input value={newNote.patient} onChange={(e) => setNewNote({ ...newNote, patient: e.target.value })} placeholder="Patient name" /></div>
              <div className="space-y-2"><Label className="text-xs">Category</Label><Select value={newNote.category} onValueChange={(v) => setNewNote({ ...newNote, category: v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SOAP">SOAP</SelectItem><SelectItem value="Progress">Progress</SelectItem><SelectItem value="Discharge">Discharge</SelectItem><SelectItem value="Referral">Referral</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Title</Label><Input value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} placeholder="Note title" /></div>
            <div className="space-y-2"><Label className="text-xs">Content</Label><Textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} placeholder="Clinical note content…" rows={5} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={addNote}>Save Note</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Prescriptions</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4" /> New Prescription</Button></div>
      <div className="space-y-3">
        {PRESCRIPTIONS.map((rx) => (
          <Card key={rx.id}><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Badge className="text-[9px]">{rx.code}</Badge><Badge className={cn("text-[9px]", rx.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>{rx.status}</Badge></div><span className="text-[11px] text-muted-foreground">{formatDate(rx.createdAt)}</span></div>
            <p className="text-sm font-semibold">{rx.patient} — {rx.diagnosis}</p>
            <div className="mt-2 space-y-1">{rx.items.map((it, i) => <p key={i} className="text-xs text-muted-foreground">• {it.medicine} {it.dosage}, {it.freq} × {it.duration}</p>)}</div>
            <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" className="gap-1 text-xs"><Eye className="w-3 h-3" /> View</Button><Button size="sm" variant="outline" className="gap-1 text-xs"><Download className="w-3 h-3" /> Print</Button></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function DocumentsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Medical Documents</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Upload className="w-4 h-4" /> Upload Document</Button></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs hidden sm:table-cell">Type</TableHead><TableHead className="text-xs hidden md:table-cell">Date</TableHead><TableHead className="text-xs hidden md:table-cell">Size</TableHead><TableHead className="text-xs text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {DOCUMENTS.map((d) => (
              <TableRow key={d.id}>
                <TableCell><div className="flex items-center gap-2"><File className="w-4 h-4 text-teal-600" /><span className="text-sm font-medium">{d.name}</span></div></TableCell>
                <TableCell className="text-xs">{d.patient}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge className="text-[9px]" variant="outline">{d.type}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs">{d.date}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.size}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Download className="w-3 h-3" /> Download</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function LabTestsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Request Lab Tests</h2>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">New Lab Order</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2"><Label className="text-xs">Patient</Label><Select><SelectTrigger className="h-9"><SelectValue placeholder="Select patient" /></SelectTrigger><SelectContent>{PATIENTS.map((p) => <SelectItem key={p.id} value={p.code}>{p.name} ({p.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Priority</Label><Select defaultValue="normal"><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="stat">STAT</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label className="text-xs">Tests to Order</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Complete Blood Count", "Lipid Panel", "HbA1c", "Thyroid Panel", "Liver Function Test", "Renal Function Test", "Urinalysis", "Blood Glucose", "Iron Studies"].map((t) => (
                <label key={t} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 cursor-pointer text-sm"><Checkbox />{t}</label>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label className="text-xs">Clinical Notes</Label><Textarea placeholder="Clinical indication for tests…" rows={2} /></div>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><FlaskConical className="w-4 h-4" /> Submit Order</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LabReportsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Lab Reports</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Test</TableHead><TableHead className="text-xs hidden sm:table-cell">Ordered</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs hidden md:table-cell">Result</TableHead><TableHead className="text-xs text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {LAB_REPORTS.map((r) => (
              <TableRow key={r.id}>
                <TableCell><p className="text-sm font-medium">{r.patient}</p><p className="text-[11px] text-muted-foreground">{r.code}</p></TableCell>
                <TableCell className="text-xs font-medium">{r.test}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{r.ordered}</TableCell>
                <TableCell><Badge className={cn("text-[9px]", r.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{r.status}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[250px] truncate">{r.result || "—"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Eye className="w-3 h-3" /> View</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function DiagnosesView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Diagnoses</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4" /> Add Diagnosis</Button></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Diagnosis</TableHead><TableHead className="text-xs hidden sm:table-cell">ICD Code</TableHead><TableHead className="text-xs hidden md:table-cell">Date</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {DIAGNOSES.map((d) => (
              <TableRow key={d.id}>
                <TableCell><p className="text-sm font-medium">{d.patient}</p><p className="text-[11px] text-muted-foreground">{d.code}</p></TableCell>
                <TableCell className="text-sm">{d.diagnosis}</TableCell>
                <TableCell className="hidden sm:table-cell"><Badge className="text-[9px] font-mono" variant="outline">{d.icd}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-xs">{formatDate(d.date)}</TableCell>
                <TableCell><Badge className="text-[9px]" variant="outline">{d.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function TreatmentPlansView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Treatment Plans</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4" /> New Plan</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TREATMENT_PLANS.map((tp) => (
          <Card key={tp.id}><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between"><Badge className="text-[9px]" variant="outline">{tp.code}</Badge><Badge className="text-[9px] bg-emerald-100 text-emerald-700">{tp.status}</Badge></div>
            <h3 className="text-sm font-semibold">{tp.title}</h3>
            <div className="space-y-2 text-xs">
              <div><span className="text-muted-foreground">Goals: </span>{tp.goals}</div>
              <div><span className="text-muted-foreground">Medications: </span>{tp.meds}</div>
              <div><span className="text-muted-foreground">Lifestyle: </span>{tp.lifestyle}</div>
              <div><span className="text-muted-foreground">Duration: </span>{tp.duration}</div>
            </div>
            <div className="flex gap-2"><Button size="sm" variant="outline" className="gap-1 text-xs"><Eye className="w-3 h-3" /> View</Button><Button size="sm" variant="outline" className="gap-1 text-xs"><Edit className="w-3 h-3" /> Edit</Button></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function FollowUpsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Follow-ups</h2><Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><CalendarCheck className="w-4 h-4" /> Schedule Follow-up</Button></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs">Reason</TableHead><TableHead className="text-xs hidden sm:table-cell">Date</TableHead><TableHead className="text-xs hidden md:table-cell">Type</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {FOLLOWUPS.map((f) => (
              <TableRow key={f.id}>
                <TableCell><p className="text-sm font-medium">{f.patient}</p><p className="text-[11px] text-muted-foreground">{f.code}</p></TableCell>
                <TableCell className="text-xs">{f.reason}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{formatDate(f.date)}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge className="text-[9px] capitalize" variant="outline">{f.type}</Badge></TableCell>
                <TableCell><Badge className="text-[9px] bg-amber-100 text-amber-700">{f.status}</Badge></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Phone className="w-3 h-3" /> Remind</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function MessagesView() {
  const [msgs, setMsgs] = useState(MESSAGES);
  const [reply, setReply] = useState("");
  const [selectedMsg, setSelectedMsg] = useState<typeof MESSAGES[0] | null>(null);
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Messages</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Inbox ({msgs.filter((m) => !m.read).length} unread)</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto p-2">
            {msgs.map((m) => (
              <button key={m.id} onClick={() => { setSelectedMsg(m); setMsgs((p) => p.map((x) => x.id === m.id ? { ...x, read: true } : x)); }} className={cn("w-full text-left p-2.5 rounded-lg transition-colors", selectedMsg?.id === m.id ? "bg-teal-50 dark:bg-teal-950/30" : "hover:bg-accent", !m.read && "bg-accent/50")}>
                <div className="flex items-center justify-between"><p className={cn("text-sm truncate", !m.read && "font-semibold")}>{m.from}</p><span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span></div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{m.msg}</p>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          {selectedMsg ? (
            <>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{selectedMsg.from}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-accent/30"><p className="text-sm">{selectedMsg.msg}</p><p className="text-[10px] text-muted-foreground mt-2">{selectedMsg.time}</p></div>
                <div className="flex gap-2"><Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply…" className="flex-1" /><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={() => { if (reply) { toast.success("Reply sent"); setReply(""); } }}><Send className="w-4 h-4" /></Button></div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-64 text-sm text-muted-foreground">Select a message to read</CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConsultationHistoryView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Consultation History</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Patient</TableHead><TableHead className="text-xs hidden sm:table-cell">Type</TableHead><TableHead className="text-xs">Diagnosis</TableHead><TableHead className="text-xs hidden md:table-cell">Duration</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {CONSULTATION_HISTORY.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{formatDate(c.date)}</TableCell>
                <TableCell><p className="text-sm font-medium">{c.patient}</p><p className="text-[11px] text-muted-foreground">{c.code}</p></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge className="text-[9px]" variant="outline">{c.type}</Badge></TableCell>
                <TableCell className="text-xs max-w-[250px] truncate">{c.diagnosis}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{c.duration}</TableCell>
                <TableCell><Badge className={cn("text-[9px]", c.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Professional Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Consultations" value={156} icon={Stethoscope} accent="from-teal-500 to-teal-600" trend="+12%" index={0} />
        <KpiCard label="Revenue (Month)" value={formatRs(234000)} icon={DollarSign} accent="from-emerald-500 to-emerald-600" trend="+8.4%" index={1} />
        <KpiCard label="Patient Satisfaction" value="4.8" icon={Star} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="Avg Wait Time" value="8 min" icon={Clock} accent="from-violet-500 to-purple-600" trendDown trend="-15%" index={3} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Consultation Trends</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Mon: 28", "Tue: 32", "Wed: 25", "Thu: 30", "Fri: 22"].map((d, i) => {
                const [day, count] = d.split(": ");
                const n = parseInt(count);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-8">{day}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${(n / 35) * 100}%` }} transition={{ duration: 0.5, delay: i * 0.1 }} className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" /></div>
                    <span className="text-xs font-medium w-6 text-right">{n}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Diagnoses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[{ name: "Hypertension", count: 45, pct: 29 }, { name: "Type 2 Diabetes", count: 32, pct: 21 }, { name: "Migraine", count: 18, pct: 12 }, { name: "CKD", count: 15, pct: 10 }, { name: "Heart Disease", count: 12, pct: 8 }].map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium flex-1">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{d.count}</span>
                  <div className="w-20 h-1.5 bg-muted/30 rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${d.pct}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotificationsView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Notifications</h2>
      <div className="space-y-2">
        {NOTIFICATIONS.map((n) => (
          <Card key={n.id}><CardContent className="p-4 flex items-start gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", n.type === "info" ? "bg-teal-50 text-teal-600" : n.type === "warn" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}><Bell className="w-4 h-4" /></div>
            <div className="flex-1"><p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p><p className="text-[10px] text-muted-foreground mt-1">{n.time}</p></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function AccountView() {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold">Account & Security</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Account Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label className="text-xs">Full Name</Label><Input defaultValue={DOCTOR.name} /></div>
            <div className="space-y-2"><Label className="text-xs">Email</Label><Input defaultValue={DOCTOR.email} type="email" /></div>
            <div className="space-y-2"><Label className="text-xs">Phone</Label><Input defaultValue={DOCTOR.phone} /></div>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Save Changes</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Security</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label className="text-xs">Current Password</Label><Input type="password" placeholder="Enter current password" /></div>
            <div className="space-y-2"><Label className="text-xs">New Password</Label><Input type="password" placeholder="Enter new password" /></div>
            <div className="space-y-2"><Label className="text-xs">Confirm Password</Label><Input type="password" placeholder="Confirm new password" /></div>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Update Password</Button>
            <Separator />
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Add an extra layer of security</p></div><Switch /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// View Renderer
// ============================================================================
function ViewRenderer({ view }: { view: ViewKey }) {
  switch (view) {
    case "dashboard": return <DashboardView />;
    case "profile": return <ProfileView />;
    case "availability": return <AvailabilityView />;
    case "appointments": return <AppointmentsView />;
    case "requests": return <RequestsView />;
    case "patients": return <PatientsView />;
    case "patient-history": return <PatientHistoryView />;
    case "consultations": return <ConsultationsView />;
    case "telehealth": return <TelehealthView />;
    case "clinical-notes": return <ClinicalNotesView />;
    case "prescriptions": return <PrescriptionsView />;
    case "documents": return <DocumentsView />;
    case "lab-tests": return <LabTestsView />;
    case "lab-reports": return <LabReportsView />;
    case "diagnoses": return <DiagnosesView />;
    case "treatment-plans": return <TreatmentPlansView />;
    case "follow-ups": return <FollowUpsView />;
    case "messages": return <MessagesView />;
    case "consultation-history": return <ConsultationHistoryView />;
    case "analytics": return <AnalyticsView />;
    case "notifications": return <NotificationsView />;
    case "account": return <AccountView />;
    default: return <DashboardView />;
  }
}

// ============================================================================
// Main Panel
// ============================================================================
export function DoctorPanel() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Overview", "Clinical", "Consultation", "Documentation", "Diagnostics", "Treatment", "Communication", "Records", "Insights", "System", "Professional"]));

  useEffect(() => {
    const stored = localStorage.getItem("doctor-user");
    if (stored) {
      setAuthed(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("doctor-user");
    setAuthed(false);
    toast.success("Signed out");
  }, []);

  const toggleGroup = (g: string) => { setExpandedGroups((p) => { const next = new Set(p); if (next.has(g)) next.delete(g); else next.add(g); return next; }); };
  const navigate = (v: ViewKey) => { setView(v); setMobileOpen(false); };

  if (!authed) return <DoctorLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen bg-background">
      <DocSidebar collapsed={sidebarCollapsed} expandedGroups={expandedGroups} toggleGroup={toggleGroup} activeView={view} navigate={navigate} />
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                <Image src="/images/carelim-os.png" alt="Carelim OS" width={120} height={32} className="h-7 w-auto" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></Button>
              </div>
              <DocSidebar collapsed={false} expandedGroups={expandedGroups} toggleGroup={toggleGroup} activeView={view} navigate={navigate} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0">
        <DocHeader view={view} toggleSidebar={() => setSidebarCollapsed((v) => !v)} openMobile={() => setMobileOpen(true)} logout={handleLogout} notifications={NOTIFICATIONS} />
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ViewRenderer view={view} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}