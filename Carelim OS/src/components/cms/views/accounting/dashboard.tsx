"use client";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, Landmark, Coins, TrendingUp, TrendingDown, AlertCircle,
  Shield, FileText, ArrowUpRight, ArrowDownRight, Download, DollarSign,
  Receipt, Users, Building2,
} from "lucide-react";
import { formatRs, timeAgo } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AcctData {
  kpis: {
    cashInHand: number; bankBalance: number; pettyCash: number; totalCashPosition: number;
    accountsReceivable: number; accountsPayable: number;
    patientOutstanding: number; insuranceReceivable: number; supplierOutstanding: number;
    monthRevenue: number; prevMonthRevenue: number; monthRevenueChange: number;
    monthExpense: number; prevMonthExpense: number; monthExpenseChange: number;
    grossProfit: number; netProfit: number; prevNetProfit: number; netProfitChange: number;
    cashFlowStatus: number;
  };
  revenueByType: { name: string; value: number }[];
  revenueByDoctor: { name: string; revenue: number; patients: number }[];
  expenseByCategory: { name: string; value: number }[];
  monthlyTrend: { month: string; revenue: number; expense: number; profit: number }[];
  arAging: { current: number; days30: number; days60: number; days90: number; over90: number };
  apAging: { current: number; days30: number; days60: number; days90: number; over90: number };
  insuranceStatus: { pending: number; approved: number; rejected: number; paid: number; pendingAmount: number; paidAmount: number };
  cashVsBank: { name: string; value: number }[];
  recentTransactions: { entryNo: string; date: string; description: string; module: string; totalDebit: number; totalCredit: number; items: { accountName: string; debit: number; credit: number }[] }[];
}

