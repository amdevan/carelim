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
import { Progress } from "@/components/ui/progress";
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
  Building2, Palette, Puzzle, Users, Network, CreditCard, Eye,
  Save, Plus, Check, Pencil, Trash2, Search, Download, RotateCcw,
  Globe, Clock, FileText, Shield, UserPlus, CheckCircle2,
  AlertTriangle, Settings as SettingsIcon, Upload, Loader2,
  TrendingUp, Zap, Star, Crown,
} from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface TenantSettings {
  clinicName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  timezone: string;
  locale: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
  termsAndConditions: string;
  privacyPolicy: string;
}

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string } | null;
  phone: string | null;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

interface TenantBranch {
  id: string;
  name: string;
  code: string;
  clinicType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string | null;
  manager: string | null;
  status: string;
  createdAt: string;
}

interface ModuleItem {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  isEnabled: boolean;
  icon: string;
}

interface SubscriptionPlan {
  planName: string;
  maxDoctors: number;
  maxUsers: number;
  maxBranches: number;
  storageGB: number;
  usedDoctors: number;
  usedUsers: number;
  usedStorageGB: number;
  expiresAt: string | null;
  status: string;
}

interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  module: string;
  detail: string;
  ip: string | null;
  createdAt: string;
}

const defaultSettings: TenantSettings = {
  clinicName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  country: "Nepal",
  zipCode: "",
  timezone: "Asia/Kathmandu",
  locale: "en",
  logoUrl: "",
  primaryColor: "#0d9488",
  secondaryColor: "#10b981",
  footerText: "",
  termsAndConditions: "",
  privacyPolicy: "",
};

const TIMEZONES = [
  "Asia/Kathmandu", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Australia/Sydney",
];

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ne", label: "Nepali" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const COLOR_SWATCHES = [
  { name: "Teal", value: "#0d9488" },
  { name: "Emerald", value: "#10b981" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
];

