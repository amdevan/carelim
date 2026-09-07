"use client";

import { useState, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, TestTube, FileCheck2, FlaskConical,
  ShieldCheck, Cpu, Package, Microscope,
} from "lucide-react";

const LimsDashboard = lazy(() => import("@/components/cms/views/lims/dashboard").then((m) => ({ default: m.LimsDashboard })));
const LimsOrders = lazy(() => import("@/components/cms/views/lims/orders").then((m) => ({ default: m.LimsOrders })));
const LimsSamples = lazy(() => import("@/components/cms/views/lims/samples").then((m) => ({ default: m.LimsSamples })));
const LimsResults = lazy(() => import("@/components/cms/views/lims/results").then((m) => ({ default: m.LimsResults })));
const LimsTestMaster = lazy(() => import("@/components/cms/views/lims/test-master").then((m) => ({ default: m.LimsTestMaster })));
const LimsQC = lazy(() => import("@/components/cms/views/lims/qc").then((m) => ({ default: m.LimsQC })));
const LimsEquipment = lazy(() => import("@/components/cms/views/lims/equipment").then((m) => ({ default: m.LimsEquipment })));
const LimsInventory = lazy(() => import("@/components/cms/views/lims/inventory").then((m) => ({ default: m.LimsInventory })));

type LimsTab =
  | "dashboard"
  | "orders"
  | "samples"
  | "results"
  | "tests"
  | "qc"
  | "equipment"
  | "inventory";

const tabs: { key: LimsTab; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "orders", label: "Lab Orders", icon: ClipboardList, group: "Workflow" },
  { key: "samples", label: "Sample Collection", icon: TestTube, group: "Workflow" },
  { key: "results", label: "Result Entry", icon: FileCheck2, group: "Workflow" },
  { key: "tests", label: "Test Master", icon: FlaskConical, group: "Configuration" },
  { key: "qc", label: "Quality Control", icon: ShieldCheck, group: "Configuration" },
  { key: "equipment", label: "Equipment", icon: Cpu, group: "Configuration" },
  { key: "inventory", label: "Inventory", icon: Package, group: "Configuration" },
];

const tabGroups = ["Overview", "Workflow", "Configuration"];

export function LaboratoryView() {
  const [tab, setTab] = useState<LimsTab>("dashboard");

  const views: Record<LimsTab, React.ReactNode> = {
    dashboard: <LimsDashboard />,
    orders: <LimsOrders />,
    samples: <LimsSamples />,
    results: <LimsResults />,
    tests: <LimsTestMaster />,
    qc: <LimsQC />,
    equipment: <LimsEquipment />,
    inventory: <LimsInventory />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* LIMS sub-navigation header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm shrink-0">
          <Microscope className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold leading-tight">Laboratory (LIMS)</h2>
          <p className="text-[11px] text-muted-foreground">Order → Sample → Result → Approval → Report</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto scrollbar-thin">
        {tabGroups.map((group) => (
          <div key={group} className="flex items-center gap-1">
            {tabs.filter((t) => t.group === group).map((t) => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
            {group !== tabGroups[tabGroups.length - 1] && (
              <div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Active view */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading...</div>}>
            {views[tab]}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