const COLORS = ["#0d9488", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#f43f5e"];
const AGING_LABELS = ["Current", "1-30 days", "31-60 days", "61-90 days", "90+ days"];
const AGING_COLORS = ["#10b981", "#0d9488", "#f59e0b", "#f97316", "#f43f5e"];

export function AcctDashboard({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const { data, loading } = useFetch<AcctData>("/api/accounting-dashboard");

  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;

  const { kpis, revenueByType, revenueByDoctor, expenseByCategory, monthlyTrend, arAging, apAging, insuranceStatus, cashVsBank, recentTransactions } = data;

  const handleExport = () => {
    exportToCSV("accounting-financial-summary", ["Metric", "Value"], [
      ["Cash in Hand", formatRs(kpis.cashInHand)],
      ["Bank Balance", formatRs(kpis.bankBalance)],
      ["Petty Cash", formatRs(kpis.pettyCash)],
      ["Total Cash Position", formatRs(kpis.totalCashPosition)],
      ["Accounts Receivable", formatRs(kpis.accountsReceivable)],
      ["Accounts Payable", formatRs(kpis.accountsPayable)],
      ["Patient Outstanding", formatRs(kpis.patientOutstanding)],
      ["Insurance Receivable", formatRs(kpis.insuranceReceivable)],
      ["Supplier Outstanding", formatRs(kpis.supplierOutstanding)],
      ["Monthly Revenue", formatRs(kpis.monthRevenue)],
      ["Monthly Expense", formatRs(kpis.monthExpense)],
      ["Gross Profit", formatRs(kpis.grossProfit)],
      ["Net Profit", formatRs(kpis.netProfit)],
      ["Cash Flow Status", formatRs(kpis.cashFlowStatus)],
    ]);
    toast.success("Financial summary exported");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export Summary</Button>
      </div>

      {/* Financial Position KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Financial Position</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <FinKpi label="Cash in Hand" value={formatRs(kpis.cashInHand)} icon={Wallet} accent="from-teal-500 to-teal-600" index={0} onClick={() => onNavigate ? onNavigate("cashbank") : toast.info("Cash & Bank Book")} />
          <FinKpi label="Bank Balance" value={formatRs(kpis.bankBalance)} icon={Landmark} accent="from-cyan-500 to-cyan-600" index={1} onClick={() => onNavigate ? onNavigate("cashbank") : toast.info("Cash & Bank Book")} />
          <FinKpi label="Petty Cash" value={formatRs(kpis.pettyCash)} icon={Coins} accent="from-amber-500 to-orange-500" index={2} />
          <FinKpi label="Total Cash Position" value={formatRs(kpis.totalCashPosition)} icon={DollarSign} accent="from-emerald-500 to-emerald-600" index={3} />
          <FinKpi label="Accounts Receivable" value={formatRs(kpis.accountsReceivable)} icon={Receipt} accent="from-violet-500 to-purple-600" index={4} onClick={() => onNavigate ? onNavigate("reports") : toast.info("Financial Reports")} />
          <FinKpi label="Accounts Payable" value={formatRs(kpis.accountsPayable)} icon={AlertCircle} accent="from-rose-500 to-rose-600" index={5} onClick={() => onNavigate ? onNavigate("reports") : toast.info("Financial Reports")} />
          <FinKpi label="Cash Flow" value={formatRs(kpis.cashFlowStatus)} icon={kpis.cashFlowStatus >= 0 ? TrendingUp : TrendingDown} accent={kpis.cashFlowStatus >= 0 ? "from-emerald-500 to-emerald-600" : "from-rose-500 to-rose-600"} index={6} />
        </div>
      </div>

      {/* Outstanding KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Outstanding & Receivables</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <FinKpi label="Patient Outstanding" value={formatRs(kpis.patientOutstanding)} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
          <FinKpi label="Insurance Receivable" value={formatRs(kpis.insuranceReceivable)} icon={Shield} accent="from-violet-500 to-violet-600" index={1} />
          <FinKpi label="Supplier Outstanding" value={formatRs(kpis.supplierOutstanding)} icon={Building2} accent="from-amber-500 to-orange-500" index={2} />
          <FinKpi label="Monthly Revenue" value={formatRs(kpis.monthRevenue)} icon={TrendingUp} accent="from-emerald-500 to-emerald-600" index={3} change={kpis.monthRevenueChange} />
          <FinKpi label="Monthly Expense" value={formatRs(kpis.monthExpense)} icon={TrendingDown} accent="from-rose-500 to-rose-600" index={4} change={kpis.monthExpenseChange} />
          <FinKpi label="Net Profit" value={formatRs(kpis.netProfit)} icon={DollarSign} accent={kpis.netProfit >= 0 ? "from-emerald-500 to-emerald-600" : "from-rose-500 to-rose-600"} index={5} change={kpis.netProfitChange} />
        </div>
      </div>

      {/* Charts Row 1: Revenue vs Expense + Cash vs Bank */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue vs Expense Trend</CardTitle>
            <CardDescription className="text-xs">6-month financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="95%" stopColor="#0d9488" stopOpacity={0} /></linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="profG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.3} strokeDasharray="3 3" />
                <XAxis dataKey="month" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip money />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#revG)" name="Revenue" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fill="url(#expG)" name="Expense" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profG)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Position</CardTitle>
            <CardDescription className="text-xs">Cash vs Bank vs Petty Cash</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={cashVsBank} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                  {cashVsBank.map((_, i) => <Cell key={i} fill={["#0d9488", "#06b6d4", "#f59e0b"][i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Revenue by Doctor + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Doctor</CardTitle>
            <CardDescription className="text-xs">Top performing doctors (this month)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByDoctor} layout="vertical">
                <CartesianGrid className="stroke-border" opacity={0.2} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 10 }} width={90} />
                <Tooltip content={<ChartTooltip money />} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription className="text-xs">By category (this month)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={expenseByCategory} layout="vertical">
                <CartesianGrid className="stroke-border" opacity={0.2} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<ChartTooltip money />} />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging + AP Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
            <CardDescription className="text-xs">Outstanding patient dues by age</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {[arAging.current, arAging.days30, arAging.days60, arAging.days90, arAging.over90].map((amt, i) => (
                <div key={i} className="rounded-lg border p-2 text-center" style={{ borderColor: AGING_COLORS[i] + "40" }}>
                  <p className="text-[9px] text-muted-foreground uppercase">{AGING_LABELS[i]}</p>
                  <p className="text-xs font-bold tabular-nums mt-1" style={{ color: AGING_COLORS[i] }}>{formatRs(amt)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 h-3 rounded-full overflow-hidden flex">
              {[arAging.current, arAging.days30, arAging.days60, arAging.days90, arAging.over90].map((amt, i) => {
                const total = arAging.current + arAging.days30 + arAging.days60 + arAging.days90 + arAging.over90 || 1;
                return <div key={i} style={{ width: `${(amt / total) * 100}%`, backgroundColor: AGING_COLORS[i] }} />;
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accounts Payable Aging</CardTitle>
            <CardDescription className="text-xs">Outstanding supplier dues by age</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {[apAging.current, apAging.days30, apAging.days60, apAging.days90, apAging.over90].map((amt, i) => (
                <div key={i} className="rounded-lg border p-2 text-center" style={{ borderColor: AGING_COLORS[i] + "40" }}>
                  <p className="text-[9px] text-muted-foreground uppercase">{AGING_LABELS[i]}</p>
                  <p className="text-xs font-bold tabular-nums mt-1" style={{ color: AGING_COLORS[i] }}>{formatRs(amt)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 h-3 rounded-full overflow-hidden flex">
              {[apAging.current, apAging.days30, apAging.days60, apAging.days90, apAging.over90].map((amt, i) => {
                const total = apAging.current + apAging.days30 + apAging.days60 + apAging.days90 + apAging.over90 || 1;
                return <div key={i} style={{ width: `${(amt / total) * 100}%`, backgroundColor: AGING_COLORS[i] }} />;
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Status + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Insurance Claims Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Pending", count: insuranceStatus.pending, amount: insuranceStatus.pendingAmount, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
              { label: "Approved", count: insuranceStatus.approved, amount: 0, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30" },
              { label: "Paid", count: insuranceStatus.paid, amount: insuranceStatus.paidAmount, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
              { label: "Rejected", count: insuranceStatus.rejected, amount: 0, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[9px]", s.color)}>{s.label}</Badge>
                  <span className="text-sm font-semibold">{s.count}</span>
                </div>
                {s.amount > 0 && <span className="text-xs font-semibold tabular-nums">{formatRs(s.amount)}</span>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription className="text-xs">Latest journal entries from all modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
            {recentTransactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>}
            {recentTransactions.map((txn, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-accent/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium">{txn.entryNo}</span>
                    <Badge className="text-[8px] bg-muted text-muted-foreground">{txn.module}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{txn.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold tabular-nums">{formatRs(txn.totalDebit)}</p>
                  <p className="text-[9px] text-muted-foreground">{timeAgo(txn.date)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Financial KPI Card Component
function FinKpi({ label, value, change, icon: Icon, accent, index, onClick }: {
  label: string; value: string; change?: number; icon: React.ComponentType<{ className?: string }>;
  accent: string; index: number; onClick?: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.2) }}>
      <Card className={cn("card-hover relative overflow-hidden cursor-pointer", onClick && "hover:border-teal-300")} onClick={onClick}>
        <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", accent)} />
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", accent)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            {change !== undefined && (
              <span className={cn("flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                change >= 0 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-rose-600 bg-rose-50 dark:bg-rose-950/30")}>
                {change >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                {Math.abs(change)}%
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg font-bold tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
