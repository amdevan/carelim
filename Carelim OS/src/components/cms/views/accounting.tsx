"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, Receipt, TrendingUp, Shield, Wallet,
  Landmark, BookOpen, Scale, BarChart3,
} from "lucide-react";
import { AcctDashboard } from "@/components/cms/views/accounting/dashboard";
import { AcctJournal, AcctPayments, AcctCommissions, AcctInsurance, AcctExpenses } from "@/components/cms/views/accounting/modules";
import { AcctCashBank, AcctChartOfAccounts, AcctTrialBalance, AcctFinancialReports } from "@/components/cms/views/accounting/financials";

type AcctTab = "dashboard" | "journal" | "payments" | "expenses" | "commissions" | "insurance" | "cashbank" | "accounts" | "trial" | "reports";

const tabs: { key: AcctTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "journal", label: "Journal", icon: FileText },
  { key: "payments", label: "Payments", icon: Receipt },
  { key: "expenses", label: "Expenses", icon: TrendingUp },
  { key: "commissions", label: "Commissions", icon: Wallet },
  { key: "insurance", label: "Insurance", icon: Shield },
  { key: "cashbank", label: "Cash & Bank", icon: Landmark },
  { key: "accounts", label: "Chart of Accounts", icon: BookOpen },
  { key: "trial", label: "Trial Balance", icon: Scale },
  { key: "reports", label: "Financial Reports", icon: BarChart3 },
];

export function AccountingView() {
  const [tab, setTab] = useState<AcctTab>("dashboard");

  const views: Record<AcctTab, React.ReactNode> = {
    dashboard: <AcctDashboard onNavigate={(t) => setTab(t as AcctTab)} />,
    journal: <AcctJournal />,
    payments: <AcctPayments />,
    expenses: <AcctExpenses />,
    commissions: <AcctCommissions />,
    insurance: <AcctInsurance />,
    cashbank: <AcctCashBank />,
    accounts: <AcctChartOfAccounts />,
    trial: <AcctTrialBalance />,
    reports: <AcctFinancialReports />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30 shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Accounting & Finance</h2>
          <p className="text-xs text-muted-foreground">Auto-posted journal entries · Double-entry bookkeeping · Financial statements</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto scrollbar-thin">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
                active ? "bg-teal-600 text-white shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {views[tab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
