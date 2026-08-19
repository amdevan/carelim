"use client";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Wallet, Landmark, ArrowUpCircle, ArrowDownCircle, Plus } from "lucide-react";
import { formatRs, formatDate, timeAgo } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";

interface CashTxn { id: string; type: string; amount: number; description: string; reference: string | null; balanceAfter: number; date: string; performedBy: string | null }
interface BankTxn { id: string; bankName: string; accountNo: string | null; type: string; amount: number; description: string; reference: string | null; balanceAfter: number; date: string; performedBy: string | null }

const TXN_TYPE_CONFIG: Record<string, { color: string; icon: typeof ArrowUpCircle; label: string }> = {
  receipt: { color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", icon: ArrowUpCircle, label: "Receipt" },
  payment: { color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30", icon: ArrowDownCircle, label: "Payment" },
  deposit: { color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30", icon: ArrowUpCircle, label: "Deposit" },
  withdraw: { color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: ArrowDownCircle, label: "Withdraw" },
  transfer: { color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30", icon: ArrowUpCircle, label: "Transfer" },
};

export function AcctCashBank() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold">Cash & Bank Book</h3>
        <p className="text-sm text-muted-foreground">Cash transactions, bank accounts, deposits & withdrawals</p>
      </div>
      <Tabs defaultValue="cash">
        <TabsList>
          <TabsTrigger value="cash">Cash Book</TabsTrigger>
          <TabsTrigger value="bank">Bank Book</TabsTrigger>
        </TabsList>
        <TabsContent value="cash"><CashBook /></TabsContent>
        <TabsContent value="bank"><BankBook /></TabsContent>
      </Tabs>
    </div>
  );
}

function CashBook() {
  const { data: txns, loading } = useFetch<CashTxn[]>("/api/cash-transactions");
  const pagination = usePagination<CashTxn>(txns || [], 10);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const balance = txns?.[0]?.balanceAfter || 0;
  const totalIn = (txns || []).filter(t => ["receipt", "deposit"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalOut = (txns || []).filter(t => ["payment", "withdraw"].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const handleExport = () => {
    if (!txns?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("cash-book", ["Type", "Amount", "Description", "Reference", "Balance", "Date", "By"],
      txns.map(t => [t.type, t.amount, t.description, t.reference || "", t.balanceAfter, formatDate(t.date), t.performedBy || ""]));
    toast.success("Exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Cash Balance" value={formatRs(balance)} icon={Wallet} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Total In" value={formatRs(totalIn)} icon={ArrowUpCircle} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Total Out" value={formatRs(totalOut)} icon={ArrowDownCircle} accent="from-rose-500 to-rose-600" index={2} />
      </div>
      <Card><CardContent className="p-0">
        {(txns || []).length === 0 ? <EmptyState icon={Wallet} title="No cash transactions" /> : (
          <><Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-[11px] uppercase">Type</TableHead>
              <TableHead className="text-[11px] uppercase">Description</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Balance</TableHead>
              <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
              <TableHead className="text-[11px] uppercase hidden lg:table-cell">Reference</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pagination.paged.map(t => {
                const cfg = TXN_TYPE_CONFIG[t.type] || TXN_TYPE_CONFIG.payment;
                const isIn = ["receipt", "deposit"].includes(t.type);
                return (
                  <TableRow key={t.id} className="table-row-hover">
                    <TableCell><Badge className={`text-[9px] ${cfg.color}`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                      {isIn ? "+" : "−"}{formatRs(t.amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatRs(t.balanceAfter)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(t.date)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground hidden lg:table-cell">{t.reference || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
    </div>
  );
}

function BankBook() {
  const { data: txns, loading } = useFetch<BankTxn[]>("/api/bank-transactions");
  const pagination = usePagination<BankTxn>(txns || [], 10);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const banks = [...new Set((txns || []).map(t => t.bankName))];
  const balance = txns?.[0]?.balanceAfter || 0;
  const totalDeposit = (txns || []).filter(t => ["deposit", "receipt"].includes(t.type)).reduce((s, t) => s + t.amount, 0);
  const totalWithdraw = (txns || []).filter(t => ["withdraw", "payment"].includes(t.type)).reduce((s, t) => s + t.amount, 0);

  const handleExport = () => {
    if (!txns?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("bank-book", ["Bank", "Type", "Amount", "Description", "Reference", "Balance", "Date", "By"],
      txns.map(t => [t.bankName, t.type, t.amount, t.description, t.reference || "", t.balanceAfter, formatDate(t.date), t.performedBy || ""]));
    toast.success("Exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Bank Balance" value={formatRs(balance)} icon={Landmark} accent="from-cyan-500 to-cyan-600" index={0} subtitle={`${banks.length} accounts`} />
        <KpiCard label="Total Deposit" value={formatRs(totalDeposit)} icon={ArrowUpCircle} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Total Withdraw" value={formatRs(totalWithdraw)} icon={ArrowDownCircle} accent="from-rose-500 to-rose-600" index={2} />
      </div>
      <Card><CardContent className="p-0">
        {(txns || []).length === 0 ? <EmptyState icon={Landmark} title="No bank transactions" /> : (
          <><Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-[11px] uppercase">Bank</TableHead>
              <TableHead className="text-[11px] uppercase">Type</TableHead>
              <TableHead className="text-[11px] uppercase">Description</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Balance</TableHead>
              <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pagination.paged.map(t => {
                const isIn = ["deposit", "receipt"].includes(t.type);
                return (
                  <TableRow key={t.id} className="table-row-hover">
                    <TableCell>
                      <p className="text-xs font-medium">{t.bankName}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">{t.accountNo || "—"}</p>
                    </TableCell>
                    <TableCell><Badge className={`text-[9px] ${isIn ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"}`}>{t.type}</Badge></TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                      {isIn ? "+" : "−"}{formatRs(t.amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatRs(t.balanceAfter)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{formatDate(t.date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>
    </div>
  );
}

// ============== Chart of Accounts ==============
interface Account { id: string; code: string; name: string; type: string; group: string; balance: number; isActive: boolean }

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300",
  liability: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
  equity: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
  income: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  expense: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
};

export function AcctChartOfAccounts() {
  const { data: accounts, loading } = useFetch<Account[]>("/api/chart-of-accounts");

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const totalAssets = (accounts || []).filter(a => a.type === "asset").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = (accounts || []).filter(a => a.type === "liability").reduce((s, a) => s + a.balance, 0);
  const totalIncome = (accounts || []).filter(a => a.type === "income").reduce((s, a) => s + a.balance, 0);
  const totalExpenses = (accounts || []).filter(a => a.type === "expense").reduce((s, a) => s + a.balance, 0);

  const handleExport = () => {
    if (!accounts?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("chart-of-accounts", ["Code", "Name", "Type", "Group", "Balance", "Active"],
      accounts.map(a => [a.code, a.name, a.type, a.group, a.balance, a.isActive ? "Yes" : "No"]));
    toast.success("Exported");
  };

  const grouped = ["asset", "liability", "equity", "income", "expense"];
  const groupLabels: Record<string, string> = { asset: "Assets", liability: "Liabilities", equity: "Equity", income: "Income", expense: "Expenses" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Chart of Accounts</h3><p className="text-sm text-muted-foreground">{accounts?.length || 0} accounts</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Assets" value={formatRs(totalAssets)} icon={Wallet} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Total Liabilities" value={formatRs(totalLiabilities)} icon={Landmark} accent="from-rose-500 to-rose-600" index={1} />
        <KpiCard label="Total Income" value={formatRs(totalIncome)} icon={ArrowUpCircle} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Total Expenses" value={formatRs(totalExpenses)} icon={ArrowDownCircle} accent="from-amber-500 to-orange-500" index={3} />
      </div>
      {grouped.map(group => {
        const groupAccounts = (accounts || []).filter(a => a.type === group);
        if (groupAccounts.length === 0) return null;
        return (
          <Card key={group} className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={`text-[9px] ${ACCOUNT_TYPE_COLORS[group]}`}>{groupLabels[group]}</Badge>
                <span className="text-xs text-muted-foreground">{groupAccounts.length} accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[10px] uppercase">Code</TableHead>
                  <TableHead className="text-[10px] uppercase">Account Name</TableHead>
                  <TableHead className="text-[10px] uppercase hidden md:table-cell">Group</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Balance</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {groupAccounts.map(a => (
                    <TableRow key={a.id} className="table-row-hover">
                      <TableCell className="font-mono text-xs font-medium">{a.code}</TableCell>
                      <TableCell className="text-sm font-medium">{a.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{a.group}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(a.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============== Trial Balance ==============
export function AcctTrialBalance() {
  const { data: accounts, loading } = useFetch<Account[]>("/api/chart-of-accounts");

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const totalDebit = (accounts || []).filter(a => a.type === "asset" || a.type === "expense").reduce((s, a) => s + a.balance, 0);
  const totalCredit = (accounts || []).filter(a => a.type === "liability" || a.type === "equity" || a.type === "income").reduce((s, a) => s + a.balance, 0);

  const handleExport = () => {
    if (!accounts?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("trial-balance", ["Code", "Account", "Debit", "Credit"],
      (accounts || []).map(a => {
        const isDebit = a.type === "asset" || a.type === "expense";
        return [a.code, a.name, isDebit ? a.balance : 0, !isDebit ? a.balance : 0];
      }));
    toast.success("Exported");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Trial Balance</h3><p className="text-sm text-muted-foreground">As of {formatDate(new Date())}</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-[11px] uppercase">Code</TableHead>
              <TableHead className="text-[11px] uppercase">Account Name</TableHead>
              <TableHead className="text-[11px] uppercase">Type</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Debit</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Credit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(accounts || []).map(a => {
                const isDebit = a.type === "asset" || a.type === "expense";
                return (
                  <TableRow key={a.id} className="table-row-hover">
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="text-sm font-medium">{a.name}</TableCell>
                    <TableCell><Badge className={`text-[9px] ${ACCOUNT_TYPE_COLORS[a.type] || ""}`}>{a.type}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{isDebit ? formatRs(a.balance) : "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{!isDebit ? formatRs(a.balance) : "—"}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 bg-muted/30">
                <TableCell colSpan={3} className="text-sm font-bold">Total</TableCell>
                <TableCell className="text-right text-sm font-bold tabular-nums text-teal-600">{formatRs(totalDebit)}</TableCell>
                <TableCell className="text-right text-sm font-bold tabular-nums text-rose-600">{formatRs(totalCredit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className={`rounded-lg border p-3 text-center ${totalDebit === totalCredit ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "border-amber-200 bg-amber-50 dark:bg-amber-950/30"}`}>
        <p className={`text-sm font-semibold ${totalDebit === totalCredit ? "text-emerald-600" : "text-amber-600"}`}>
          {totalDebit === totalCredit ? "✓ Trial Balance is Balanced" : `⚠ Difference: ${formatRs(Math.abs(totalDebit - totalCredit))}`}
        </p>
      </div>
    </div>
  );
}

// ============== Financial Reports ==============
export function AcctFinancialReports() {
  const { data: accounts, loading } = useFetch<Account[]>("/api/chart-of-accounts");

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const assets = (accounts || []).filter(a => a.type === "asset");
  const liabilities = (accounts || []).filter(a => a.type === "liability");
  const equity = (accounts || []).filter(a => a.type === "equity");
  const income = (accounts || []).filter(a => a.type === "income");
  const expenses = (accounts || []).filter(a => a.type === "expense");

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
  const totalIncome = income.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netProfit = totalIncome - totalExpenses;

  const reportCards = [
    { title: "Income Statement", desc: "Revenue vs Expenses", value: formatRs(netProfit), color: netProfit >= 0 ? "text-emerald-600" : "text-rose-600", icon: ArrowUpCircle },
    { title: "Balance Sheet", desc: "Assets = Liabilities + Equity", value: formatRs(totalAssets), color: "text-teal-600", icon: Wallet },
    { title: "Cash Flow", desc: "Cash in hand", value: formatRs(assets.find(a => a.code === "1000")?.balance || 0), color: "text-cyan-600", icon: Landmark },
    { title: "Profit & Loss", desc: "Net profit this period", value: formatRs(netProfit), color: netProfit >= 0 ? "text-emerald-600" : "text-rose-600", icon: ArrowDownCircle },
  ];

  const handlePrint = (reportType: string) => {
    const header = docHeader(reportType, "Financial Report", formatDate(new Date()));
    const tableStyle = `<style>table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}th{background:#f0fdfa;color:#0d9488;text-align:left;padding:10px 12px;border-bottom:2px solid #0d9488;font-size:11px;text-transform:uppercase;letter-spacing:.5px}td{padding:10px 12px;border-bottom:1px solid #e2e8f0}tr:nth-child(even) td{background:#f8fafc}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:13px}.row.grand{font-weight:bold;font-size:16px;color:#0d9488;border-bottom:2px solid #0d9488;padding:10px 0}.section-title{font-size:14px;font-weight:700;color:#0d9488;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}</style>`;

    let body = "";
    if (reportType === "Income Statement") {
      body = tableStyle + header + `<h2>Income Statement</h2>
        <div class="section-title">Revenue</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Amount</th></tr></thead><tbody>
        ${income.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Revenue</span><span>${formatRs(totalIncome)}</span></div>
        <div class="section-title">Expenses</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Amount</th></tr></thead><tbody>
        ${expenses.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Expenses</span><span>${formatRs(totalExpenses)}</span></div>
        <div class="row grand" style="margin-top:16px"><span>Net Profit / Loss</span><span style="color:${netProfit >= 0 ? "#059669" : "#e11d48"}">${formatRs(netProfit)}</span></div>`;
    } else if (reportType === "Balance Sheet") {
      body = tableStyle + header + `<h2>Balance Sheet</h2><p style="font-size:12px;color:#64748b;margin-bottom:16px">As of ${formatDate(new Date())}</p>
        <div class="section-title">Assets</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Balance</th></tr></thead><tbody>
        ${assets.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Assets</span><span>${formatRs(totalAssets)}</span></div>
        <div class="section-title">Liabilities</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Balance</th></tr></thead><tbody>
        ${liabilities.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Liabilities</span><span>${formatRs(totalLiabilities)}</span></div>
        <div class="section-title">Equity</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Balance</th></tr></thead><tbody>
        ${equity.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Equity</span><span>${formatRs(totalEquity)}</span></div>
        <div class="row grand" style="margin-top:16px"><span>Total Liabilities + Equity</span><span>${formatRs(totalLiabilities + totalEquity)}</span></div>`;
    } else if (reportType === "Cash Flow") {
      const cashBalance = assets.find((a) => a.code === "1000")?.balance || 0;
      body = tableStyle + header + `<h2>Cash Flow Statement</h2>
        <div class="section-title">Cash Position</div>
        <table><thead><tr><th>Source</th><th style="text-align:right">Amount</th></tr></thead><tbody>
        ${assets.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Cash in Hand (A/c 1000)</span><span>${formatRs(cashBalance)}</span></div>
        <div class="row"><span>Net Income</span><span style="color:${netProfit >= 0 ? "#059669" : "#e11d48"}">${formatRs(netProfit)}</span></div>
        <div class="row grand"><span>Total Assets (Proxy Cash Flow)</span><span>${formatRs(totalAssets)}</span></div>`;
    } else {
      body = tableStyle + header + `<h2>Profit & Loss Statement</h2>
        <div class="section-title">Revenue</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Amount</th></tr></thead><tbody>
        ${income.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Revenue</span><span>${formatRs(totalIncome)}</span></div>
        <div class="section-title">Cost of Operations</div>
        <table><thead><tr><th>Account</th><th style="text-align:right">Amount</th></tr></thead><tbody>
        ${expenses.map((a) => `<tr><td>${a.name}</td><td style="text-align:right;font-weight:600">${formatRs(a.balance)}</td></tr>`).join("")}
        </tbody></table>
        <div class="row grand"><span>Total Expenses</span><span>${formatRs(totalExpenses)}</span></div>
        <div class="row grand" style="margin-top:16px"><span>Net Profit / Loss</span><span style="color:${netProfit >= 0 ? "#059669" : "#e11d48"}">${formatRs(netProfit)}</span></div>`;
    }

    printHTML(reportType, body);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h3 className="text-lg font-bold">Financial Reports</h3><p className="text-sm text-muted-foreground">Income Statement · Balance Sheet · Cash Flow · P&L</p></div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {reportCards.map((r, i) => (
          <Card key={r.title} className="card-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <r.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                </div>
              </div>
              <p className={`text-lg font-bold tabular-nums ${r.color}`}>{r.value}</p>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs h-7" onClick={() => handlePrint(r.title)}>View Report</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income Statement */}
      <Card className="card-hover">
        <CardHeader className="pb-2"><CardTitle className="text-base">Income Statement</CardTitle><CardDescription className="text-xs">Revenue and expenses for current period</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold mb-2 text-emerald-600">REVENUE</p>
              <div className="space-y-1">
                {income.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-semibold tabular-nums">{formatRs(a.balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t-2">
                  <span>Total Revenue</span><span className="tabular-nums text-emerald-600">{formatRs(totalIncome)}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 text-rose-600">EXPENSES</p>
              <div className="space-y-1">
                {expenses.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-semibold tabular-nums">{formatRs(a.balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t-2">
                  <span>Total Expenses</span><span className="tabular-nums text-rose-600">{formatRs(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-4 rounded-lg border p-3 text-center ${netProfit >= 0 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "border-rose-200 bg-rose-50 dark:bg-rose-950/30"}`}>
            <p className="text-xs text-muted-foreground uppercase">Net Profit / Loss</p>
            <p className={`text-xl font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatRs(netProfit)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card className="card-hover">
        <CardHeader className="pb-2"><CardTitle className="text-base">Balance Sheet</CardTitle><CardDescription className="text-xs">As of {formatDate(new Date())}</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold mb-2 text-teal-600">ASSETS</p>
              <div className="space-y-1">
                {assets.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-semibold tabular-nums">{formatRs(a.balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t-2">
                  <span>Total Assets</span><span className="tabular-nums text-teal-600">{formatRs(totalAssets)}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2 text-rose-600">LIABILITIES & EQUITY</p>
              <div className="space-y-1">
                {liabilities.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-semibold tabular-nums">{formatRs(a.balance)}</span>
                  </div>
                ))}
                {equity.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-semibold tabular-nums">{formatRs(a.balance)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-2 border-t-2">
                  <span>Total L&E</span><span className="tabular-nums text-rose-600">{formatRs(totalLiabilities + totalEquity)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
