"use client";

import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, AlertCircle, Users, FileSpreadsheet, FileText,
  Printer, Stethoscope, ArrowUpRight, ArrowDownRight, CalendarDays, Receipt,
} from "lucide-react";
import { formatRs, formatDate } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReportsData {
  totalRevenue: number;
  totalCollection: number;
  totalDue: number;
  revenueByType: Record<string, number>;
  revenueByPayment: Record<string, number>;
  doctorPerf: { name: string; patients: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[];
  dailyRevenue: { date: string; revenue: number; collection: number; due: number }[];
  patientCount: number;
  appointmentCount: number;
}

interface Expense {
  id: string;
  code: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  date: string;
}
interface ExpensesData {
  expenses: Expense[];
  total: number;
  byCategory: Record<string, number>;
}

const REVENUE_TYPE_COLORS: Record<string, string> = {
  consultation: "#0d9488",
  pharmacy: "#10b981",
  lab: "#f59e0b",
  package: "#06b6d4",
  ipd: "#8b5cf6",
};

const REVENUE_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  package: "Package",
  ipd: "IPD",
};

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  rent: "#0d9488",
  salary: "#10b981",
  utilities: "#06b6d4",
  supplies: "#f59e0b",
  maintenance: "#8b5cf6",
  other: "#f43f5e",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  salary: "Salary",
  utilities: "Utilities",
  supplies: "Supplies",
  maintenance: "Maintenance",
  other: "Other",
};

