"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Upload, Palette, CreditCard, Bell, Network,
  Save, Plus, Check, Pencil, Trash2, Database, DownloadCloud, RotateCcw, HardDrive,
  Globe, Clock, FileText, KeyRound, Shield, Smartphone, Users, Eye,
  EyeOff, AlertTriangle, Fingerprint, Search, Download, Copy, Mail, MessageSquare,
  Link2, Code, LayoutGrid, Smile, Stethoscope, FlaskConical, Receipt, BarChart3, Settings as SettingsIcon,
  ClipboardList, Heart, Boxes, Pill, Printer, Brain, ReceiptText, FileSignature, Hash, Loader2,
} from "lucide-react";
import { statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";

type SettingsMap = Record<string, string>;

const defaultSettings: SettingsMap = {
  clinic_name: "",
  clinic_phone: "",
  clinic_email: "",
  clinic_address: "",
  clinic_registration_no: "",
  clinic_tax_id: "",
  clinic_website: "",
  currency: "NPR",
  tax_rate: "13",
  timezone: "Asia/Kathmandu",
  language: "English",
  theme: "light",
  working_start: "09:00",
  working_end: "17:00",
  working_days: "Mon,Tue,Wed,Thu,Fri",
  default_slot_duration: "15",
  max_advance_booking: "30",
  auto_confirm_appointments: "false",
  allow_walk_in: "true",
  appointment_buffer: "5",
  fiscal_year_start: "2080-04-01",
  invoice_template: "standard",
  receipt_format: "thermal",
  show_logo_on_invoice: "true",
  show_tax_breakdown: "true",
  footer_text: "",
  default_payment_method: "cash",
  allow_partial_payment: "true",
  auto_generate_receipt: "true",
  payment_due_days: "30",
  appointment_reminder_hours: "24",
  reminder_method: "sms",
  notify_staff_on_booking: "true",
  notify_on_cancellation: "true",
  quiet_hours_start: "22:00",
  quiet_hours_end: "06:00",
  session_timeout: "30",
  require_2fa: "false",
  password_min_length: "8",
  password_require_uppercase: "true",
  password_require_number: "true",
  password_require_special: "false",
  max_login_attempts: "5",
  lockout_duration: "15",
  allow_api_access: "false",
  api_rate_limit: "100",
  backup_schedule: "daily",
  backup_time: "03:00",
  backup_retention_days: "30",
  auto_backup: "true",
  // Public Booking
  public_booking_enabled: "true",
  public_booking_slug: "",
  public_booking_title: "Book an Appointment",
  public_booking_subtitle: "Select a doctor and choose a convenient time slot",
  public_booking_show_fee: "true",
  public_booking_show_departments: "all",
  public_booking_allow_guest: "true",
  public_booking_require_phone: "true",
  public_booking_require_reason: "false",
  public_booking_max_days_ahead: "30",
  public_booking_confirmation_msg: "Your appointment has been booked successfully. You will receive a confirmation shortly.",
  public_booking_primary_color: "#0d9488",
  public_booking_logo_url: "",
  // Prescription Settings
  rx_print_size: "A4",
  rx_header_enabled: "true",
  rx_header_text: "",
  rx_footer_enabled: "true",
  rx_footer_text: "This is a computer-generated prescription. Please verify before use.",
  rx_default_notes: "",
  rx_template: "standard",
  rx_show_logo: "true",
  rx_show_qr: "true",
  rx_show_barcode: "true",
  rx_show_signature: "true",
  rx_font_size: "medium",
  rx_auto_numbering: "true",
  rx_number_prefix: "RX",
  rx_ai_features: "true",
  rx_watermark: "",
  rx_disclaimer: "",
  rx_validity_days: "30",
  // Billing Settings
  billing_print_size: "A4",
  billing_header_enabled: "true",
  billing_header_text: "",
  billing_footer_enabled: "true",
  billing_footer_text: "",
  billing_notes: "",
  billing_terms_conditions: "",
  billing_invoice_number_prefix: "INV",
  billing_receipt_number_prefix: "RCP",
  billing_show_tax_number: "true",
  billing_show_discount: "true",
  billing_show_subtotal: "true",
  billing_show_signature: "true",
  billing_show_logo: "true",
  billing_show_patient_id: "true",
  billing_watermark: "",
  billing_default_payment_terms: "Net 30",
  billing_late_fee: "0",
  billing_credit_note_prefix: "CN",
  billing_email_subject_template: "Invoice {invoice_no} from {clinic_name}",
  billing_receipt_template: "standard",
  billing_font_size: "medium",
};

const colorSwatches = [
  { name: "Teal", value: "#0d9488" },
  { name: "Emerald", value: "#10b981" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
];

const PAYMENT_GATEWAYS = [
  { key: "esewa", name: "eSewa", desc: "Popular Nepali digital wallet", fields: ["merchant_id", "secret_key"] },
  { key: "khalti", name: "Khalti", desc: "Nepali payment gateway & wallet", fields: ["public_key", "secret_key"] },
  { key: "fonepay", name: "FonePay", desc: "Nepal Clearing House network", fields: ["merchant_id", "terminal_id"] },
  { key: "stripe", name: "Stripe", desc: "International card payments", fields: ["publishable_key", "secret_key", "webhook_secret"] },
  { key: "paypal", name: "PayPal", desc: "Global online payments", fields: ["client_id", "client_secret"] },
  { key: "bank_transfer", name: "Bank Transfer", desc: "Direct bank deposit", fields: ["bank_name", "account_number", "routing_number"] },
];

const NOTIFICATION_CHANNELS = [
  { key: "email", label: "Email Notifications", desc: "Receive invoices, reports & alerts via email", icon: Mail },
  { key: "sms", label: "SMS Notifications", desc: "Appointment reminders & OTPs via SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", desc: "Send appointment updates through WhatsApp", icon: MessageSquare },
  { key: "push", label: "Push Notifications", desc: "Browser & mobile push alerts", icon: Bell },
  { key: "inapp", label: "In-App Notifications", desc: "Show notifications inside the application", icon: Bell },
];

const PERMISSION_MODULES = ["Dashboard", "Patient", "Doctor", "Appointment", "Prescription", "EMR", "Pharmacy", "Laboratory", "Radiology", "Billing", "Inventory", "Reports", "HR", "Settings", "Audit"];
const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "print", "export", "approve", "reject"];

interface RolePermission { id: string; module: string; action: string; }
interface Role { id: string; name: string; description: string | null; isSystem: boolean; createdAt: string; _count: { users: number; permissions: number }; }
interface RolesData { roles: Role[]; permissions: RolePermission[]; }
interface Branch { id: string; name: string; code: string; address: string | null; phone: string | null; email: string | null; manager: string | null; clinicType: string; status: string; createdAt: string; }
interface AuditLog { id: string; user: string; action: string; module: string; detail: string; createdAt: string; ip?: string; }

const WORKING_DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INVOICE_TEMPLATES = [
  { key: "standard", name: "Standard", desc: "Clean professional layout" },
  { key: "compact", name: "Compact", desc: "Minimal space, thermal printer friendly" },
  { key: "detailed", name: "Detailed", desc: "Full breakdown with terms & conditions" },
];
const recentBackups = [
  { name: "backup_2025-01-15_03-00.sql", size: "4.2 MB", date: "Jan 15, 2025 03:00", status: "success" },
  { name: "backup_2025-01-14_03-00.sql", size: "4.1 MB", date: "Jan 14, 2025 03:00", status: "success" },
  { name: "backup_2025-01-13_03-00.sql", size: "4.1 MB", date: "Jan 13, 2025 03:00", status: "success" },
  { name: "backup_2025-01-12_03-00.sql", size: "4.0 MB", date: "Jan 12, 2025 03:00", status: "failed" },
];

export function SettingsView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const { data, loading } = useFetch<SettingsMap>(refreshKey ? `/api/settings?_r=${refreshKey}` : "/api/settings");
  const [form, setForm] = useState<SettingsMap>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm({ ...defaultSettings, ...data }); }, [data]);

  const putSettings = async (partial: SettingsMap, successMsg: string) => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partial) });
      if (!res.ok) throw new Error("Failed");
      toast.success(successMsg);
      refresh();
    } catch { toast.error("Failed to save settings"); } finally { setSaving(false); }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground">Configure clinic, branding, payments, security & system</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setForm({ ...defaultSettings, ...data }); toast.info("Form reset to saved values"); }}>
          <RotateCcw className="w-4 h-4" /> Reset All
        </Button>
      </motion.div>

      <Tabs defaultValue="clinic" orientation="vertical" className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-56 w-full shrink-0">
          <div className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">General</p>
            <TabsList className="lg:flex-col lg:h-fit lg:justify-start lg:items-stretch w-full overflow-x-auto lg:overflow-visible gap-0.5 h-auto p-0 bg-transparent">
              <TabsTrigger value="clinic" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Building2 className="w-4 h-4" /> Clinic</TabsTrigger>
              <TabsTrigger value="branding" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Palette className="w-4 h-4" /> Branding</TabsTrigger>
              <p className="px-2 py-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">System</p>
              <TabsTrigger value="payments" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><CreditCard className="w-4 h-4" /> Payments</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
              <TabsTrigger value="public-booking" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Link2 className="w-4 h-4" /> Public Booking</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Shield className="w-4 h-4" /> Security</TabsTrigger>
              <p className="px-2 py-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">Administration</p>
              <TabsTrigger value="roles" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Users className="w-4 h-4" /> Users</TabsTrigger>
              <TabsTrigger value="branches" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Network className="w-4 h-4" /> Branches</TabsTrigger>
              <TabsTrigger value="modules" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><LayoutGrid className="w-4 h-4" /> Modules</TabsTrigger>
              <TabsTrigger value="prescription" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Pill className="w-4 h-4" /> Prescription</TabsTrigger>
              <TabsTrigger value="billing-settings" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><ReceiptText className="w-4 h-4" /> Billing</TabsTrigger>
              <TabsTrigger value="dental-config" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Smile className="w-4 h-4" /> Dental Config</TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Eye className="w-4 h-4" /> Audit Logs</TabsTrigger>
              <TabsTrigger value="backup" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"><Database className="w-4 h-4" /> Backup</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <TabsContent value="clinic" className="mt-0">
            <ClinicTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Clinic settings saved")} />
          </TabsContent>
          <TabsContent value="branding" className="mt-0">
            <BrandingTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Branding settings saved")} />
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <PaymentsTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Payment settings saved")} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
            <NotificationsTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Notification settings saved")} />
          </TabsContent>
          <TabsContent value="public-booking" className="mt-0">
            <PublicBookingTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Public booking settings saved")} />
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <SecurityTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Security settings saved")} />
          </TabsContent>
          <TabsContent value="roles" className="mt-0">
            <RolesTab refreshKey={refreshKey} refresh={refresh} />
          </TabsContent>
          <TabsContent value="branches" className="mt-0">
            <BranchesTab refreshKey={refreshKey} refresh={refresh} />
          </TabsContent>
          <TabsContent value="audit" className="mt-0">
            <AuditLogsTab />
          </TabsContent>
          <TabsContent value="modules" className="mt-0">
            <ModulesTab />
          </TabsContent>
          <TabsContent value="prescription" className="mt-0">
            <PrescriptionSettingsTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Prescription settings saved")} />
          </TabsContent>
          <TabsContent value="billing-settings" className="mt-0">
            <BillingSettingsTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Billing settings saved")} />
          </TabsContent>
          <TabsContent value="dental-config" className="mt-0">
            <DentalConfigTab />
          </TabsContent>
          <TabsContent value="backup" className="mt-0">
            <BackupTab form={form} updateForm={updateForm} saving={saving} onSave={(partial) => putSettings(partial, "Backup settings saved")} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============== Clinic Tab ==============
function ClinicTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [workingDays, setWorkingDays] = useState<string[]>(() => (form.working_days || "Mon,Tue,Wed,Thu,Fri").split(","));
  useEffect(() => { setWorkingDays((form.working_days || "Mon,Tue,Wed,Thu,Fri").split(",")); }, [form.working_days]);
  const toggleDay = (day: string) => {
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day];
    setWorkingDays(next); updateForm("working_days", next.join(","));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-teal-600" /> Clinic Information</CardTitle><CardDescription className="text-xs">Basic details about your clinic</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2"><Label>Clinic Name *</Label><Input value={form.clinic_name ?? ""} onChange={(e) => updateForm("clinic_name", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.clinic_phone ?? ""} onChange={(e) => updateForm("clinic_phone", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.clinic_email ?? ""} onChange={(e) => updateForm("clinic_email", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input value={form.clinic_address ?? ""} onChange={(e) => updateForm("clinic_address", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Registration No.</Label><Input value={form.clinic_registration_no ?? ""} onChange={(e) => updateForm("clinic_registration_no", e.target.value)} placeholder="e.g. REG-2024-001" /></div>
            <div className="space-y-1.5"><Label>Tax ID / PAN</Label><Input value={form.clinic_tax_id ?? ""} onChange={(e) => updateForm("clinic_tax_id", e.target.value)} placeholder="e.g. 123456789" /></div>
            <div className="space-y-1.5"><Label>Website</Label><Input value={form.clinic_website ?? ""} onChange={(e) => updateForm("clinic_website", e.target.value)} placeholder="https://your-clinic.com" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-teal-600" /> Localization</CardTitle><CardDescription className="text-xs">Currency, tax, timezone & language</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Currency</Label>
              <Select value={form.currency ?? "NPR"} onValueChange={(v) => updateForm("currency", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem><SelectItem value="USD">USD — US Dollar</SelectItem><SelectItem value="EUR">EUR — Euro</SelectItem><SelectItem value="INR">INR — Indian Rupee</SelectItem><SelectItem value="GBP">GBP — British Pound</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate ?? "0"} onChange={(e) => updateForm("tax_rate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Timezone</Label>
              <Select value={form.timezone ?? "Asia/Kathmandu"} onValueChange={(v) => updateForm("timezone", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="Asia/Kathmandu">Asia/Kathmandu (UTC+5:45)</SelectItem><SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</SelectItem><SelectItem value="UTC">UTC</SelectItem><SelectItem value="America/New_York">America/New_York</SelectItem><SelectItem value="Europe/London">Europe/London</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Language</Label>
              <Select value={form.language ?? "English"} onValueChange={(v) => updateForm("language", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="English">English</SelectItem><SelectItem value="Nepali">Nepali</SelectItem><SelectItem value="Hindi">Hindi</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Fiscal Year Start</Label><Input type="date" value={form.fiscal_year_start ?? ""} onChange={(e) => updateForm("fiscal_year_start", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" /> Working Hours</CardTitle><CardDescription className="text-xs">Set clinic operating hours and working days</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Opening Time</Label><Input type="time" value={form.working_start ?? "09:00"} onChange={(e) => updateForm("working_start", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Closing Time</Label><Input type="time" value={form.working_end ?? "17:00"} onChange={(e) => updateForm("working_end", e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {WORKING_DAY_OPTIONS.map((day) => (<button key={day} type="button" onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${workingDays.includes(day) ? "bg-teal-600 text-white border-teal-600" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}>{day}</button>))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" /> Appointment Defaults</CardTitle><CardDescription className="text-xs">Default settings for new appointments</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Default Slot Duration (min)</Label>
              <Select value={form.default_slot_duration ?? "15"} onValueChange={(v) => updateForm("default_slot_duration", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="10">10 min</SelectItem><SelectItem value="15">15 min</SelectItem><SelectItem value="20">20 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="45">45 min</SelectItem><SelectItem value="60">60 min</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Max Advance Booking (days)</Label><Input type="number" value={form.max_advance_booking ?? "30"} onChange={(e) => updateForm("max_advance_booking", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Buffer Between Appointments (min)</Label><Input type="number" value={form.appointment_buffer ?? "5"} onChange={(e) => updateForm("appointment_buffer", e.target.value)} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3 mt-auto"><div><p className="text-sm font-medium">Auto-Confirm Bookings</p><p className="text-[11px] text-muted-foreground">Skip manual confirmation</p></div><Switch checked={form.auto_confirm_appointments === "true"} onCheckedChange={(c) => updateForm("auto_confirm_appointments", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Allow Walk-in Patients</p><p className="text-[11px] text-muted-foreground">Enable walk-in appointments</p></div><Switch checked={form.allow_walk_in === "true"} onCheckedChange={(c) => updateForm("allow_walk_in", String(c))} /></div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button disabled={saving} onClick={() => onSave(form)} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save All Clinic Settings"}</Button></div>
    </div>
  );
}

// ============== Logo Upload Component ==============
function LogoUploadSetting({ logoUrl, onUploaded }: { logoUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("Invalid file type. Use PNG, JPG, WebP, SVG, or GIF"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("File too large. Max 2MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Upload failed"); return; }
      const data = await res.json();
      onUploaded(data.url);
      toast.success("Logo uploaded");
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Clinic Logo</Label>
      {logoUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <img src={logoUrl} alt="Logo preview" className="h-12 w-auto object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground truncate">{logoUrl}</p></div>
          <div className="flex gap-2">
            <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              <Button variant="outline" size="sm" type="button" disabled={uploading} className="gap-1.5"><Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Replace"}</Button>
            </label>
            <Button variant="ghost" size="sm" type="button" className="text-red-500 hover:text-red-600 gap-1.5" onClick={() => onUploaded("")}><Trash2 className="w-3.5 h-3.5" /> Remove</Button>
          </div>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragOver ? "border-teal-400 bg-teal-50/40" : "border-border hover:border-teal-400 hover:bg-teal-50/40"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} disabled={uploading} />
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600" /> : (<><Upload className="w-6 h-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click or drag to upload logo</span><span className="text-[11px] text-muted-foreground">PNG, JPG, WebP, SVG, GIF — max 2 MB</span></>)}
        </label>
      )}
    </div>
  );
}

// ============== Branding Tab ==============
function BrandingTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [primary, setPrimary] = useState(form.primary_color ?? "#0d9488");
  useEffect(() => { setPrimary(form.primary_color ?? "#0d9488"); }, [form.primary_color]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4 text-teal-600" /> Appearance</CardTitle><CardDescription className="text-xs">Logo, theme & accent color</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <LogoUploadSetting logoUrl={form.logo ?? ""} onUploaded={(url) => updateForm("logo", url)} />
          <Separator />
          <div className="space-y-2"><Label>Theme</Label>
            <Select value={form.theme ?? "light"} onValueChange={(v) => updateForm("theme", v)}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select>
          </div>
          <Separator />
          <div className="space-y-2"><Label>Primary Color</Label>
            <div className="flex flex-wrap items-center gap-3">
              {colorSwatches.map((c) => (<button key={c.value} onClick={() => { setPrimary(c.value); updateForm("primary_color", c.value); }} className={`relative w-9 h-9 rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-background transition-all ${primary === c.value ? "ring-foreground" : "ring-transparent hover:ring-muted-foreground/40"}`} style={{ background: c.value }} title={c.name}>{primary === c.value && <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />}</button>))}
            </div>
            <p className="text-[11px] text-muted-foreground">{colorSwatches.find((c) => c.value === primary)?.name ?? "Custom"} selected</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> Invoice & Receipt</CardTitle><CardDescription className="text-xs">Customize invoice templates and receipt format</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Invoice Template</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INVOICE_TEMPLATES.map((t) => (<button key={t.key} type="button" onClick={() => updateForm("invoice_template", t.key)} className={`rounded-xl border-2 p-3 text-left transition-all ${form.invoice_template === t.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20" : "border-border hover:border-teal-300"}`}>
                <p className="text-sm font-medium">{t.name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                {form.invoice_template === t.key && <Badge className="mt-2 bg-teal-600 text-white text-[9px]">Active</Badge>}
              </button>))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Receipt Format</Label>
              <Select value={form.receipt_format ?? "thermal"} onValueChange={(v) => updateForm("receipt_format", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="thermal">Thermal (58mm/80mm)</SelectItem><SelectItem value="a4">A4 Full Page</SelectItem><SelectItem value="half">Half Page</SelectItem><SelectItem value="digital">Digital Only (PDF)</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Payment Due (days)</Label><Input type="number" value={form.payment_due_days ?? "30"} onChange={(e) => updateForm("payment_due_days", e.target.value)} /></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Logo on Invoice</p><p className="text-[11px] text-muted-foreground">Display clinic logo on invoices</p></div><Switch checked={form.show_logo_on_invoice === "true"} onCheckedChange={(c) => updateForm("show_logo_on_invoice", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Tax Breakdown</p><p className="text-[11px] text-muted-foreground">Display itemized tax on invoices</p></div><Switch checked={form.show_tax_breakdown === "true"} onCheckedChange={(c) => updateForm("show_tax_breakdown", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Auto-Generate Receipt</p><p className="text-[11px] text-muted-foreground">Create receipt after payment</p></div><Switch checked={form.auto_generate_receipt === "true"} onCheckedChange={(c) => updateForm("auto_generate_receipt", String(c))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Invoice Footer Text</Label><Textarea value={form.footer_text ?? ""} onChange={(e) => updateForm("footer_text", e.target.value)} placeholder="Thank you for choosing our services" rows={2} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button disabled={saving} onClick={() => onSave({ theme: form.theme, primary_color: primary, invoice_template: form.invoice_template, receipt_format: form.receipt_format, show_logo_on_invoice: form.show_logo_on_invoice, show_tax_breakdown: form.show_tax_breakdown, auto_generate_receipt: form.auto_generate_receipt, footer_text: form.footer_text, payment_due_days: form.payment_due_days })} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Branding"}</Button></div>
    </div>
  );
}

// ============== Payments Tab ==============
function PaymentsTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => { const init: Record<string, boolean> = {}; PAYMENT_GATEWAYS.forEach((g) => { init[g.key] = form[`payment_${g.key}`] === "true"; }); return init; });
  const [configOpen, setConfigOpen] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  useEffect(() => { const init: Record<string, boolean> = {}; PAYMENT_GATEWAYS.forEach((g) => { init[g.key] = form[`payment_${g.key}`] === "true"; }); setEnabled(init); }, [form]);

  const toggle = (key: string, v: boolean) => setEnabled((s) => ({ ...s, [key]: v }));
  const openConfig = (gatewayKey: string) => { const gw = PAYMENT_GATEWAYS.find((g) => g.key === gatewayKey); if (!gw) return; const vals: Record<string, string> = {}; gw.fields.forEach((f) => { vals[f] = form[`gw_${gatewayKey}_${f}`] ?? ""; }); setConfigValues(vals); setConfigOpen(gatewayKey); };
  const saveConfig = () => { if (!configOpen) return; const payload: SettingsMap = {}; Object.entries(configValues).forEach(([k, v]) => { payload[`gw_${configOpen}_${k}`] = v; }); onSave(payload); setConfigOpen(null); };
  const save = () => { const payload: SettingsMap = {}; PAYMENT_GATEWAYS.forEach((g) => { payload[`payment_${g.key}`] = enabled[g.key] ? "true" : "false"; }); payload.default_payment_method = form.default_payment_method; payload.allow_partial_payment = form.allow_partial_payment; onSave(payload); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-600" /> Payment Gateways</CardTitle><CardDescription className="text-xs">Enable, configure and manage payment methods</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {PAYMENT_GATEWAYS.map((g) => (<div key={g.key} className="flex items-center justify-between rounded-lg border px-3 py-3">
            <div className="min-w-0"><p className="text-sm font-medium">{g.name}</p><p className="text-[11px] text-muted-foreground">{g.desc}</p></div>
            <div className="flex items-center gap-3 shrink-0"><Switch checked={!!enabled[g.key]} onCheckedChange={(c) => toggle(g.key, c)} /><Button variant="ghost" size="sm" className="text-teal-600" onClick={() => openConfig(g.key)}>Configure</Button></div>
          </div>))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Default Payment Settings</CardTitle><CardDescription className="text-xs">General payment behavior for all invoices</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Default Payment Method</Label>
              <Select value={form.default_payment_method ?? "cash"} onValueChange={(v) => updateForm("default_payment_method", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Payment Due (days)</Label><Input type="number" value={form.payment_due_days ?? "30"} onChange={(e) => updateForm("payment_due_days", e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Allow Partial Payments</p><p className="text-[11px] text-muted-foreground">Patients can pay in installments</p></div><Switch checked={form.allow_partial_payment === "true"} onCheckedChange={(c) => updateForm("allow_partial_payment", String(c))} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Auto-Generate Receipt</p><p className="text-[11px] text-muted-foreground">Create receipt automatically after payment</p></div><Switch checked={form.auto_generate_receipt === "true"} onCheckedChange={(c) => updateForm("auto_generate_receipt", String(c))} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button disabled={saving} onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Payment Settings"}</Button></div>
      <Dialog open={!!configOpen} onOpenChange={(o) => !o && setConfigOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Configure {PAYMENT_GATEWAYS.find((g) => g.key === configOpen)?.name}</DialogTitle><DialogDescription>Enter API credentials for this payment gateway</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {(PAYMENT_GATEWAYS.find((g) => g.key === configOpen)?.fields ?? []).map((field) => (<div key={field} className="space-y-1.5"><Label className="capitalize">{field.replace(/_/g, " ")}</Label><Input type="password" value={configValues[field] ?? ""} onChange={(e) => setConfigValues((v) => ({ ...v, [field]: e.target.value }))} placeholder={`Enter ${field.replace(/_/g, " ")}`} /></div>))}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Credentials are stored encrypted.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConfigOpen(null)}>Cancel</Button><Button onClick={saveConfig} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> Save Credentials</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== Notifications Tab ==============
function NotificationsTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => { const init: Record<string, boolean> = {}; NOTIFICATION_CHANNELS.forEach((n) => { init[n.key] = form[`notif_${n.key}`] === "true"; }); return init; });
  useEffect(() => { const init: Record<string, boolean> = {}; NOTIFICATION_CHANNELS.forEach((n) => { init[n.key] = form[`notif_${n.key}`] === "true"; }); setEnabled(init); }, [form]);
  const toggle = (key: string, v: boolean) => setEnabled((s) => ({ ...s, [key]: v }));
  const save = () => { const payload: SettingsMap = {}; NOTIFICATION_CHANNELS.forEach((n) => { payload[`notif_${n.key}`] = enabled[n.key] ? "true" : "false"; }); payload.appointment_reminder_hours = form.appointment_reminder_hours; payload.reminder_method = form.reminder_method; payload.notify_staff_on_booking = form.notify_staff_on_booking; payload.notify_on_cancellation = form.notify_on_cancellation; payload.quiet_hours_start = form.quiet_hours_start; payload.quiet_hours_end = form.quiet_hours_end; payload.smtp_host = form.smtp_host; payload.smtp_port = form.smtp_port; payload.smtp_username = form.smtp_username; payload.smtp_password = form.smtp_password; payload.smtp_from_email = form.smtp_from_email; payload.smtp_from_name = form.smtp_from_name; payload.sms_provider = form.sms_provider; payload.sms_api_key = form.sms_api_key; payload.sms_api_secret = form.sms_api_secret; payload.sms_sender_id = form.sms_sender_id; payload.sms_api_url = form.sms_api_url; onSave(payload); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-teal-600" /> Notification Channels</CardTitle><CardDescription className="text-xs">Choose how patients & staff get notified</CardDescription></CardHeader>
        <CardContent className="space-y-1">
          {NOTIFICATION_CHANNELS.map((n) => { const Icon = n.icon; return (<div key={n.key} className="flex items-center justify-between rounded-lg border px-3 py-3">
            <div className="flex items-center gap-3 min-w-0 pr-3"><div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-teal-600" /></div><div className="min-w-0"><p className="text-sm font-medium">{n.label}</p><p className="text-[11px] text-muted-foreground">{n.desc}</p></div></div>
            <Switch checked={!!enabled[n.key]} onCheckedChange={(c) => toggle(n.key, c)} />
          </div>); })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-teal-600" /> Email / SMTP Configuration
          </CardTitle>
          <CardDescription className="text-xs">Configure outgoing email server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>SMTP Host</Label><Input value={form.smtp_host ?? ""} onChange={(e) => updateForm("smtp_host", e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div className="space-y-1.5"><Label>SMTP Port</Label><Input value={form.smtp_port ?? "587"} onChange={(e) => updateForm("smtp_port", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>SMTP Username</Label><Input value={form.smtp_username ?? ""} onChange={(e) => updateForm("smtp_username", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>SMTP Password</Label><Input type="password" value={form.smtp_password ?? ""} onChange={(e) => updateForm("smtp_password", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>From Email</Label><Input type="email" value={form.smtp_from_email ?? ""} onChange={(e) => updateForm("smtp_from_email", e.target.value)} placeholder="noreply@your-clinic.com" /></div>
            <div className="space-y-1.5"><Label>From Name</Label><Input value={form.smtp_from_name ?? ""} onChange={(e) => updateForm("smtp_from_name", e.target.value)} placeholder="Your Clinic Name" /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-600" /> SMS Gateway Configuration
          </CardTitle>
          <CardDescription className="text-xs">Configure SMS provider for notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>SMS Provider</Label>
            <Select value={form.sms_provider ?? "twilio"} onValueChange={(v) => updateForm("sms_provider", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="nexmo">Nexmo / Vonage</SelectItem>
                <SelectItem value="msg91">MSG91</SelectItem>
                <SelectItem value="smsapi">SMS API</SelectItem>
                <SelectItem value="custom">Custom HTTP API</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>API Key / SID</Label><Input type="password" value={form.sms_api_key ?? ""} onChange={(e) => updateForm("sms_api_key", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>API Secret / Token</Label><Input type="password" value={form.sms_api_secret ?? ""} onChange={(e) => updateForm("sms_api_secret", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Sender ID / From Number</Label><Input value={form.sms_sender_id ?? ""} onChange={(e) => updateForm("sms_sender_id", e.target.value)} placeholder="+1234567890" /></div>
            <div className="space-y-1.5"><Label>API URL (for Custom)</Label><Input value={form.sms_api_url ?? ""} onChange={(e) => updateForm("sms_api_url", e.target.value)} placeholder="https://..." /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" /> Reminder Settings</CardTitle><CardDescription className="text-xs">Configure appointment reminders and quiet hours</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Reminder Before Appointment</Label>
              <Select value={form.appointment_reminder_hours ?? "24"} onValueChange={(v) => updateForm("appointment_reminder_hours", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="1">1 hour before</SelectItem><SelectItem value="2">2 hours before</SelectItem><SelectItem value="6">6 hours before</SelectItem><SelectItem value="12">12 hours before</SelectItem><SelectItem value="24">24 hours before</SelectItem><SelectItem value="48">48 hours before</SelectItem><SelectItem value="72">72 hours before</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Reminder Method</Label>
              <Select value={form.reminder_method ?? "sms"} onValueChange={(v) => updateForm("reminder_method", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="push">Push Notification</SelectItem></SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2"><Label>Quiet Hours</Label><p className="text-[11px] text-muted-foreground">No notifications during these hours</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Start</Label><Input type="time" value={form.quiet_hours_start ?? "22:00"} onChange={(e) => updateForm("quiet_hours_start", e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">End</Label><Input type="time" value={form.quiet_hours_end ?? "06:00"} onChange={(e) => updateForm("quiet_hours_end", e.target.value)} /></div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Notify Staff on New Booking</p><p className="text-[11px] text-muted-foreground">Send notification to staff on booking</p></div><Switch checked={form.notify_staff_on_booking === "true"} onCheckedChange={(c) => updateForm("notify_staff_on_booking", String(c))} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Notify on Cancellation</p><p className="text-[11px] text-muted-foreground">Alert staff on cancellation</p></div><Switch checked={form.notify_on_cancellation === "true"} onCheckedChange={(c) => updateForm("notify_on_cancellation", String(c))} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button disabled={saving} onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Notification Settings"}</Button></div>
    </div>
  );
}

// ============== Public Booking Tab ==============
function PublicBookingTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [copied, setCopied] = useState(false);
  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book${form.public_booking_slug ? `?slug=${form.public_booking_slug}` : ""}`
    : "/book";

  const embedCode = `<iframe src="${bookingUrl}" width="100%" height="800" frameborder="0" style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);" title="Book Appointment"></iframe>`;

  const widgetCode = `<!-- Booking Widget -->\n<div id="booking-widget"></div>\n<script src="${typeof window !== "undefined" ? window.location.origin : ""}/api/public/booking/widget.js" data-slug="${form.public_booking_slug || ""}" data-theme="${form.public_booking_primary_color || "#0d9488"}"></script>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const save = () => {
    const payload: SettingsMap = {};
    ["public_booking_enabled", "public_booking_slug", "public_booking_title", "public_booking_subtitle",
      "public_booking_show_fee", "public_booking_show_departments", "public_booking_allow_guest",
      "public_booking_require_phone", "public_booking_require_reason", "public_booking_max_days_ahead",
      "public_booking_confirmation_msg", "public_booking_primary_color", "public_booking_logo_url",
    ].forEach((k) => { payload[k] = form[k]; });
    onSave(payload);
  };

  return (
    <div className="space-y-4">
      {/* Enable / Status */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4 text-teal-600" /> Public Booking Link</CardTitle><CardDescription className="text-xs">Allow patients to book appointments from your website</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-3">
            <div><p className="text-sm font-medium">Enable Public Booking</p><p className="text-[11px] text-muted-foreground">Make booking page accessible to patients</p></div>
            <Switch checked={form.public_booking_enabled === "true"} onCheckedChange={(c) => updateForm("public_booking_enabled", String(c))} />
          </div>
          {form.public_booking_enabled === "true" && (
            <>
              <div className="space-y-1.5">
                <Label>Custom Slug (optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">/book/</span>
                  <Input value={form.public_booking_slug ?? ""} onChange={(e) => updateForm("public_booking_slug", e.target.value)} placeholder="my-clinic" className="flex-1" />
                </div>
                <p className="text-[11px] text-muted-foreground">Leave empty for default URL</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Booking URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-teal-600 break-all flex-1">{bookingUrl}</code>
                  <Button variant="outline" size="sm" className="h-7 gap-1 shrink-0" onClick={() => copyToClipboard(bookingUrl)}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {form.public_booking_enabled === "true" && (<>
        {/* Appearance */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4 text-teal-600" /> Appearance</CardTitle><CardDescription className="text-xs">Customize the look and feel of your booking page</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Page Title</Label><Input value={form.public_booking_title ?? ""} onChange={(e) => updateForm("public_booking_title", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Subtitle</Label><Input value={form.public_booking_subtitle ?? ""} onChange={(e) => updateForm("public_booking_subtitle", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Primary Color</Label>
              <div className="flex flex-wrap items-center gap-3">
                {["#0d9488","#7c3aed","#2563eb","#dc2626","#ea580c","#16a34a","#0891b2","#e11d48"].map((c) => (
                  <button key={c} type="button" onClick={() => updateForm("public_booking_primary_color", c)} className={`w-7 h-7 rounded-full border-2 transition-all ${(form.public_booking_primary_color || "#0d9488") === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Logo URL</Label><Input value={form.public_booking_logo_url ?? ""} onChange={(e) => updateForm("public_booking_logo_url", e.target.value)} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>Confirmation Message</Label><Textarea value={form.public_booking_confirmation_msg ?? ""} onChange={(e) => updateForm("public_booking_confirmation_msg", e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" /> Booking Behavior</CardTitle><CardDescription className="text-xs">Control what patients see and can do</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Max Days Ahead</Label><Input type="number" value={form.public_booking_max_days_ahead ?? "30"} onChange={(e) => updateForm("public_booking_max_days_ahead", e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Consultation Fee</p><p className="text-[11px] text-muted-foreground">Display doctor consultation fees on booking page</p></div><Switch checked={form.public_booking_show_fee === "true"} onCheckedChange={(c) => updateForm("public_booking_show_fee", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Allow Guest Booking</p><p className="text-[11px] text-muted-foreground">Patients can book without an account</p></div><Switch checked={form.public_booking_allow_guest === "true"} onCheckedChange={(c) => updateForm("public_booking_allow_guest", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Require Phone Number</p><p className="text-[11px] text-muted-foreground">Phone is mandatory for booking</p></div><Switch checked={form.public_booking_require_phone === "true"} onCheckedChange={(c) => updateForm("public_booking_require_phone", String(c))} /></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Reason Field</p><p className="text-[11px] text-muted-foreground">Let patients describe their symptoms</p></div><Switch checked={form.public_booking_require_reason === "true"} onCheckedChange={(c) => updateForm("public_booking_require_reason", String(c))} /></div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Code className="w-4 h-4 text-teal-600" /> Integrate with Website</CardTitle><CardDescription className="text-xs">Copy these codes to embed the booking page on your website</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Direct Link</Label><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => copyToClipboard(bookingUrl)}><Copy className="w-3 h-3" /> Copy</Button></div>
              <code className="block text-xs font-mono bg-muted p-3 rounded-lg break-all">{bookingUrl}</code>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Iframe Embed</Label><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => copyToClipboard(embedCode)}><Copy className="w-3 h-3" /> Copy</Button></div>
              <pre className="text-[11px] font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{embedCode}</pre>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>JavaScript Widget</Label><Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => copyToClipboard(widgetCode)}><Copy className="w-3 h-3" /> Copy</Button></div>
              <pre className="text-[11px] font-mono bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{widgetCode}</pre>
            </div>
            <p className="text-[11px] text-muted-foreground">The iframe method is the simplest. The JavaScript widget creates a floating booking button on your site.</p>
          </CardContent>
        </Card>
      </>)}

      <div className="flex justify-end"><Button disabled={saving} onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Public Booking Settings"}</Button></div>
    </div>
  );
}

// ============== Security Tab ==============
function SecurityTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKey = "cl_live_sk_" + "x".repeat(24);
  const save = () => { const payload: SettingsMap = {}; ["session_timeout", "require_2fa", "password_min_length", "password_require_uppercase", "password_require_number", "password_require_special", "max_login_attempts", "lockout_duration", "allow_api_access", "api_rate_limit"].forEach((k) => { payload[k] = form[k]; }); onSave(payload); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-teal-600" /> Authentication & Sessions</CardTitle><CardDescription className="text-xs">Control login behavior and session policies</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Session Timeout (minutes)</Label>
              <Select value={form.session_timeout ?? "30"} onValueChange={(v) => updateForm("session_timeout", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="480">8 hours</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Max Login Attempts</Label><Input type="number" value={form.max_login_attempts ?? "5"} onChange={(e) => updateForm("max_login_attempts", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Lockout Duration (minutes)</Label><Input type="number" value={form.lockout_duration ?? "15"} onChange={(e) => updateForm("lockout_duration", e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center"><Smartphone className="w-4 h-4 text-violet-600" /></div><div><p className="text-sm font-medium">Require Two-Factor Authentication</p><p className="text-[11px] text-muted-foreground">Enforce 2FA for all admin accounts</p></div></div>
            <Switch checked={form.require_2fa === "true"} onCheckedChange={(c) => updateForm("require_2fa", String(c))} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-600" /> Password Policy</CardTitle><CardDescription className="text-xs">Enforce password complexity requirements</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Minimum Password Length</Label>
            <div className="flex items-center gap-3"><Input type="range" min="6" max="24" value={form.password_min_length ?? "8"} onChange={(e) => updateForm("password_min_length", e.target.value)} className="flex-1" /><Badge variant="secondary" className="w-12 justify-center">{form.password_min_length ?? 8} chars</Badge></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Require Uppercase Letters</p><p className="text-[11px] text-muted-foreground">At least one uppercase letter (A-Z)</p></div><Switch checked={form.password_require_uppercase === "true"} onCheckedChange={(c) => updateForm("password_require_uppercase", String(c))} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Require Numbers</p><p className="text-[11px] text-muted-foreground">At least one number (0-9)</p></div><Switch checked={form.password_require_number === "true"} onCheckedChange={(c) => updateForm("password_require_number", String(c))} /></div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Require Special Characters</p><p className="text-[11px] text-muted-foreground">At least one special character</p></div><Switch checked={form.password_require_special === "true"} onCheckedChange={(c) => updateForm("password_require_special", String(c))} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Fingerprint className="w-4 h-4 text-teal-600" /> API Access</CardTitle><CardDescription className="text-xs">Manage API keys and rate limiting</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Enable API Access</p><p className="text-[11px] text-muted-foreground">Allow external apps to access data via API</p></div><Switch checked={form.allow_api_access === "true"} onCheckedChange={(c) => updateForm("allow_api_access", String(c))} /></div>
          {form.allow_api_access === "true" && (<>
            <div className="space-y-1.5"><Label>API Rate Limit (requests/min)</Label><Input type="number" value={form.api_rate_limit ?? "100"} onChange={(e) => updateForm("api_rate_limit", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>API Secret Key</Label>
              <div className="flex items-center gap-2">
                <Input type={showApiKey ? "text" : "password"} value={apiKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("API key copied"); }}><Copy className="w-4 h-4" /></Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Use this key in the Authorization header</p>
            </div>
          </>)}
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button disabled={saving} onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Security Settings"}</Button></div>
    </div>
  );
}

// ============== Roles Tab ==============
function RolesTab({ refreshKey, refresh }: { refreshKey: number; refresh: () => void }) {
  const { data, loading } = useFetch<RolesData>(refreshKey ? `/api/roles?_r=${refreshKey}` : "/api/roles");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [savingPerm, setSavingPerm] = useState(false);

  const permsByModule = permissions.reduce<Record<string, RolePermission[]>>((acc, p) => { if (!acc[p.module]) acc[p.module] = []; acc[p.module].push(p); return acc; }, {});
  const knownModules = Array.from(new Set([...PERMISSION_MODULES, ...Object.keys(permsByModule)]));

  useEffect(() => { if (roles.length && !selectedRoleId) { setSelectedRoleId(roles[0].id); } }, [roles, selectedRoleId]);
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/roles/${deleteRoleId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete role");
        return;
      }
      toast.success("Role deleted");
      setDeleteRoleId(null);
      if (selectedRoleId === deleteRoleId) setSelectedRoleId("");
      refresh();
    } catch {
      toast.error("Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const savePermissions = async (moduleId: string, action: string, granted: boolean) => {
    if (!selectedRole) return;
    setSavingPerm(true);
    try {
      const res = await fetchAPI(`/api/roles/${selectedRole.id}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module: moduleId, action, granted }) });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${moduleId} · ${action}: ${granted ? "granted" : "revoked"}`);
      refresh();
    } catch { toast.error("Failed to update permission"); } finally { setSavingPerm(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-teal-600" /> Role-Based Access Control</CardTitle><CardDescription className="text-xs">{roles.length} roles · {permissions.length} permissions defined</CardDescription></div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 self-start" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Role</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (<div className="flex flex-wrap gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}</div>) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (<div key={r.id} className="flex items-center gap-1"><button onClick={() => setSelectedRoleId(r.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedRoleId === r.id ? "bg-teal-600 text-white border-teal-600" : "bg-card hover:bg-accent/40 border-border"}`}>
              {r.name}<span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${selectedRoleId === r.id ? "bg-teal-700" : "bg-muted"}`}>{r._count.users} users</span>
            </button><button onClick={() => setDeleteRoleId(r.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete role"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>))}
          </div>
        )}
        {selectedRole ? (
          <div className="rounded-lg border overflow-x-auto">
            <Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="min-w-[140px]">Module</TableHead>{PERMISSION_ACTIONS.map((a) => (<TableHead key={a} className="text-center text-xs capitalize">{a}</TableHead>))}</TableRow></TableHeader>
              <TableBody>{knownModules.map((mod) => (<PermissionRow key={mod} module={mod} perms={permsByModule[mod] ?? []} role={selectedRole} disabled={savingPerm} onToggle={savePermissions} />))}</TableBody>
            </Table>
          </div>
        ) : (<Skeleton className="h-64 w-full" />)}
        {selectedRole && (<div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedRole.name}</span>
          {selectedRole.description && <span className="block mt-1">{selectedRole.description}</span>}
          <span className="block mt-1">{selectedRole._count.permissions} permissions · {selectedRole._count.users} assigned users</span>
        </div>)}
      </CardContent>
      <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} permissions={permissions} knownModules={knownModules} onSaved={() => { setAddOpen(false); refresh(); }} />
      <AlertDialog open={!!deleteRoleId} onOpenChange={(o) => { if (!o) setDeleteRoleId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this role? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PermissionRow({ module, perms, role, disabled, onToggle }: { module: string; perms: RolePermission[]; role: Role; disabled: boolean; onToggle: (moduleId: string, action: string, granted: boolean) => void }) {
  return (<TableRow className="hover:bg-accent/40">
    <TableCell className="font-medium text-sm">{module}</TableCell>
    {PERMISSION_ACTIONS.map((action) => {
      const on = perms.some((p) => p.action === action);
      return (<TableCell key={action} className="text-center"><div className="flex justify-center"><Switch defaultChecked={on} disabled={disabled} onCheckedChange={(c) => onToggle(module, action, c)} /></div></TableCell>);
    })}
  </TableRow>);
}

function AddRoleDialog({ open, onOpenChange, permissions, knownModules, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; permissions: RolePermission[]; knownModules: string[]; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) { setName(""); setDescription(""); setSelected({}); } }, [open]);
  const togglePerm = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleModule = (mod: string) => { const modulePerms = permissions.filter((p) => p.module === mod); const allOn = modulePerms.every((p) => selected[p.id]); const next = { ...selected }; modulePerms.forEach((p) => { next[p.id] = !allOn; }); setSelected(next); };

  const submit = async () => {
    if (!name.trim()) { toast.error("Role name is required"); return; }
    setSaving(true);
    try {
      const permIds = Object.keys(selected).filter((id) => selected[id]);
      const res = await fetchAPI("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim(), permissions: permIds }) });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Role "${name}" created`);
      onSaved();
    } catch { toast.error("Failed to create role"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Role</DialogTitle><DialogDescription>Define a new role and grant permissions</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Role Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Radiologist" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" /></div>
          <div className="space-y-2"><Label>Permissions ({Object.keys(selected).filter((k) => selected[k]).length} selected)</Label>
            <div className="rounded-lg border max-h-64 overflow-y-auto divide-y">
              {knownModules.map((mod) => { const modulePerms = permissions.filter((p) => p.module === mod); if (modulePerms.length === 0) return null; const allOn = modulePerms.every((p) => selected[p.id]); return (
                <div key={mod} className="p-3">
                  <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{mod}</span><Button size="sm" variant="ghost" className="h-6 text-[11px] text-teal-600" onClick={() => toggleModule(mod)}>{allOn ? "Clear all" : "Select all"}</Button></div>
                  <div className="grid grid-cols-2 gap-2">{modulePerms.map((p) => (<label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={!!selected[p.id]} onCheckedChange={() => togglePerm(p.id)} /><span className="capitalize">{p.action}</span></label>))}</div>
                </div>); })}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">{saving ? "Creating…" : "Create Role"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Branches Tab ==============
function BranchesTab({ refreshKey, refresh }: { refreshKey: number; refresh: () => void }) {
  const { data, loading } = useFetch<Branch[]>(refreshKey ? `/api/branches?_r=${refreshKey}` : "/api/branches");
  const [addOpen, setAddOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const branches = data ?? [];

  const handleDelete = async () => { if (!deleteBranch) return; try { const res = await fetchAPI(`/api/branches/${deleteBranch.id}`, { method: "DELETE" }); if (!res.ok) throw new Error("Failed"); toast.success(`Branch "${deleteBranch.name}" removed`); setDeleteBranch(null); refresh(); } catch { toast.error("Failed to delete branch"); } };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><CardTitle className="text-base flex items-center gap-2"><Network className="w-4 h-4 text-teal-600" /> Tenants / Branches</CardTitle><CardDescription className="text-xs">{branches.length} branches · multi-branch deployment</CardDescription></div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 self-start" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Branch</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg border overflow-hidden mx-6 mb-6">
          <Table>
            <TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead className="hidden sm:table-cell">Code</TableHead><TableHead className="hidden md:table-cell">Address</TableHead><TableHead className="hidden lg:table-cell">Phone</TableHead><TableHead className="hidden lg:table-cell">Manager</TableHead><TableHead className="hidden md:table-cell">Clinic Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? (Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))) : branches.length === 0 ? (<TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">No branches yet. Add your first branch.</TableCell></TableRow>) : (
                branches.map((b) => (<TableRow key={b.id} className="hover:bg-accent/40">
                  <TableCell className="font-medium text-sm">{b.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm font-mono">{b.code}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{b.address || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{b.phone || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{b.manager || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{b.clinicType || "General"}</Badge></TableCell>
                  <TableCell><Badge className={`text-[10px] ${statusColors[b.status] || "bg-gray-100 text-gray-700"}`}>{statusLabel(b.status)}</Badge></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600" onClick={() => setEditBranch(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setDeleteBranch(b)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div></TableCell>
                </TableRow>))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <BranchFormDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => { setAddOpen(false); refresh(); }} />
      {editBranch && (<BranchFormDialog open={!!editBranch} onOpenChange={(o) => !o && setEditBranch(null)} branch={editBranch} onSaved={() => { setEditBranch(null); refresh(); }} />)}

      <AlertDialog open={!!deleteBranch} onOpenChange={(o) => !o && setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete branch?</AlertDialogTitle><AlertDialogDescription>This will permanently delete <strong>{deleteBranch?.name}</strong> ({deleteBranch?.code}). This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function BranchFormDialog({ open, onOpenChange, branch, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; branch?: Branch | null; onSaved: () => void }) {
  const isEdit = !!branch;
  const [form, setForm] = useState({ name: branch?.name ?? "", code: branch?.code ?? "", address: branch?.address ?? "", phone: branch?.phone ?? "", email: branch?.email ?? "", manager: branch?.manager ?? "", clinicType: branch?.clinicType ?? "General", status: branch?.status ?? "active" });
  const [saving, setSaving] = useState(false);
  const branchId = branch?.id;
  const [lastBranchId, setLastBranchId] = useState<string | undefined>(branchId);
  if (branchId !== lastBranchId) { setLastBranchId(branchId); setForm({ name: branch?.name ?? "", code: branch?.code ?? "", address: branch?.address ?? "", phone: branch?.phone ?? "", email: branch?.email ?? "", manager: branch?.manager ?? "", clinicType: branch?.clinicType ?? "General", status: branch?.status ?? "active" }); }
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }
    setSaving(true);
    try {
      const res = isEdit ? await fetchAPI(`/api/branches/${branch!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }) : await fetchAPI("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      toast.success(isEdit ? "Branch updated" : "Branch added");
      onSaved();
    } catch { toast.error(isEdit ? "Failed to update branch" : "Failed to add branch"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Branch" : "Add Branch"}</DialogTitle><DialogDescription>{isEdit ? "Update branch information" : "Register a new clinic branch"}</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Branch Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Branch Name" /></div>
          <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="MC-BR2" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Patan, Lalitpur" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+977-1-XXXXXX" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="branch@your-clinic.com" /></div>
          <div className="space-y-1.5"><Label>Manager</Label><Input value={form.manager} onChange={(e) => set("manager", e.target.value)} placeholder="Branch manager name" /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Clinic Type</Label>
            <Select value={form.clinicType} onValueChange={(v) => set("clinicType", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Dental">Dental</SelectItem><SelectItem value="IVF">IVF</SelectItem></SelectContent></Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">{saving ? "Saving…" : isEdit ? "Update Branch" : "Add Branch"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Audit Logs Tab ==============
function AuditLogsTab() {
  const { data, loading } = useFetch<AuditLog[]>("/api/audit-logs");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const logs = data ?? [];
  const filtered = useMemo(() => { return logs.filter((log) => { if (actionFilter !== "all" && log.action !== actionFilter) return false; if (moduleFilter !== "all" && log.module !== moduleFilter) return false; if (searchQuery) { const q = searchQuery.toLowerCase(); return log.user.toLowerCase().includes(q) || log.detail.toLowerCase().includes(q) || log.module.toLowerCase().includes(q); } return true; }); }, [logs, actionFilter, moduleFilter, searchQuery]);

  const actionColors: Record<string, string> = { CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", LOGIN: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", EXPORT: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" };
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));
  const uniqueModules = Array.from(new Set(logs.map((l) => l.module)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> Audit Logs</CardTitle><CardDescription className="text-xs">{filtered.length} of {logs.length} entries</CardDescription></div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Exporting audit logs…")}><Download className="w-4 h-4" /> Export</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search logs…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" /></div>
            <Select value={actionFilter} onValueChange={setActionFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Action" /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{uniqueActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{uniqueModules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          {loading ? (<div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>) : filtered.length === 0 ? (<div className="text-center py-10"><Eye className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm text-muted-foreground">No audit logs found</p></div>) : (
            <div className="rounded-lg border divide-y max-h-96 overflow-y-auto">
              {filtered.map((log) => (<div key={log.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/30">
                <Badge className={`text-[9px] shrink-0 mt-0.5 ${actionColors[log.action] ?? "bg-muted text-muted-foreground"}`}>{log.action}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{log.detail}</p>
                  <p className="text-[11px] text-muted-foreground">{log.user} · {log.module} · {new Date(log.createdAt).toLocaleString()}{log.ip && <span className="ml-1">· {log.ip}</span>}</p>
                </div>
              </div>))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Backup Tab ==============
function BackupTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleBackup = async () => { setBackingUp(true); try { const res = await fetchAPI("/api/backup", { method: "POST" }); if (!res.ok) throw new Error("Failed"); toast.success("Backup created successfully"); } catch { toast.error("Failed to create backup"); } finally { setBackingUp(false); } };
  const handleRestore = async () => { setRestoring(true); try { const res = await fetchAPI("/api/backup/restore", { method: "POST" }); if (!res.ok) throw new Error("Failed"); toast.success("Database restored successfully"); } catch { toast.error("Failed to restore backup"); } finally { setRestoring(false); } };
  const saveSchedule = () => { onSave({ backup_schedule: form.backup_schedule, backup_time: form.backup_time, backup_retention_days: form.backup_retention_days, auto_backup: form.auto_backup }); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4 text-teal-600" /> Database Backup</CardTitle><CardDescription className="text-xs">Manual & scheduled backups of clinic data</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm"><DownloadCloud className="w-5 h-5 text-white" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Create Backup</p>
                  <p className="text-[11px] text-muted-foreground">Snapshot the database and export as downloadable file</p>
                  <Button size="sm" className="mt-3 bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={backingUp} onClick={handleBackup}><DownloadCloud className="w-3.5 h-3.5" /> {backingUp ? "Backing up…" : "Backup Now"}</Button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-sm"><RotateCcw className="w-5 h-5 text-white" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Restore Backup</p>
                  <p className="text-[11px] text-muted-foreground">Upload a previous backup file to restore clinic data</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" disabled={restoring} onClick={handleRestore}><RotateCcw className="w-3.5 h-3.5" /> {restoring ? "Restoring…" : "Restore"}</Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Backup Schedule</p><Badge variant="secondary" className="text-[10px] gap-1"><HardDrive className="w-3 h-3" /> Automated</Badge></div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Auto Backup</p><p className="text-[11px] text-muted-foreground">Automatically create backups on schedule</p></div><Switch checked={form.auto_backup === "true"} onCheckedChange={(c) => updateForm("auto_backup", String(c))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Frequency</Label>
                <Select value={form.backup_schedule ?? "daily"} onValueChange={(v) => updateForm("backup_schedule", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={form.backup_time ?? "03:00"} onChange={(e) => updateForm("backup_time", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Retention (days)</Label><Input type="number" value={form.backup_retention_days ?? "30"} onChange={(e) => updateForm("backup_retention_days", e.target.value)} /></div>
            </div>
          </div>

          <div className="flex justify-end"><Button disabled={saving} onClick={saveSchedule} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Schedule"}</Button></div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Backups</p>
            <div className="rounded-lg border divide-y">
              {recentBackups.map((b) => (<div key={b.name} className="flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-mono truncate">{b.name}</p><Badge variant="outline" className={`text-[9px] shrink-0 ${b.status === "success" ? "text-emerald-600" : "text-rose-600"}`}>{b.status}</Badge></div>
                  <p className="text-[11px] text-muted-foreground">{b.date}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{b.size}</Badge>
                  <Button variant="ghost" size="sm" className="text-teal-600 h-7" onClick={() => toast.info(`Downloading ${b.name}…`)}><DownloadCloud className="w-3.5 h-3.5" /></Button>
                </div>
              </div>))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Modules Tab ==============
const MODULE_CATEGORIES = [
  { label: "Clinical", modules: [
    { key: "emr", name: "EMR & Prescription", icon: FileText },
    { key: "appointments", name: "Appointments", icon: Clock },
    { key: "patients", name: "Patients", icon: Users },
    { key: "doctors", name: "Doctors", icon: Stethoscope },
    { key: "clinical-notes", name: "Clinical Notes", icon: ClipboardList },
  ]},
  { label: "Diagnostics", modules: [
    { key: "laboratory", name: "Laboratory (LIMS)", icon: FlaskConical },
    { key: "radiology", name: "Radiology (RIS)", icon: Globe },
  ]},
  { label: "Operations", modules: [
    { key: "pharmacy", name: "Pharmacy", icon: Pill },
    { key: "inventory", name: "Inventory", icon: Boxes },
  ]},
  { label: "Finance", modules: [
    { key: "billing", name: "Billing", icon: Receipt },
    { key: "accounting", name: "Accounting", icon: CreditCard },
    { key: "reports", name: "Reports", icon: BarChart3 },
    { key: "insurance", name: "Insurance Claims", icon: Shield },
  ]},
  { label: "Administration", modules: [
    { key: "hr", name: "HR & Staff", icon: Users },
    { key: "settings", name: "Settings", icon: SettingsIcon },
    { key: "audit", name: "Audit Log", icon: Eye },
  ]},
  { label: "Specialty", modules: [
    { key: "dental", name: "Dental Module", icon: Smile },
    { key: "ivf", name: "IVF Module", icon: Heart },
  ]},
];

function ModulesTab() {
  const { enabledModules } = useAppStore();
  const [modules, setModules] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    MODULE_CATEGORIES.forEach((c) => c.modules.forEach((m) => { map[m.key] = enabledModules.length === 0 || enabledModules.includes(m.key); }));
    return map;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setModules((m) => ({ ...m, [key]: !m[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const enabled = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);
      const res = await fetchAPI("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled_modules: enabled.join(",") }) });
      if (!res.ok) throw new Error("Failed");
      toast.success("Modules updated successfully");
    } catch { toast.error("Failed to save modules"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-teal-600" /> Platform Modules</CardTitle>
          <CardDescription>Enable or disable modules for your clinic. Changes apply to all branches.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {MODULE_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {cat.modules.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.key} onClick={() => toggle(m.key)} className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${modules[m.key] ? "border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30" : "border-border bg-muted/30 opacity-60"}`}>
                      <Icon className={`w-5 h-5 shrink-0 ${modules[m.key] ? "text-teal-600" : "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.name}</p></div>
                      <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${modules[m.key] ? "bg-teal-600 justify-end" : "bg-muted justify-start"}`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm mx-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Module Settings"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Dental Config Tab ==============
function DentalConfigTab() {
  const [form, setForm] = useState({
    numbering_system: "FDI",
    vat_rate: "13",
    auto_invoice: "true",
    auto_emr_append: "true",
    auto_deduct_inventory: "true",
    followup_channel: "all",
    lab_partner: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAPI("/api/dental/settings").then((r) => r.json()).then((data) => {
      if (data && typeof data === "object") setForm((f) => ({ ...f, ...data }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/dental/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error("Failed");
      toast.success("Dental settings saved");
    } catch { toast.error("Failed to save dental settings"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Smile className="w-5 h-5 text-teal-600" /> Dental Module Configuration</CardTitle>
          <CardDescription>Configure dental-specific preferences and integrations.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tooth Numbering System</Label>
              <Select value={form.numbering_system} onValueChange={(v) => setForm({ ...form, numbering_system: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FDI">FDI (International)</SelectItem>
                  <SelectItem value="Universal">Universal (US)</SelectItem>
                  <SelectItem value="Palmer">Palmer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VAT / Tax Rate (%)</Label>
              <Input type="number" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Automation</p>
            {[
              { key: "auto_invoice", label: "Auto-create invoice after procedure" },
              { key: "auto_emr_append", label: "Auto-append dental notes to EMR" },
              { key: "auto_deduct_inventory", label: "Auto-deduct materials from inventory" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <Label className="text-sm">{item.label}</Label>
                <Switch checked={form[item.key as keyof typeof form] === "true"} onCheckedChange={(v) => setForm({ ...form, [item.key]: String(v) })} />
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">Notifications & Partners</p>
            <div className="space-y-2">
              <Label>Follow-up Reminder Channel</Label>
              <Select value={form.followup_channel} onValueChange={(v) => setForm({ ...form, followup_channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Dental Lab Partner</Label>
              <Input value={form.lab_partner} onChange={(e) => setForm({ ...form, lab_partner: e.target.value })} placeholder="e.g. Smile Dental Lab" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Dental Config"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Prescription Settings Tab ==============
function PrescriptionSettingsTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [rxNotes, setRxNotes] = useState(form.rx_default_notes ?? "");
  const [rxFooter, setRxFooter] = useState(form.rx_footer_text ?? "");
  const [rxHeader, setRxHeader] = useState(form.rx_header_text ?? "");
  const [rxDisclaimer, setRxDisclaimer] = useState(form.rx_disclaimer ?? "");
  const [rxWatermark, setRxWatermark] = useState(form.rx_watermark ?? "");

  useEffect(() => { setRxNotes(form.rx_default_notes ?? ""); }, [form.rx_default_notes]);
  useEffect(() => { setRxFooter(form.rx_footer_text ?? ""); }, [form.rx_footer_text]);
  useEffect(() => { setRxHeader(form.rx_header_text ?? ""); }, [form.rx_header_text]);
  useEffect(() => { setRxDisclaimer(form.rx_disclaimer ?? ""); }, [form.rx_disclaimer]);
  useEffect(() => { setRxWatermark(form.rx_watermark ?? ""); }, [form.rx_watermark]);

  const RX_PRINT_SIZES = ["A4", "Letter", "Legal", "Half Page", "Thermal 80mm", "Thermal 58mm", "Custom"];
  const RX_TEMPLATES = [
    { key: "standard", name: "Standard", desc: "Clean clinical layout with all sections" },
    { key: "compact", name: "Compact", desc: "Condensed layout for quick printing" },
    { key: "detailed", name: "Detailed", desc: "Full clinical breakdown with history" },
    { key: "minimal", name: "Minimal", desc: "Medicines only — no extras" },
  ];
  const FONT_SIZES = [
    { key: "small", label: "Small (9pt)" },
    { key: "medium", label: "Medium (11pt)" },
    { key: "large", label: "Large (13pt)" },
  ];

  return (
    <div className="space-y-4">
      {/* Print & Template */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4 text-teal-600" /> Print & Template</CardTitle><CardDescription className="text-xs">Configure prescription print layout and template</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><Label>Print Size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RX_PRINT_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => updateForm("rx_print_size", size)} className={`rounded-lg border-2 px-3 py-2 text-left transition-all text-xs font-medium ${form.rx_print_size === size ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300" : "border-border hover:border-teal-300 text-muted-foreground"}`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2"><Label>Prescription Template</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RX_TEMPLATES.map((t) => (
                <button key={t.key} type="button" onClick={() => updateForm("rx_template", t.key)} className={`rounded-xl border-2 p-3 text-left transition-all ${form.rx_template === t.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20" : "border-border hover:border-teal-300"}`}>
                  <p className="text-sm font-medium">{t.name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                  {form.rx_template === t.key && <Badge className="mt-2 bg-teal-600 text-white text-[9px]">Active</Badge>}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Font Size</Label>
            <div className="flex gap-2">
              {FONT_SIZES.map((f) => (
                <button key={f.key} type="button" onClick={() => updateForm("rx_font_size", f.key)} className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${form.rx_font_size === f.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300" : "border-border hover:border-teal-300 text-muted-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header & Footer */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4 text-teal-600" /> Header & Footer</CardTitle><CardDescription className="text-xs">Customize the header and footer on printed prescriptions</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Header</p><p className="text-[11px] text-muted-foreground">Display custom header text above the prescription</p></div><Switch checked={form.rx_header_enabled === "true"} onCheckedChange={(c) => updateForm("rx_header_enabled", String(c))} /></div>
          {form.rx_header_enabled === "true" && (
            <div className="space-y-1.5"><Label>Custom Header Text</Label><Input value={rxHeader} onChange={(e) => setRxHeader(e.target.value)} onBlur={() => updateForm("rx_header_text", rxHeader)} placeholder="e.g. Clinic Name — Department of General Medicine" /></div>
          )}
          <Separator />
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Footer</p><p className="text-[11px] text-muted-foreground">Display disclaimer and notes at the bottom of the prescription</p></div><Switch checked={form.rx_footer_enabled === "true"} onCheckedChange={(c) => updateForm("rx_footer_enabled", String(c))} /></div>
          {form.rx_footer_enabled === "true" && (
            <div className="space-y-1.5"><Label>Footer Text</Label><Textarea value={rxFooter} onChange={(e) => setRxFooter(e.target.value)} onBlur={() => updateForm("rx_footer_text", rxFooter)} placeholder="This is a computer-generated prescription. Please verify before use." rows={2} /></div>
          )}
          <Separator />
          <div className="space-y-1.5"><Label>Disclaimer</Label><Textarea value={rxDisclaimer} onChange={(e) => setRxDisclaimer(e.target.value)} onBlur={() => updateForm("rx_disclaimer", rxDisclaimer)} placeholder="This prescription is valid for 30 days from the date of issue." rows={2} /></div>
          <div className="space-y-1.5"><Label>Watermark Text (optional)</Label><Input value={rxWatermark} onChange={(e) => setRxWatermark(e.target.value)} onBlur={() => updateForm("rx_watermark", rxWatermark)} placeholder="e.g. COPY / CONFIDENTIAL" /></div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> Display Options</CardTitle><CardDescription className="text-xs">Control what appears on the printed prescription</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "rx_show_logo", label: "Show Clinic Logo", desc: "Display clinic logo in the header" },
            { key: "rx_show_qr", label: "Show QR Code", desc: "QR code linking to digital prescription record" },
            { key: "rx_show_barcode", label: "Show Barcode", desc: "Barcode with prescription reference number" },
            { key: "rx_show_signature", label: "Show Doctor Signature Block", desc: "Signature and designation line for the doctor" },
            { key: "rx_auto_numbering", label: "Auto-Numbering", desc: "Automatically generate sequential prescription numbers" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>
              <Switch checked={form[item.key] === "true"} onCheckedChange={(c) => updateForm(item.key, String(c))} />
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5"><Label>Number Prefix</Label><Input value={form.rx_number_prefix ?? "RX"} onChange={(e) => updateForm("rx_number_prefix", e.target.value)} placeholder="RX" /></div>
            <div className="space-y-1.5"><Label>Validity (days)</Label><Input type="number" value={form.rx_validity_days ?? "30"} onChange={(e) => updateForm("rx_validity_days", e.target.value)} placeholder="30" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Default Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-teal-600" /> Default Notes & Instructions</CardTitle><CardDescription className="text-xs">Pre-fill default notes for every new prescription</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Default Clinical Notes</Label><Textarea value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} onBlur={() => updateForm("rx_default_notes", rxNotes)} placeholder="e.g. Patient counseled about medication compliance and follow-up." rows={3} /></div>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-violet-600" /> AI Features</CardTitle><CardDescription className="text-xs">Enable AI-powered clinical decision support in the prescription form</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Enable AI Assistant</p><p className="text-[11px] text-muted-foreground">Show AI diagnosis suggestions, drug interaction checks, and smart recommendations in the prescription form</p></div><Switch checked={form.rx_ai_features === "true"} onCheckedChange={(c) => updateForm("rx_ai_features", String(c))} /></div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 p-3 text-xs text-violet-700 dark:text-violet-300">
            <p className="font-semibold mb-1">AI capabilities include:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Differential diagnosis suggestions from symptoms</li>
              <li>Drug interaction & contraindication checker</li>
              <li>Recommended investigations based on presentation</li>
              <li>Auto-generated clinical summaries</li>
              <li>Real-time safety alerts (allergies, vitals, missing data)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => onSave({ rx_print_size: form.rx_print_size, rx_header_enabled: form.rx_header_enabled, rx_header_text: rxHeader, rx_footer_enabled: form.rx_footer_enabled, rx_footer_text: rxFooter, rx_default_notes: rxNotes, rx_template: form.rx_template, rx_show_logo: form.rx_show_logo, rx_show_qr: form.rx_show_qr, rx_show_barcode: form.rx_show_barcode, rx_show_signature: form.rx_show_signature, rx_font_size: form.rx_font_size, rx_auto_numbering: form.rx_auto_numbering, rx_number_prefix: form.rx_number_prefix, rx_ai_features: form.rx_ai_features, rx_watermark: rxWatermark, rx_disclaimer: rxDisclaimer, rx_validity_days: form.rx_validity_days })} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Prescription Settings"}</Button>
      </div>
    </div>
  );
}

// ============== Billing Settings Tab ==============
function BillingSettingsTab({ form, updateForm, saving, onSave }: { form: SettingsMap; updateForm: (k: string, v: string) => void; saving: boolean; onSave: (p: SettingsMap) => void }) {
  const [billingFooter, setBillingFooter] = useState(form.billing_footer_text ?? "");
  const [billingNotes, setBillingNotes] = useState(form.billing_notes ?? "");
  const [billingTerms, setBillingTerms] = useState(form.billing_terms_conditions ?? "");
  const [billingHeader, setBillingHeader] = useState(form.billing_header_text ?? "");
  const [billingWatermark, setBillingWatermark] = useState(form.billing_watermark ?? "");
  const [billingEmailTemplate, setBillingEmailTemplate] = useState(form.billing_email_subject_template ?? "");

  useEffect(() => { setBillingFooter(form.billing_footer_text ?? ""); }, [form.billing_footer_text]);
  useEffect(() => { setBillingNotes(form.billing_notes ?? ""); }, [form.billing_notes]);
  useEffect(() => { setBillingTerms(form.billing_terms_conditions ?? ""); }, [form.billing_terms_conditions]);
  useEffect(() => { setBillingHeader(form.billing_header_text ?? ""); }, [form.billing_header_text]);
  useEffect(() => { setBillingWatermark(form.billing_watermark ?? ""); }, [form.billing_watermark]);
  useEffect(() => { setBillingEmailTemplate(form.billing_email_subject_template ?? ""); }, [form.billing_email_subject_template]);

  const BILLING_PRINT_SIZES = ["A4", "Letter", "Legal", "Half Page", "Thermal 80mm", "Thermal 58mm", "Custom"];
  const BILLING_TEMPLATES = [
    { key: "standard", name: "Standard", desc: "Clean professional invoice layout" },
    { key: "compact", name: "Compact", desc: "Thermal-printer-friendly minimal layout" },
    { key: "detailed", name: "Detailed", desc: "Full breakdown with terms & conditions" },
    { key: "modern", name: "Modern", desc: "Colorful header with gradient design" },
  ];
  const RECEIPT_TEMPLATES = [
    { key: "standard", name: "Standard Receipt", desc: "Full-page receipt with all details" },
    { key: "thermal", name: "Thermal Receipt", desc: "Narrow format for thermal printers" },
    { key: "digital", name: "Digital Only", desc: "Screen-optimized, no print layout" },
  ];
  const FONT_SIZES = [
    { key: "small", label: "Small (9pt)" },
    { key: "medium", label: "Medium (11pt)" },
    { key: "large", label: "Large (13pt)" },
  ];
  const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "Custom"];

  return (
    <div className="space-y-4">
      {/* Invoice Print & Template */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer className="w-4 h-4 text-teal-600" /> Invoice Print & Template</CardTitle><CardDescription className="text-xs">Configure invoice print layout, template and font size</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><Label>Print Size</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BILLING_PRINT_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => updateForm("billing_print_size", size)} className={`rounded-lg border-2 px-3 py-2 text-left transition-all text-xs font-medium ${form.billing_print_size === size ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300" : "border-border hover:border-teal-300 text-muted-foreground"}`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2"><Label>Invoice Template</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BILLING_TEMPLATES.map((t) => (
                <button key={t.key} type="button" onClick={() => updateForm("billing_receipt_template", t.key)} className={`rounded-xl border-2 p-3 text-left transition-all ${form.billing_receipt_template === t.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20" : "border-border hover:border-teal-300"}`}>
                  <p className="text-sm font-medium">{t.name}</p><p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                  {form.billing_receipt_template === t.key && <Badge className="mt-2 bg-teal-600 text-white text-[9px]">Active</Badge>}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Receipt Template</Label>
            <div className="flex gap-2">
              {RECEIPT_TEMPLATES.map((rt) => (
                <button key={rt.key} type="button" onClick={() => updateForm("billing_invoice_template", rt.key)} className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${form.billing_invoice_template === rt.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300" : "border-border hover:border-teal-300 text-muted-foreground"}`}>
                  {rt.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2"><Label>Font Size</Label>
            <div className="flex gap-2">
              {FONT_SIZES.map((f) => (
                <button key={f.key} type="button" onClick={() => updateForm("billing_font_size", f.key)} className={`rounded-lg border-2 px-4 py-2 text-xs font-medium transition-all ${form.billing_font_size === f.key ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300" : "border-border hover:border-teal-300 text-muted-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header & Footer */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4 text-teal-600" /> Header & Footer</CardTitle><CardDescription className="text-xs">Customize the header and footer on printed invoices</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Header</p><p className="text-[11px] text-muted-foreground">Display custom header text above the invoice</p></div><Switch checked={form.billing_header_enabled === "true"} onCheckedChange={(c) => updateForm("billing_header_enabled", String(c))} /></div>
          {form.billing_header_enabled === "true" && (
            <div className="space-y-1.5"><Label>Custom Header Text</Label><Input value={billingHeader} onChange={(e) => setBillingHeader(e.target.value)} onBlur={() => updateForm("billing_header_text", billingHeader)} placeholder="e.g. Tax Invoice — Clinic Name" /></div>
          )}
          <Separator />
          <div className="flex items-center justify-between rounded-lg border px-3 py-3"><div><p className="text-sm font-medium">Show Footer</p><p className="text-[11px] text-muted-foreground">Display footer text at the bottom of the invoice</p></div><Switch checked={form.billing_footer_enabled === "true"} onCheckedChange={(c) => updateForm("billing_footer_enabled", String(c))} /></div>
          {form.billing_footer_enabled === "true" && (
            <div className="space-y-1.5"><Label>Footer Text</Label><Textarea value={billingFooter} onChange={(e) => setBillingFooter(e.target.value)} onBlur={() => updateForm("billing_footer_text", billingFooter)} placeholder="Thank you for choosing our services" rows={2} /></div>
          )}
          <Separator />
          <div className="space-y-1.5"><Label>Invoice Notes</Label><Textarea value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} onBlur={() => updateForm("billing_notes", billingNotes)} placeholder="e.g. Payment is due within 30 days. Late payments may incur additional charges." rows={2} /></div>
          <div className="space-y-1.5"><Label>Terms & Conditions</Label><Textarea value={billingTerms} onChange={(e) => setBillingTerms(e.target.value)} onBlur={() => updateForm("billing_terms_conditions", billingTerms)} placeholder={"1. Payment is due within the specified terms.\n2. Prices are inclusive of applicable taxes.\n3. Refunds are subject to clinic policy.\n4. This is a computer-generated invoice."} rows={4} /></div>
          <div className="space-y-1.5"><Label>Watermark Text (optional)</Label><Input value={billingWatermark} onChange={(e) => setBillingWatermark(e.target.value)} onBlur={() => updateForm("billing_watermark", billingWatermark)} placeholder="e.g. COPY / PAID / DRAFT" /></div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-teal-600" /> Display Options</CardTitle><CardDescription className="text-xs">Control what appears on the printed invoice</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "billing_show_logo", label: "Show Clinic Logo", desc: "Display clinic logo on the invoice" },
            { key: "billing_show_signature", label: "Show Signature Block", desc: "Authorized signatory line on invoices" },
            { key: "billing_show_patient_id", label: "Show Patient ID", desc: "Display patient code on the invoice" },
            { key: "billing_show_subtotal", label: "Show Subtotal", desc: "Display itemized subtotal before discounts/tax" },
            { key: "billing_show_discount", label: "Show Discount", desc: "Display discount line if applicable" },
            { key: "billing_show_tax_number", label: "Show Tax Registration Number", desc: "Display clinic tax/VAT registration" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>
              <Switch checked={form[item.key] === "true"} onCheckedChange={(c) => updateForm(item.key, String(c))} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Numbering & Payment Terms */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Hash className="w-4 h-4 text-teal-600" /> Numbering & Payment Terms</CardTitle><CardDescription className="text-xs">Configure invoice numbering format and default payment terms</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Invoice Number Prefix</Label><Input value={form.billing_invoice_number_prefix ?? "INV"} onChange={(e) => updateForm("billing_invoice_number_prefix", e.target.value)} placeholder="INV" /></div>
            <div className="space-y-1.5"><Label>Receipt Number Prefix</Label><Input value={form.billing_receipt_number_prefix ?? "RCP"} onChange={(e) => updateForm("billing_receipt_number_prefix", e.target.value)} placeholder="RCP" /></div>
            <div className="space-y-1.5"><Label>Credit Note Prefix</Label><Input value={form.billing_credit_note_prefix ?? "CN"} onChange={(e) => updateForm("billing_credit_note_prefix", e.target.value)} placeholder="CN" /></div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Default Payment Terms</Label>
              <Select value={form.billing_default_payment_terms ?? "Net 30"} onValueChange={(v) => updateForm("billing_default_payment_terms", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Late Fee (%)</Label><Input type="number" value={form.billing_late_fee ?? "0"} onChange={(e) => updateForm("billing_late_fee", e.target.value)} placeholder="0" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4 text-teal-600" /> Email Template</CardTitle><CardDescription className="text-xs">Customize the invoice email subject line</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Email Subject Template</Label><Input value={billingEmailTemplate} onChange={(e) => setBillingEmailTemplate(e.target.value)} onBlur={() => updateForm("billing_email_subject_template", billingEmailTemplate)} placeholder="Invoice {invoice_no} from {clinic_name}" /></div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Available placeholders:</p>
            <div className="flex flex-wrap gap-1.5">
              {["{invoice_no}", "{patient_name}", "{clinic_name}", "{total}", "{due_date}", "{date}"].map((p) => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-background border font-mono text-[10px]">{p}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => onSave({ billing_print_size: form.billing_print_size, billing_header_enabled: form.billing_header_enabled, billing_header_text: billingHeader, billing_footer_enabled: form.billing_footer_enabled, billing_footer_text: billingFooter, billing_notes: billingNotes, billing_terms_conditions: billingTerms, billing_invoice_number_prefix: form.billing_invoice_number_prefix, billing_receipt_number_prefix: form.billing_receipt_number_prefix, billing_show_tax_number: form.billing_show_tax_number, billing_show_discount: form.billing_show_discount, billing_show_subtotal: form.billing_show_subtotal, billing_show_signature: form.billing_show_signature, billing_show_logo: form.billing_show_logo, billing_show_patient_id: form.billing_show_patient_id, billing_watermark: billingWatermark, billing_default_payment_terms: form.billing_default_payment_terms, billing_late_fee: form.billing_late_fee, billing_credit_note_prefix: form.billing_credit_note_prefix, billing_email_subject_template: billingEmailTemplate, billing_receipt_template: form.billing_receipt_template, billing_font_size: form.billing_font_size })} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"><Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Billing Settings"}</Button>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-48 rounded-lg" />
      <div className="flex flex-col lg:flex-row gap-4">
        <Skeleton className="h-64 lg:w-56 rounded-lg" />
        <Skeleton className="flex-1 h-96 rounded-xl" />
      </div>
    </div>
  );
}