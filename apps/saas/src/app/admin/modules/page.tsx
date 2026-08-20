"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import { Switch } from "@carelim/ui";
import {
  Search,
  Boxes,
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  FlaskConical,
  Scan,
  Pill,
  Package,
  CreditCard,
  Calculator,
  BarChart3,
  Settings,
  ShieldCheck,
  ClipboardList,
  UserCog,
  Video,
  Globe,
  Cpu,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Calendar,
  Stethoscope, FileText, FlaskConical, Scan, Pill, Package, CreditCard,
  Calculator, BarChart3, Settings, Shield: ShieldCheck,
  ClipboardList, UserCog, Video, Globe,
};

const PLATFORM_MODULES = [
  { key: "dashboard", name: "Dashboard", category: "Overview", icon: "LayoutDashboard" },
  { key: "patients", name: "Patients", category: "Clinical", icon: "Users" },
  { key: "appointments", name: "Appointments", category: "Clinical", icon: "Calendar" },
  { key: "doctors", name: "Doctors & Departments", category: "Clinical", icon: "Stethoscope" },
  { key: "emr", name: "EMR & Prescriptions", category: "Clinical", icon: "FileText" },
  { key: "clinical-notes", name: "Clinical Notes", category: "Clinical", icon: "ClipboardList" },
  { key: "laboratory", name: "Laboratory (LIMS)", category: "Diagnostics", icon: "FlaskConical" },
  { key: "radiology", name: "Radiology (RIS)", category: "Diagnostics", icon: "Scan" },
  { key: "pharmacy", name: "Pharmacy", category: "Operations", icon: "Pill" },
  { key: "inventory", name: "Inventory (AIMS)", category: "Operations", icon: "Package" },
  { key: "billing", name: "Billing & Invoicing", category: "Finance", icon: "CreditCard" },
  { key: "accounting", name: "Accounting", category: "Finance", icon: "Calculator" },
  { key: "reports", name: "Reports & Analytics", category: "Finance", icon: "BarChart3" },
  { key: "staff", name: "Staff Management", category: "Administration", icon: "UserCog" },
  { key: "settings", name: "Settings", category: "Administration", icon: "Settings" },
  { key: "telemedicine", name: "Telemedicine", category: "Specialty", icon: "Video" },
  { key: "public-booking", name: "Public Booking Page", category: "Platform", icon: "Globe" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Overview: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  Clinical: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Diagnostics: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Operations: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Finance: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Administration: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Specialty: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  Platform: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
};

export default function ModulesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [...new Set(PLATFORM_MODULES.map((m) => m.category))];

  const filtered = PLATFORM_MODULES.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, typeof PLATFORM_MODULES>);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Healthcare Modules</h1>
          <p className="text-sm text-muted-foreground">{PLATFORM_MODULES.length} platform modules</p>
        </div>
        <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          {PLATFORM_MODULES.length} modules
        </Badge>
      </div>

      {/* Search + Category Filter */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({PLATFORM_MODULES.length})
            </button>
            {categories.map((cat) => {
              const count = PLATFORM_MODULES.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modules by Category */}
      {Object.entries(grouped).map(([category, mods]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</h2>
            <Badge className={`text-[10px] ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600"}`}>
              {mods.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mods.map((mod) => {
              const IconComp = ICON_MAP[mod.icon] || Cpu;
              return (
                <Card key={mod.key} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40">
                          <IconComp className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{mod.name}</p>
                          <p className="text-[11px] text-muted-foreground">{mod.category}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600"}`}>
                        {mod.category}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Key: {mod.key}</span>
                      <span className="text-emerald-600 font-medium">Available</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
