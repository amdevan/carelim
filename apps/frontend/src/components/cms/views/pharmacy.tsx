"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, ShoppingBag, RotateCcw, Pill,
} from "lucide-react";
import { PmsDashboard } from "@/components/cms/views/pms/dashboard";
import { PmsMedicines } from "@/components/cms/views/pms/medicines";
import { PmsPurchases } from "@/components/cms/views/pms/purchases";
import { PmsSales } from "@/components/cms/views/pms/sales";
import { PmsReturns } from "@/components/cms/views/pms/returns";

type PmsTab = "dashboard" | "medicines" | "purchases" | "sales" | "returns";

const tabs: { key: PmsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "medicines", label: "Medicines", icon: Package },
  { key: "purchases", label: "Purchase Orders", icon: ShoppingCart },
  { key: "sales", label: "Sales (POS)", icon: ShoppingBag },
  { key: "returns", label: "Returns", icon: RotateCcw },
];

export function PharmacyView() {
  const [tab, setTab] = useState<PmsTab>("dashboard");

  const views: Record<PmsTab, React.ReactNode> = {
    dashboard: <PmsDashboard />,
    medicines: <PmsMedicines />,
    purchases: <PmsPurchases />,
    sales: <PmsSales />,
    returns: <PmsReturns />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* PMS header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30 shrink-0">
          <Pill className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Pharmacy Management System</h2>
          <p className="text-xs text-muted-foreground">Enterprise PMS · Inventory · POS · Purchases · Expiry · Analytics</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto scrollbar-thin">
        {tabs.map((t) => {
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