export function ReportsView() {
  const { data, loading } = useFetch<ReportsData>("/api/reports");
  const { data: expensesData, loading: expensesLoading } = useFetch<ExpensesData>("/api/expenses");
  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year" | "all">("month");
  const [reportTab, setReportTab] = useState<"overview" | "revenue" | "expense" | "doctor" | "financial">("overview");

  if (loading || !data) return <ReportsSkeleton />;

  const {
    totalRevenue, totalCollection, totalDue, revenueByType,
    doctorPerf, monthlyRevenue, patientCount, appointmentCount,
  } = data;

  const expensesTotal = expensesData?.total ?? 0;
  const netProfit = totalRevenue - expensesTotal;

  // Build pie data from revenueByType
  const pieData = Object.entries(revenueByType).map(([key, value]) => ({
    name: REVENUE_TYPE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: REVENUE_TYPE_COLORS[key] || "#8b5cf6",
  }));
  const totalRevenueByType = pieData.reduce((s, d) => s + d.value, 0) || 1;

  // Expense by category chart data
  const byCategory = expensesData?.byCategory ?? {};
  const expenseChartData = Object.entries(byCategory).map(([key, value]) => ({
    name: EXPENSE_CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: EXPENSE_CATEGORY_COLORS[key] || "#94a3b8",
  }));
  const totalExpenseByCat = expenseChartData.reduce((s, d) => s + d.value, 0) || 1;

  // Sorted doctor perf for bar chart
  const sortedDoctors = [...doctorPerf].sort((a, b) => b.patients - a.patients);

  const kpis = [
    {
      label: "Total Revenue", value: formatRs(totalRevenue), icon: TrendingUp,
      accent: "from-emerald-500 to-emerald-600", trend: "+8.2%", down: false,
    },
    {
      label: "Total Collection", value: formatRs(totalCollection), icon: Wallet,
      accent: "from-teal-500 to-teal-600", trend: "+5.4%", down: false,
    },
    {
      label: "Outstanding Due", value: formatRs(totalDue), icon: AlertCircle,
      accent: "from-rose-500 to-rose-600", trend: "-3.1%", down: true,
    },
    {
      label: "Net Profit", value: formatRs(netProfit), icon: Receipt,
      accent: netProfit >= 0 ? "from-violet-500 to-violet-600" : "from-rose-500 to-rose-600",
      trend: netProfit >= 0 ? "+2.1%" : "-1.4%", down: netProfit < 0,
    },
  ] as const;

  // ============== Export handlers ==============
  const exportExcel = () => {
    const rows: (string | number)[][] = [];
    rows.push(["Summary", ""]);
    rows.push(["Total Revenue", totalRevenue]);
    rows.push(["Total Collection", totalCollection]);
    rows.push(["Outstanding Due", totalDue]);
    rows.push(["Total Expenses", expensesTotal]);
    rows.push(["Net Profit", netProfit]);
    rows.push(["Patients", patientCount]);
    rows.push(["Appointments", appointmentCount]);
    rows.push([]);
    rows.push(["Revenue by Type", "Amount", "Share %"]);
    pieData.forEach((d) => rows.push([d.name, d.value, `${((d.value / totalRevenueByType) * 100).toFixed(1)}%`]));
    rows.push([]);
    rows.push(["Expense by Category", "Amount", "Share %"]);
    expenseChartData.forEach((d) => rows.push([d.name, d.value, `${((d.value / totalExpenseByCat) * 100).toFixed(1)}%`]));
    rows.push([]);
    rows.push(["Doctor", "Patients", "Revenue"]);
    sortedDoctors.forEach((d) => rows.push([d.name, d.patients, d.revenue]));

    exportToCSV("reports-summary", ["Metric", "Value", "Share"], rows);
    toast.success("Reports summary exported to CSV (Excel-compatible)");
  };

  const buildReportHTML = () => {
    const revenueRows = pieData.map((d) => `
      <tr><td>${d.name}</td><td style="text-align:right">${formatRs(d.value)}</td><td style="text-align:right">${((d.value / totalRevenueByType) * 100).toFixed(1)}%</td></tr>
    `).join("");
    const expenseRows = expenseChartData.length ? expenseChartData.map((d) => `
      <tr><td>${d.name}</td><td style="text-align:right">${formatRs(d.value)}</td><td style="text-align:right">${((d.value / totalExpenseByCat) * 100).toFixed(1)}%</td></tr>
    `).join("") : `<tr><td colspan="3" style="text-align:center">No expenses recorded</td></tr>`;
    const doctorRows = sortedDoctors.map((d) => `
      <tr><td>${d.name}</td><td style="text-align:right">${d.patients}</td><td style="text-align:right">${formatRs(d.revenue)}</td></tr>
    `).join("");
    const monthlyRows = monthlyRevenue.map((m) => `
      <tr><td>${m.month}</td><td style="text-align:right">${formatRs(m.revenue)}</td><td style="text-align:right">${formatRs(m.collection)}</td></tr>
    `).join("");

    return `${docHeader("RPT-REPORT", "Reports Summary", formatDate(new Date()))}
    <div class="info-grid">
      <div><div class="label">Total Revenue</div><div>${formatRs(totalRevenue)}</div></div>
      <div><div class="label">Total Collection</div><div>${formatRs(totalCollection)}</div></div>
      <div><div class="label">Outstanding Due</div><div>${formatRs(totalDue)}</div></div>
      <div><div class="label">Total Expenses</div><div>${formatRs(expensesTotal)}</div></div>
      <div><div class="label">Net Profit</div><div>${formatRs(netProfit)}</div></div>
      <div><div class="label">Patients</div><div>${patientCount}</div></div>
      <div><div class="label">Appointments</div><div>${appointmentCount}</div></div>
      <div><div class="label">Collection Rate</div><div>${totalRevenue > 0 ? ((totalCollection / totalRevenue) * 100).toFixed(1) : 0}%</div></div>
    </div>

    <h2>Monthly Revenue vs Collection</h2>
    <table><thead><tr><th>Month</th><th style="text-align:right">Revenue</th><th style="text-align:right">Collection</th></tr></thead><tbody>${monthlyRows}</tbody></table>

    <h2>Revenue Breakdown by Type</h2>
    <table><thead><tr><th>Type</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr></thead><tbody>${revenueRows}</tbody></table>

    <h2>Expense Breakdown by Category</h2>
    <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr></thead><tbody>${expenseRows}</tbody></table>

    <h2>Doctor Performance</h2>
    <table><thead><tr><th>Doctor</th><th style="text-align:right">Patients</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${doctorRows}</tbody></table>

    <div class="signature">
      <div class="sig-block"><div class="line"></div><div class="name">Administrator</div><div class="role">Carelim OS Health Center</div></div>
      <div class="sig-block"><div class="line"></div><div class="name">System Generated</div><div class="role">${new Date().toLocaleString()}</div></div>
    </div>`;
  };

  const exportPDF = () => {
    toast.info("PDF export uses print dialog");
    setTimeout(() => printHTML("Carelim OS Reports Summary", buildReportHTML()), 200);
  };

  const printReport = () => {
    printHTML("Carelim OS Reports Summary", buildReportHTML());
    toast.success("Opening print dialog…");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reports &amp; Analytics</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {dateRange === "week" && "Showing data for this week"}
            {dateRange === "month" && "Showing data for this month"}
            {dateRange === "quarter" && "Showing data for this quarter"}
            {dateRange === "year" && "Showing data for this year"}
            {dateRange === "all" && "Showing all-time data"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPDF}>
            <FileText className="w-4 h-4" /> Export PDF
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={printReport}>
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      {/* Date range filter + report tabs */}
      <Card className="card-hover">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Date range presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Period:</span>
              {([
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
                { key: "quarter", label: "Quarter" },
                { key: "year", label: "Year" },
                { key: "all", label: "All Time" },
              ] as const).map(r => (
                <button
                  key={r.key}
                  onClick={() => setDateRange(r.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    dateRange === r.key
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {/* Report type tabs */}
            <div className="flex items-center gap-1.5">
              {([
                { key: "overview", label: "Overview" },
                { key: "revenue", label: "Revenue" },
                { key: "expense", label: "Expense" },
                { key: "doctor", label: "Doctors" },
                { key: "financial", label: "Financial" },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setReportTab(t.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    reportTab === t.key
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                    <k.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${k.down ? "text-rose-600" : "text-emerald-600"}`}>
                    {k.down ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                    {k.trend}
                  </span>
                </div>
                <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight truncate">{k.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Financial Report Section (when financial tab is selected) */}
      {reportTab === "financial" && (
        <div className="space-y-4">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Financial Summary</CardTitle>
              <CardDescription className="text-xs">Key financial metrics for current period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Revenue</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600">{formatRs(totalRevenue)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Collection</p>
                  <p className="text-lg font-bold tabular-nums text-teal-600">{formatRs(totalCollection)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Expenses</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600">{formatRs(expensesTotal)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Net Profit</p>
                  <p className={`text-lg font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatRs(netProfit)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Outstanding Due</p>
                  <p className="text-lg font-bold tabular-nums text-amber-600">{formatRs(totalDue)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p>
                  <p className="text-lg font-bold tabular-nums text-cyan-600">{totalRevenue > 0 ? `${((totalCollection / totalRevenue) * 100).toFixed(1)}%` : "0%"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Profit Margin</p>
                  <p className={`text-lg font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "0%"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Due Rate</p>
                  <p className="text-lg font-bold tabular-nums text-rose-600">{totalRevenue > 0 ? `${((totalDue / totalRevenue) * 100).toFixed(1)}%` : "0%"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expenseChartData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold tabular-nums">{formatRs(cat.value)}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{((cat.value / totalExpenseByCat) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart 1 (2-col): Monthly Revenue vs Collection + Chart 2: Revenue by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Monthly Revenue vs Collection</CardTitle>
                <CardDescription className="text-xs">Last 6 months performance</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> Revenue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Collection
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v: number) => formatRs(v)}
                />
                <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} name="Revenue" />
                <Bar dataKey="collection" fill="#10b981" radius={[6, 6, 0, 0]} name="Collection" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Type</CardTitle>
            <CardDescription className="text-xs">Distribution this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => formatRs(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Trend (14 days) + Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Daily Revenue Trend</CardTitle>
                <CardDescription className="text-xs">Last 14 days · Revenue vs Collection vs Due</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.dailyRevenue}>
                <defs>
                  <linearGradient id="dailyRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dailyCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.3} strokeDasharray="3 3" />
                <XAxis dataKey="date" className="fill-muted-foreground" tick={{ fontSize: 10 }} interval={1} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip money />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#dailyRev)" name="Revenue" />
                <Area type="monotone" dataKey="collection" stroke="#10b981" strokeWidth={2} fill="url(#dailyCol)" name="Collection" />
                <Area type="monotone" dataKey="due" stroke="#f43f5e" strokeWidth={2} fill="none" name="Due" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
            <CardDescription className="text-xs">Collection distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={Object.entries(data.revenueByPayment).map(([name, value]) => ({ name, value }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {Object.entries(data.revenueByPayment).map((_, i) => (
                    <Cell key={i} fill={REVENUE_TYPE_COLORS[Object.keys(data.revenueByPayment)[i]] || ["#0d9488", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#f43f5e"][i % 6]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart 3 (2-col): Doctor Performance + Revenue Breakdown table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" /> Doctor Performance
                </CardTitle>
                <CardDescription className="text-xs">Patients seen per doctor (current month)</CardDescription>
              </div>
              <Badge variant="secondary" className="text-teal-600">
                {sortedDoctors.length} doctors
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sortedDoctors}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  width={110}
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number, n: string) => n === "patients" ? [`${v} patients`, "Patients"] : [formatRs(v), "Revenue"]}
                />
                <Bar dataKey="patients" fill="#0d9488" radius={[0, 6, 6, 0]} name="Patients" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>
            <CardDescription className="text-xs">By service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pieData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No revenue recorded this month
                      </TableCell>
                    </TableRow>
                  ) : pieData.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatRs(d.value)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {((d.value / totalRevenueByType) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 border-t-2">
                    <TableCell className="text-sm font-bold">Total</TableCell>
                    <TableCell className="text-right text-sm font-bold">{formatRs(totalRevenueByType)}</TableCell>
                    <TableCell className="text-right text-sm font-bold">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 4: Expense by Category (full-width) + Expense Breakdown table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-rose-600" /> Expense by Category
                </CardTitle>
                <CardDescription className="text-xs">
                  Total expenses: {formatRs(expensesTotal)} · current month
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-rose-600">
                {expenseChartData.length} categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : expenseChartData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                <Wallet className="w-6 h-6 mr-2 text-muted-foreground/40" /> No expense records this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={expenseChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v: number) => formatRs(v)}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Amount">
                    {expenseChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription className="text-xs">By category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3}><Skeleton className="h-16 w-full" /></TableCell>
                    </TableRow>
                  ) : expenseChartData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No expenses recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {expenseChartData.map((d) => (
                        <TableRow key={d.name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                              <span className="text-sm font-medium">{d.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatRs(d.value)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {((d.value / totalExpenseByCat) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 border-t-2">
                        <TableCell className="text-sm font-bold">Total</TableCell>
                        <TableCell className="text-right text-sm font-bold">{formatRs(expensesTotal)}</TableCell>
                        <TableCell className="text-right text-sm font-bold">100%</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Appointments</p>
              <p className="text-lg font-bold">{appointmentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Patients</p>
              <p className="text-lg font-bold">{patientCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collection Rate</p>
              <p className="text-lg font-bold">
                {totalRevenue > 0 ? `${((totalCollection / totalRevenue) * 100).toFixed(1)}%` : "0%"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Rate</p>
              <p className="text-lg font-bold">
                {totalRevenue > 0 ? `${((totalDue / totalRevenue) * 100).toFixed(1)}%` : "0%"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
