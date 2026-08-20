"use client";

import { useFetch } from "@/lib/use-fetch";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { EmptyState } from "@/components/cms/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Pill, Wallet, ShoppingBag, Truck, TrendingUp, AlertTriangle,
  PackageX, CalendarClock, CalendarX, ClipboardList, FileClock,
  UserCheck, Download, RefreshCw, Activity, ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ---------- Types (match /api/pharmacy-dashboard response) ---------- */

interface PmsDashboardData {
  kpis: {
    totalMedicines: number;
    totalInventoryValue: number;
    todaySales: number;
    todayPurchases: number;
    todayProfit: number;
    lowStock: number;
    outOfStock: number;
    nearExpiry: number;
    expired: number;
    pendingPOs: number;
    pendingSupplierPayments: number;
    pendingCustomerDues: number;
  };
  monthlyTrend: { month: string; sales: number; purchases: number; profit: number }[];
  revenueByCategory: { name: string; value: number; count: number }[];
  topSelling: { name: string; qty: number; revenue: number }[];
  fastMoving: { name: string; qty: number; revenue: number }[];
  slowMoving: { name: string; qty: number; revenue: number }[];
  expiryBuckets: { expired: number; days7: number; days15: number; days30: number; days60: number };
  abcAnalysis: { name: string; qty: number; revenue: number; classification: string; cumulativePct: number }[];
  todayExpiring: { id: string; name: string; batchNo: string; expiryDate: string; stockQty: number }[];
  lowStockAlerts: { id: string; name: string; stockQty: number; reorderLevel: number; supplier: string | null }[];
  recentSales: { invoiceNo: string; patientName: string | null; total: number; saleDate: string; paymentMethod: string }[];
  recentPurchases: { poNumber: string; supplier: string | null; totalAmount: number; status: string; orderDate: string }[];
  pendingPOs: { poNumber: string; supplier: string | null; totalAmount: number; status: string }[];
  pendingTransfers: number;
}

/* ---------- Chart palette ---------- */

const CHART_COLORS = {
  teal: "#0d9488",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  violet: "#8b5cf6",
};

const PIE_PALETTE = [CHART_COLORS.teal, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.cyan, CHART_COLORS.violet, CHART_COLORS.rose];

const ABC_COLORS: Record<string, string> = {
  A: CHART_COLORS.emerald,
  B: CHART_COLORS.amber,
  C: CHART_COLORS.rose,
};

const PAYMENT_BADGE: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  card: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  esewa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  khalti: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  fonepay: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  bank: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  stripe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  paypal: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
};

/* ---------- Skeleton ---------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  );
}

/* ---------- Component ---------- */

