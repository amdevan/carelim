"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ArrowDownUp, ClipboardCheck, Boxes,
} from "lucide-react";
import { AimsDashboard } from "@/components/cms/views/aims/dashboard";
import { AimsItems } from "@/components/cms/views/aims/items";
import { AimsTransfers } from "@/components/cms/views/aims/transfers";
import { AimsAudits } from "@/components/cms/views/aims/audits";

type AimsTab = "dashboard" | "items" | "transfers" | "audits";

const tabs: { key: AimsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "items", label: "Items", icon: Package },
  { key: "transfers", label: "Stock Transfers", icon: ArrowDownUp },
  { key: "audits", label: "Stock Audits", icon: ClipboardCheck },
];

export function InventoryView() {
  const [tab, setTab] = useState<AimsTab>("dashboard");

  const views: Record<AimsTab, React.ReactNode> = {
    dashboard: <AimsDashboard />,
    items: <AimsItems />,
    transfers: <AimsTransfers />,
    audits: <AimsAudits />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AIMS header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/30 shrink-0">
          <Boxes className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Inventory Management System</h2>
          <p className="text-xs text-muted-foreground">Multi-warehouse · Batch & Expiry · Transfers · Audits · Analytics</p>
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