const MODULE_CATEGORIES = [
  { id: "Clinical", color: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" },
  { id: "Diagnostics", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  { id: "Operations", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "Finance", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { id: "Administration", color: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
  { id: "Specialty", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" },
];

const ROLE_COLORS = [
  "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
];

function getRoleColor(roleName: string): string {
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  return ROLE_COLORS[Math.abs(hash) % ROLE_COLORS.length];
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  suspended: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const BRANCH_TYPES = [
  "General", "Dental", "IVF",
];

/* ═══════════════════════════════════════════════════════════════
   Skeleton
   ═══════════════════════════════════════════════════════════════ */
function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-80 w-56 rounded-xl hidden lg:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Color Picker Row (reusable)
   ═══════════════════════════════════════════════════════════════ */
function ColorPickerRow({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={`relative w-9 h-9 rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-background transition-all ${
              value === c.value
                ? "ring-foreground"
                : "ring-transparent hover:ring-muted-foreground/40"
            }`}
            style={{ background: c.value }}
            title={c.name}
          >
            {value === c.value && <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg border border-border cursor-pointer"
            title="Custom color"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-28 h-9 font-mono text-xs"
            placeholder="#000000"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {COLOR_SWATCHES.find((c) => c.value === value)?.name ?? "Custom"} selected
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   1. GENERAL TAB
   ═══════════════════════════════════════════════════════════════ */
function GeneralTab({
  form, setForm, saving, onSave,
}: {
  form: TenantSettings;
  setForm: (f: TenantSettings) => void;
  saving: boolean;
  onSave: (partial: Partial<TenantSettings>) => void;
}) {
  const update = (key: keyof TenantSettings, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            Clinic Basic Information
          </CardTitle>
          <CardDescription className="text-xs">
            Core details about your healthcare facility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => update("clinicName", e.target.value)} placeholder="Your Clinic Name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="info@your-clinic.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+977-1-4XXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://your-clinic.com" />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Kathmandu" />
            </div>
            <div className="space-y-2">
              <Label>State / Province</Label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="Bagmati" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Nepal" />
            </div>
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="44600" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => update("timezone", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Locale</Label>
              <Select value={form.locale} onValueChange={(v) => update("locale", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onSave({ clinicName: form.clinicName, email: form.email, phone: form.phone, website: form.website, address: form.address, city: form.city, state: form.state, country: form.country, zipCode: form.zipCode, timezone: form.timezone, locale: form.locale })} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save General Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGO UPLOAD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
function LogoUpload({ logoUrl, onUploaded }: { logoUrl: string; onUploaded: (url: string) => void }) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Clinic Logo</Label>
      {logoUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <img src={logoUrl} alt="Logo preview" className="h-12 w-auto object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{logoUrl}</p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
              <Button variant="outline" size="sm" type="button" disabled={uploading} className="gap-1.5">
                <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Replace"}
              </Button>
            </label>
            <Button variant="ghost" size="sm" type="button" className="text-red-500 hover:text-red-600 gap-1.5" onClick={() => onUploaded("")}>
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragOver ? "border-teal-400 bg-teal-50/40 dark:bg-teal-950/20" : "border-border hover:border-teal-400 hover:bg-teal-50/40 dark:hover:bg-teal-950/20"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" className="hidden" onChange={handleInputChange} disabled={uploading} />
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click or drag to upload logo</span>
              <span className="text-[11px] text-muted-foreground">PNG, JPG, WebP, SVG, GIF — max 2 MB</span>
            </>
          )}
        </label>
      )}
      <p className="text-[11px] text-muted-foreground">Or paste a URL: <Input value={logoUrl} onChange={(e) => onUploaded(e.target.value)} placeholder="https://example.com/logo.png" className="mt-1 h-8 text-xs" /></p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. BRANDING TAB
   ═══════════════════════════════════════════════════════════════ */
function BrandingTab({
  form, setForm, saving, onSave,
}: {
  form: TenantSettings;
  setForm: (f: TenantSettings) => void;
  saving: boolean;
  onSave: (partial: Partial<TenantSettings>) => void;
}) {
  const update = (key: keyof TenantSettings, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-teal-600" />
            Visual Branding
          </CardTitle>
          <CardDescription className="text-xs">
            Customize logo, colors, and legal content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <LogoUpload logoUrl={form.logoUrl} onUploaded={(url) => update("logoUrl", url)} />

          <Separator />

          {/* Colors */}
          <ColorPickerRow label="Primary Color" value={form.primaryColor} onChange={(v) => update("primaryColor", v)} />
          <ColorPickerRow label="Secondary Color" value={form.secondaryColor} onChange={(v) => update("secondaryColor", v)} />

          {/* Live preview */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: form.primaryColor }}>
              {form.logoUrl && <img src={form.logoUrl} alt="" className="h-6 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              <span className="text-white font-semibold text-sm">{form.clinicName || "Clinic Name"}</span>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground" style={{ background: form.secondaryColor + "22", color: form.secondaryColor }}>
              Accent bar preview
            </div>
          </div>

          <Separator />

          {/* Footer text */}
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Input value={form.footerText} onChange={(e) => update("footerText", e.target.value)} placeholder="Thank you for choosing our clinic" />
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Terms &amp; Conditions
            </Label>
            <Textarea
              value={form.termsAndConditions}
              onChange={(e) => update("termsAndConditions", e.target.value)}
              placeholder="Enter your terms and conditions…"
              rows={5}
            />
          </div>

          {/* Privacy Policy */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Privacy Policy
            </Label>
            <Textarea
              value={form.privacyPolicy}
              onChange={(e) => update("privacyPolicy", e.target.value)}
              placeholder="Enter your privacy policy…"
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => onSave({ logoUrl: form.logoUrl, primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, footerText: form.footerText, termsAndConditions: form.termsAndConditions, privacyPolicy: form.privacyPolicy })} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Branding"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. MODULES TAB
   ═══════════════════════════════════════════════════════════════ */
function ModulesTab() {
  const { data: modules, loading } = useFetch<ModuleItem[]>("/api/tenant/modules");
  const [localModules, setLocalModules] = useState<ModuleItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modules) setLocalModules(modules);
  }, [modules]);

  const toggleModule = (id: string) => {
    setLocalModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isEnabled: !m.isEnabled } : m))
    );
  };

  const enabledCount = localModules.filter((m) => m.isEnabled).length;

  const allList = Array.isArray(localModules) ? localModules : [];

  const grouped = useMemo(() => {
    const map: Record<string, ModuleItem[]> = {};
    for (const cat of MODULE_CATEGORIES) map[cat.id] = [];
    for (const m of allList) {
      if (map[m.category]) map[m.category].push(m);
      else {
        if (!map[m.category]) map[m.category] = [];
        map[m.category].push(m);
      }
    }
    return map;
  }, [allList]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/tenant/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modules: localModules.map((m) => ({ id: m.id, isEnabled: m.isEnabled })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Module settings saved successfully");
    } catch {
      toast.error("Failed to save module settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-teal-600" />
                Platform Modules
              </CardTitle>
              <CardDescription className="text-xs">
                Enable or disable modules for your organization
              </CardDescription>
            </div>
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              {enabledCount} / {allList.length} enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {MODULE_CATEGORIES.map((cat) => {
            const items = grouped[cat.id] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{cat.id}</h3>
                  <Badge className={`text-[10px] ${cat.color}`}>{items.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-4 transition-all ${
                        m.isEnabled
                          ? "border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20"
                          : "border-border bg-card opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {m.description || "No description"}
                          </p>
                        </div>
                        <Switch checked={m.isEnabled} onCheckedChange={() => toggleModule(m.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Module Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. USERS TAB
   ═══════════════════════════════════════════════════════════════ */
function UsersTab() {
  const [tick, setTick] = useState(0);
  const { data: usersData, loading } = useFetch<TenantUser[]>(tick ? `/api/tenant/users?_r=${tick}` : "/api/tenant/users");
  const { data: rolesData } = useFetch<{ roles: { id: string; name: string; isSystem: boolean }[] }>("/api/roles");
  const doRefresh = useCallback(() => setTick((t) => t + 1), []);

  const dynamicRoles = rolesData?.roles || [];

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<TenantUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<TenantUser | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: "", email: "", password: "", phone: "", roleId: "" };
  const [form, setForm] = useState(emptyForm);

  const allUsers = Array.isArray(usersData) ? usersData : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allUsers.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role?.id === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [allUsers, search, roleFilter, statusFilter]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("User created successfully");
      setCreateOpen(false);
      setForm(emptyForm);
      doRefresh();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/tenant/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, roleId: form.roleId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("User updated successfully");
      setEditUser(null);
      doRefresh();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/tenant/users/${deleteUser.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("User deleted successfully");
      setDeleteUser(null);
      doRefresh();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: TenantUser) => {
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone || "", roleId: u.role?.id || "" });
    setEditUser(u);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setCreateOpen(true);
  };

  const activeUsers = allUsers.filter((u) => u.status === "active").length;
  const doctorCount = allUsers.filter((u) => u.role?.name === "Doctor").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: allUsers.length, icon: Users, accent: "from-teal-500 to-teal-600" },
          { label: "Active", value: activeUsers, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
          { label: "Doctors", value: doctorCount, icon: Shield, accent: "from-violet-500 to-purple-600" },
          { label: "Roles", value: new Set(allUsers.map((u) => u.role)).size, icon: Star, accent: "from-amber-500 to-orange-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.accent} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold tabular-nums">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              User Management
            </CardTitle>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={openCreate}>
              <UserPlus className="w-4 h-4" /> Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {dynamicRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${getRoleColor(u.role?.name || "")}`}>
                          {u.role?.name || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{u.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_BADGE[u.status] || STATUS_BADGE.inactive}`}>
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-teal-600" /> Create New User</DialogTitle>
            <DialogDescription>Fill in the details to create a new user account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" /></div>
              <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@clinic.com" /></div>
              <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+977-9XXXXXXXX" /></div>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {dynamicRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}>
              <Save className="w-4 h-4" /> {saving ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-teal-600" /> Edit User</DialogTitle>
            <DialogDescription>Update user information and role assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {dynamicRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleEdit} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. BRANCHES TAB
   ═══════════════════════════════════════════════════════════════ */
function BranchesTab() {
  const [tick, setTick] = useState(0);
  const { data: branchesData, loading } = useFetch<TenantBranch[]>(tick ? `/api/tenant/branches?_r=${tick}` : "/api/tenant/branches");
  const doRefresh = useCallback(() => setTick((t) => t + 1), []);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<TenantBranch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<TenantBranch | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: "", code: "", clinicType: "General", address: "", city: "", state: "", country: "Nepal", zipCode: "", phone: "", email: "", website: "", timezone: "Asia/Kathmandu", manager: "", status: "active" };
  const [form, setForm] = useState(emptyForm);

  const allBranches = Array.isArray(branchesData) ? branchesData : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allBranches.filter((b) => {
      const matchSearch = !q || b.name.toLowerCase().includes(q) || (b.code || "").toLowerCase().includes(q) || (b.city || "").toLowerCase().includes(q);
      const matchType = typeFilter === "all" || b.clinicType === typeFilter;
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [allBranches, search, typeFilter, statusFilter]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/tenant/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Branch created successfully");
      setCreateOpen(false);
      setForm(emptyForm);
      doRefresh();
    } catch {
      toast.error("Failed to create branch");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editBranch) return;
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/tenant/branches/${editBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Branch updated successfully");
      setEditBranch(null);
      doRefresh();
    } catch {
      toast.error("Failed to update branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBranch) return;
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/tenant/branches/${deleteBranch.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Branch deleted successfully");
      setDeleteBranch(null);
      doRefresh();
    } catch {
      toast.error("Failed to delete branch");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (b: TenantBranch) => {
    setForm({
      name: b.name, code: b.code, clinicType: b.clinicType, address: b.address || "",
      city: b.city || "", state: b.state || "", country: b.country || "Nepal", zipCode: b.zipCode || "",
      phone: b.phone || "", email: b.email || "", website: b.website || "", timezone: b.timezone || "Asia/Kathmandu",
      manager: b.manager || "", status: b.status,
    });
    setEditBranch(b);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="w-4 h-4 text-teal-600" />
              Branch Management
            </CardTitle>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search branches…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {BRANCH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No branches found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground font-mono text-xs">{b.code}</TableCell>
                      <TableCell><Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{b.clinicType}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{b.city || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_BADGE[b.status] || STATUS_BADGE.inactive}`}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(b)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteBranch(b)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Branch Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-teal-600" /> Create New Branch</DialogTitle>
            <DialogDescription>Add a new branch or location for your organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Branch Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Branch" /></div>
              <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BR-001" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.clinicType} onValueChange={(v) => setForm({ ...form, clinicType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BRANCH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Manager</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder="Manager name" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kathmandu" /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Bagmati" /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+977-1-4XXXXXX" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="branch@clinic.com" /></div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreate} disabled={saving || !form.name || !form.code}>
              <Save className="w-4 h-4" /> {saving ? "Creating…" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={!!editBranch} onOpenChange={(o) => { if (!o) setEditBranch(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-teal-600" /> Edit Branch</DialogTitle>
            <DialogDescription>Update branch details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Branch Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.clinicType} onValueChange={(v) => setForm({ ...form, clinicType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BRANCH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Manager</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditBranch(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleEdit} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Update Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Dialog */}
      <AlertDialog open={!!deleteBranch} onOpenChange={(o) => { if (!o) setDeleteBranch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete Branch
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete branch <strong>{deleteBranch?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete Branch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. SUBSCRIPTION TAB
   ═══════════════════════════════════════════════════════════════ */
function SubscriptionTab() {
  const { data: sub, loading } = useFetch<SubscriptionPlan>("/api/tenant/subscription");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const plan = sub as SubscriptionPlan | null;

  const doctorPct = plan ? Math.min(100, Math.round((plan.usedDoctors / Math.max(plan.maxDoctors, 1)) * 100)) : 0;
  const userPct = plan ? Math.min(100, Math.round((plan.usedUsers / Math.max(plan.maxUsers, 1)) * 100)) : 0;
  const storagePct = plan ? Math.min(100, Math.round((plan.usedStorageGB / Math.max(plan.storageGB, 1)) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Plan Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{plan?.planName || "Free Plan"}</h3>
                <p className="text-sm text-white/80">
                  {plan?.expiresAt ? `Renews ${new Date(plan.expiresAt).toLocaleDateString()}` : "No expiration date"}
                </p>
              </div>
            </div>
            <Badge className={`text-xs px-3 py-1 ${plan?.status === "active" ? "bg-white/20 text-white" : "bg-rose-500/80 text-white"}`}>
              {plan?.status === "active" ? "Active" : plan?.status || "Unknown"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Usage Statistics
          </CardTitle>
          <CardDescription className="text-xs">Monitor resource usage against your plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Doctors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Doctors</p>
                  <p className="text-[11px] text-muted-foreground">{plan?.usedDoctors || 0} of {plan?.maxDoctors || 0} used</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-teal-700 dark:text-teal-300">{doctorPct}%</span>
            </div>
            <Progress value={doctorPct} className="h-2" />
          </div>

          {/* Users */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Users</p>
                  <p className="text-[11px] text-muted-foreground">{plan?.usedUsers || 0} of {plan?.maxUsers || 0} used</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{userPct}%</span>
            </div>
            <Progress value={userPct} className="h-2" />
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-[11px] text-muted-foreground">{plan?.usedStorageGB || 0} GB of {plan?.storageGB || 0} GB used</p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">{storagePct}%</span>
            </div>
            <Progress value={storagePct} className="h-2" />
          </div>

          <Separator />

          {/* Plan Limits Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Max Doctors", value: plan?.maxDoctors ?? 0, icon: Shield },
              { label: "Max Users", value: plan?.maxUsers ?? 0, icon: Users },
              { label: "Max Branches", value: plan?.maxBranches ?? 0, icon: Network },
              { label: "Storage (GB)", value: plan?.storageGB ?? 0, icon: Download },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <item.icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold tabular-nums">{item.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      <Card className="overflow-hidden border-dashed border-teal-300 dark:border-teal-700">
        <CardContent className="p-6 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Need more power?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Upgrade your plan to unlock higher limits, additional branches, priority support, and advanced features.
            </p>
            <Button className="gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20">
              <Crown className="w-4 h-4" /> Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   7. AUDIT LOG TAB
   ═══════════════════════════════════════════════════════════════ */
function AuditLogTab() {
  const [tick] = useState(0);
  const { data: auditData, loading } = useFetch<AuditLogEntry[]>(
    tick ? `/api/tenant/audit?_r=${tick}` : "/api/tenant/audit"
  );

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allLogs = Array.isArray(auditData) ? auditData : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allLogs.filter((log) => {
      const matchSearch =
        !q ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q);
      const matchAction = actionFilter === "all" || log.action === actionFilter;
      const matchModule = moduleFilter === "all" || log.module === moduleFilter;
      let matchDate = true;
      if (dateFrom) {
        matchDate = matchDate && new Date(log.createdAt) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchDate = matchDate && new Date(log.createdAt) <= new Date(dateTo + "T23:59:59");
      }
      return matchSearch && matchAction && matchModule && matchDate;
    });
  }, [allLogs, search, actionFilter, moduleFilter, dateFrom, dateTo]);

  const uniqueActions = useMemo(
    () => [...new Set(allLogs.map((l) => l.action))].sort(),
    [allLogs]
  );
  const uniqueModules = useMemo(
    () => [...new Set(allLogs.map((l) => l.module))].sort(),
    [allLogs]
  );

  const ACTION_BADGE: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    update: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    delete: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    login: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    logout: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    export: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    approve: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  };

  const handleExport = () => {
    const headers = ["Date", "User", "Action", "Module", "Detail", "IP"];
    const rows = filtered.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.user,
      l.action,
      l.module,
      l.detail,
      l.ip || "",
    ]);
    exportToCSV("audit-log", headers, rows);
    toast.success("Audit log exported");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-600" />
              Audit Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-muted text-muted-foreground">{filtered.length} entries</Badge>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search audit logs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {uniqueModules.map((m) => (
                  <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="self-end text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                Clear Dates
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="hidden sm:table-cell">Date &amp; Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Module</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No audit log entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.user}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ACTION_BADGE[log.action] || "bg-gray-100 text-gray-600"}`}>
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{log.module}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{log.detail}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs font-mono">{log.ip || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function TenantSettingsView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const { data, loading } = useFetch<Record<string, string>>(
    refreshKey ? `/api/tenant/settings?_r=${refreshKey}` : "/api/tenant/settings"
  );

  const [form, setForm] = useState<TenantSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        clinicName: data.clinicName || data.clinic_name || "",
        email: data.email || "",
        phone: data.phone || "",
        website: data.website || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "Nepal",
        zipCode: data.zipCode || data.zip_code || "",
        timezone: data.timezone || "Asia/Kathmandu",
        locale: data.locale || "en",
        logoUrl: data.logoUrl || data.logo_url || "",
        primaryColor: data.primaryColor || data.primary_color || "#0d9488",
        secondaryColor: data.secondaryColor || data.secondary_color || "#10b981",
        footerText: data.footerText || data.footer_text || "",
        termsAndConditions: data.termsAndConditions || data.terms_and_conditions || "",
        privacyPolicy: data.privacyPolicy || data.privacy_policy || "",
      });
    }
  }, [data]);

  const putSettings = async (partial: Partial<TenantSettings>, successMsg: string) => {
    setSaving(true);
    try {
      const res = await fetchAPI("/api/tenant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(successMsg);
      refresh();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30 shrink-0">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Tenant Settings</h2>
            <p className="text-xs text-muted-foreground">Manage your organization's configuration, branding, modules, users, and more</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setForm(defaultSettings); toast.info("Form reset"); }}>
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </motion.div>

      {/* Tabbed Layout */}
      <Tabs defaultValue="general" orientation="vertical" className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar Nav */}
        <div className="lg:w-52 w-full shrink-0">
          <div className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">Organization</p>
            <TabsList className="lg:flex-col lg:h-fit lg:justify-start lg:items-stretch w-full overflow-x-auto lg:overflow-visible gap-0.5 h-auto p-0 bg-transparent">
              <TabsTrigger value="general" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Building2 className="w-4 h-4" /> General
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Palette className="w-4 h-4" /> Branding
              </TabsTrigger>
              <TabsTrigger value="modules" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Puzzle className="w-4 h-4" /> Modules
              </TabsTrigger>
              <p className="px-2 py-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">Management</p>
              <TabsTrigger value="users" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="branches" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Network className="w-4 h-4" /> Branches
              </TabsTrigger>
              <p className="px-2 py-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hidden lg:block">Billing</p>
              <TabsTrigger value="subscription" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <CreditCard className="w-4 h-4" /> Subscription
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 justify-start data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 dark:data-[state=active]:bg-teal-950/30 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm">
                <Eye className="w-4 h-4" /> Audit Log
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 space-y-4">
          <TabsContent value="general" className="mt-0">
            <GeneralTab form={form} setForm={setForm} saving={saving} onSave={(p) => putSettings(p, "General settings saved")} />
          </TabsContent>

          <TabsContent value="branding" className="mt-0">
            <BrandingTab form={form} setForm={setForm} saving={saving} onSave={(p) => putSettings(p, "Branding settings saved")} />
          </TabsContent>

          <TabsContent value="modules" className="mt-0">
            <ModulesTab />
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>

          <TabsContent value="branches" className="mt-0">
            <BranchesTab />
          </TabsContent>

          <TabsContent value="subscription" className="mt-0">
            <SubscriptionTab />
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <AuditLogTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