export function PmsDashboard() {
  const [refresh, setRefresh] = useState(0);
  const url = refresh ? `/api/pharmacy-dashboard?_r=${refresh}` : "/api/pharmacy-dashboard";
  const { data, loading } = useFetch<PmsDashboardData>(url);

  if (loading || !data) return <DashboardSkeleton />;

  const { kpis } = data;

  const handleRefresh = () => {
    setRefresh((r) => r + 1);
    toast.info("Pharmacy dashboard refreshed");
  };

  const handleExport = () => {
    const rows: (string | number)[][] = [
      ["Total Medicines", kpis.totalMedicines],
      ["Total Inventory Value", formatRs(kpis.totalInventoryValue)],
      ["Today's Sales", formatRs(kpis.todaySales)],
      ["Today's Purchases", formatRs(kpis.todayPurchases)],
      ["Today's Profit", formatRs(kpis.todayProfit)],
      ["Low Stock Items", kpis.lowStock],
      ["Out of Stock Items", kpis.outOfStock],
      ["Near Expiry (30d)", kpis.nearExpiry],
      ["Expired Items", kpis.expired],
      ["Pending POs", kpis.pendingPOs],
      ["Pending Supplier Payments", kpis.pendingSupplierPayments],
      ["Pending Customer Dues", kpis.pendingCustomerDues],
      ["Pending Transfers", data.pendingTransfers],
      ["Expiry — Expired", data.expiryBuckets.expired],
      ["Expiry — Within 7 days", data.expiryBuckets.days7],
      ["Expiry — Within 15 days", data.expiryBuckets.days15],
      ["Expiry — Within 30 days", data.expiryBuckets.days30],
      ["Expiry — Within 60 days", data.expiryBuckets.days60],
    ];
    exportToCSV("pharmacy-dashboard-summary", ["Metric", "Value"], rows);
    toast.success("Pharmacy dashboard summary exported");
  };

  /* 12 KPI cards */
  const kpiCards = [
    { label: "Total Medicines", value: kpis.totalMedicines, icon: Pill, accent: "from-teal-500 to-teal-600" },
    { label: "Inventory Value", value: formatRs(kpis.totalInventoryValue), icon: Wallet, accent: "from-emerald-500 to-emerald-600" },
    { label: "Today's Sales", value: formatRs(kpis.todaySales), icon: ShoppingBag, accent: "from-cyan-500 to-cyan-600" },
    { label: "Today's Purchases", value: formatRs(kpis.todayPurchases), icon: Truck, accent: "from-violet-500 to-violet-600" },
    { label: "Today's Profit", value: formatRs(kpis.todayProfit), icon: TrendingUp, accent: "from-emerald-500 to-teal-600" },
    { label: "Low Stock", value: kpis.lowStock, icon: AlertTriangle, accent: "from-amber-500 to-amber-600" },
    { label: "Out of Stock", value: kpis.outOfStock, icon: PackageX, accent: "from-rose-500 to-rose-600" },
    { label: "Near Expiry 30d", value: kpis.nearExpiry, icon: CalendarClock, accent: "from-orange-500 to-orange-600" },
    { label: "Expired", value: kpis.expired, icon: CalendarX, accent: "from-red-500 to-red-600" },
    { label: "Pending POs", value: kpis.pendingPOs, icon: ClipboardList, accent: "from-teal-500 to-cyan-600" },
    { label: "Pending Supplier Pmnts", value: formatRs(kpis.pendingSupplierPayments), icon: FileClock, accent: "from-amber-500 to-yellow-600" },
    { label: "Pending Customer Dues", value: formatRs(kpis.pendingCustomerDues), icon: UserCheck, accent: "from-rose-500 to-pink-600" },
  ];

  const expiryTiles = [
    { label: "Expired", value: data.expiryBuckets.expired, color: "bg-red-500", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
    { label: "7 Days", value: data.expiryBuckets.days7, color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
    { label: "15 Days", value: data.expiryBuckets.days15, color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "30 Days", value: data.expiryBuckets.days30, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "60 Days", value: data.expiryBuckets.days60, color: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
              <Pill className="w-4.5 h-4.5" />
            </span>
            Pharmacy Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Enterprise Pharmacy Management System</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* 12 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpiCards.map((k, i) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            accent={k.accent}
            index={i}
          />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" /> Monthly Sales Trend
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Last 6 months</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" className="fill-muted-foreground" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis className="fill-muted-foreground" tickLine={false} axisLine={false} fontSize={11} width={56} tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip money />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.teal }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="purchases" name="Purchases" stroke={CHART_COLORS.amber} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.amber }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART_COLORS.emerald} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.emerald }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" /> Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueByCategory.length === 0 ? (
              <EmptyState icon={Wallet} title="No category data" className="py-6" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.revenueByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.revenueByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip money />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Top Selling Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSelling.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No sales data" className="py-6" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical"
                  data={data.topSelling}
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" className="fill-muted-foreground" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={110}
                    tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + "…" : v}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                  <Bar dataKey="qty" name="Qty Sold" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> ABC Analysis
            </CardTitle>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} /> A</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.amber }} /> B</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.rose }} /> C</span>
            </div>
          </CardHeader>
          <CardContent>
            {data.abcAnalysis.length === 0 ? (
              <EmptyState icon={Activity} title="No ABC data" className="py-6" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.abcAnalysis} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="fill-muted-foreground" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + "…" : v} />
                  <YAxis className="fill-muted-foreground" tickLine={false} axisLine={false} fontSize={11} width={56} tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip money />} cursor={{ fill: "rgba(13,148,136,0.06)" }} />
                  <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} barSize={28}>
                    {data.abcAnalysis.map((d, i) => (
                      <Cell key={i} fill={ABC_COLORS[d.classification] || CHART_COLORS.teal} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiry Analysis card */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-600" /> Expiry Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {expiryTiles.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border border-border/60 p-4 ${t.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${t.color}`} />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t.label}</span>
                </div>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${t.text}`}>{t.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">items</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Expiring Medicines */}
        <LiveWidgetCard
          title="Today's Expiring Medicines"
          icon={<CalendarClock className="w-4 h-4 text-rose-600" />}
          empty={data.todayExpiring.length === 0}
          emptyTitle="Nothing expiring soon"
          emptyIcon={CalendarClock}
        >
          <ul className="space-y-2">
            {data.todayExpiring.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">Batch {m.batchNo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formatDate(m.expiryDate)}</p>
                  <p className="text-[10px] text-muted-foreground">Stock: {m.stockQty}</p>
                </div>
              </li>
            ))}
          </ul>
        </LiveWidgetCard>

        {/* Low Stock Alerts */}
        <LiveWidgetCard
          title="Low Stock Alerts"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          empty={data.lowStockAlerts.length === 0}
          emptyTitle="All stock levels healthy"
          emptyIcon={AlertTriangle}
        >
          <ul className="space-y-2">
            {data.lowStockAlerts.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">Supplier: {m.supplier || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{m.stockQty}/{m.reorderLevel}</p>
                  <p className="text-[10px] text-muted-foreground">stock / reorder</p>
                </div>
              </li>
            ))}
          </ul>
        </LiveWidgetCard>

        {/* Recent Sales */}
        <LiveWidgetCard
          title="Recent Sales"
          icon={<ShoppingBag className="w-4 h-4 text-cyan-600" />}
          empty={data.recentSales.length === 0}
          emptyTitle="No sales today"
          emptyIcon={ShoppingBag}
        >
          <ul className="space-y-2">
            {data.recentSales.map((s) => (
              <li key={s.invoiceNo} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate font-mono">{s.invoiceNo}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.patientName || "Walk-in"} · {timeAgo(s.saleDate)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] capitalize ${PAYMENT_BADGE[s.paymentMethod] || ""}`}>{s.paymentMethod}</Badge>
                  <span className="text-sm font-semibold tabular-nums">{formatRs(s.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </LiveWidgetCard>

        {/* Recent Purchases */}
        <LiveWidgetCard
          title="Recent Purchases"
          icon={<Truck className="w-4 h-4 text-violet-600" />}
          empty={data.recentPurchases.length === 0}
          emptyTitle="No recent purchases"
          emptyIcon={Truck}
        >
          <ul className="space-y-2">
            {data.recentPurchases.map((p, i) => (
              <li key={p.poNumber + i} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate font-mono">{p.poNumber}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.supplier || "—"} · {timeAgo(p.orderDate)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ""}`}>{statusLabel(p.status)}</Badge>
                  <span className="text-sm font-semibold tabular-nums">{formatRs(p.totalAmount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </LiveWidgetCard>

        {/* Pending POs */}
        <LiveWidgetCard
          title="Pending Purchase Orders"
          icon={<ClipboardList className="w-4 h-4 text-teal-600" />}
          empty={data.pendingPOs.length === 0}
          emptyTitle="No pending POs"
          emptyIcon={ClipboardList}
          extra={data.pendingTransfers > 0 ? (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:text-amber-300">
              {data.pendingTransfers} transfer(s) pending
            </Badge>
          ) : undefined}
        >
          <ul className="space-y-2">
            {data.pendingPOs.map((p, i) => (
              <li key={p.poNumber + i} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate font-mono">{p.poNumber}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.supplier || "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ""}`}>{statusLabel(p.status)}</Badge>
                  <span className="text-sm font-semibold tabular-nums">{formatRs(p.totalAmount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </LiveWidgetCard>

        {/* Fast/Slow moving summary card */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Movement Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Fast Moving</p>
              <ul className="space-y-1.5">
                {data.fastMoving.length === 0 && <li className="text-xs text-muted-foreground">No data</li>}
                {data.fastMoving.map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                      {m.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{m.qty} sold</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Slow Moving</p>
              <ul className="space-y-1.5">
                {data.slowMoving.length === 0 && <li className="text-xs text-muted-foreground">No data</li>}
                {data.slowMoving.map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate flex items-center gap-1.5">
                      <ArrowRight className="w-3 h-3 text-rose-400 shrink-0" />
                      {m.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{m.qty} sold</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Live widget card helper ---------- */

interface LiveWidgetCardProps {
  title: string;
  icon: React.ReactNode;
  empty: boolean;
  emptyTitle: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function LiveWidgetCard({ title, icon, empty, emptyTitle, emptyIcon: EmptyIcon, extra, children }: LiveWidgetCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
        {extra}
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState icon={EmptyIcon} title={emptyTitle} className="py-6" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
