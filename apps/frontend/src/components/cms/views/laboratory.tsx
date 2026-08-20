"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ClipboardList, TestTube, FileCheck2, FlaskConical,
  ShieldCheck, Cpu, Package, Microscope,
} from "lucide-react";
import { LimsDashboard } from "@/components/cms/views/lims/dashboard";
import { LimsOrders } from "@/components/cms/views/lims/orders";
import { LimsSamples } from "@/components/cms/views/lims/samples";
import { LimsResults } from "@/components/cms/views/lims/results";
import { LimsTestMaster } from "@/components/cms/views/lims/test-master";
import { LimsQC } from "@/components/cms/views/lims/qc";
import { LimsEquipment } from "@/components/cms/views/lims/equipment";
import { LimsInventory } from "@/components/cms/views/lims/inventory";

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
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Laboratory Information System</h2>
              <p className="text-xs text-muted-foreground">Complete LIMS · Order → Sample → Result → Approval → Report</p>
            </div>
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
          {views[tab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
