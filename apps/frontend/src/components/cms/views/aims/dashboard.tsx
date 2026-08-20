"use client";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { EmptyState } from "@/components/cms/empty-state";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Package, DollarSign, Boxes, AlertTriangle, ShieldAlert, CalendarClock,
  TrendingDown, ArrowDownUp, MapPin, Activity, Download,
} from "lucide-react";
import { formatRs, timeAgo } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface AimsData {
  kpis: {
    totalInventoryValue: number; totalItems: number; availableStock: number;
    reservedStock: number; damagedStock: number; expiredStock: number;
    nearExpiry: number; lowStockCount: number; pendingPOs: number; pendingTransfers: number;
  };
  stockByCategory: { name: string; value: number }[];
  movementTrend: { date: string; in: number; out: number }[];
  fastMoving: { name: string; qty: number }[];
  slowMoving: { name: string; qty: number }[];
  deadStock: { name: string; days: number }[];
  expiryBuckets: { expired: number; days30: number; days60: number; days90: number };
  lowStockItems: { id: string; name: string; stockQty: number; reorderLevel: number; category: string }[];
  locationSummary: { id: string; name: string; code: string; type: string; itemCount: number; stockValue: number }[];
  recentMovements: { id: string; itemName: string; type: string; direction: string; quantity: number; department: string | null; performedBy: string | null; createdAt: string }[];
  pendingTransfersList: { transferNo: string; from: string; to: string; status: string; items: number }[];
}

const CATEGORY_COLORS = ["#0d9488", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#f43f5e"];

export function AimsDashboard() {
  const { data, loading } = useFetch<AimsData>("/api/inventory-dashboard");

  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;

  const { kpis, stockByCategory, movementTrend, fastMoving, slowMoving, deadStock, expiryBuckets, lowStockItems, locationSummary, recentMovements, pendingTransfersList } = data;

  const handleExport = () => {
    exportToCSV("inventory-dashboard", ["Metric", "Value"], [
      ["Total Inventory Value", formatRs(kpis.totalInventoryValue)],
      ["Total Items", kpis.totalItems],
      ["Available Stock", kpis.availableStock],
      ["Reserved Stock", kpis.reservedStock],
      ["Damaged Stock", kpis.damagedStock],
      ["Expired Stock", kpis.expiredStock],
      ["Near Expiry (30d)", kpis.nearExpiry],
      ["Low Stock Items", kpis.lowStockCount],
      ["Pending Transfers", kpis.pendingTransfers],
    ]);
    toast.success("Dashboard exported");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Inventory Value" value={formatRs(kpis.totalInventoryValue)} icon={DollarSign} accent="from-emerald-500 to-emerald-600" index={0} />
        <KpiCard label="Total Items" value={kpis.totalItems} icon={Package} accent="from-teal-500 to-teal-600" index={1} />
        <KpiCard label="Available Stock" value={kpis.availableStock} icon={Boxes} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Reserved Stock" value={kpis.reservedStock} icon={ShieldAlert} accent="from-violet-500 to-violet-600" index={3} />
        <KpiCard label="Damaged Stock" value={kpis.damagedStock} icon={AlertTriangle} accent="from-rose-500 to-rose-600" index={4} />
        <KpiCard label="Expired Stock" value={kpis.expiredStock} icon={TrendingDown} accent="from-red-500 to-red-600" index={5} />
        <KpiCard label="Near Expiry (30d)" value={kpis.nearExpiry} icon={CalendarClock} accent="from-orange-500 to-orange-600" index={6} />
        <KpiCard label="Low Stock Items" value={kpis.lowStockCount} icon={AlertTriangle} accent="from-amber-500 to-amber-600" index={7} />
        <KpiCard label="Pending Transfers" value={kpis.pendingTransfers} icon={ArrowDownUp} accent="from-teal-500 to-teal-600" index={8} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Movement Trend</CardTitle>
            <CardDescription className="text-xs">Stock IN vs OUT (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={movementTrend}>
                <defs>
                  <linearGradient id="stockIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stockOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid className="stroke-border" opacity={0.3} strokeDasharray="3 3" />
                <XAxis dataKey="date" className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="fill-muted-foreground" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="in" stroke="#0d9488" strokeWidth={2} fill="url(#stockIn)" name="Stock In" />
                <Area type="monotone" dataKey="out" stroke="#f43f5e" strokeWidth={2} fill="url(#stockOut)" name="Stock Out" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Value by Category</CardTitle>
            <CardDescription className="text-xs">Inventory value distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stockByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {stockByCategory.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Analysis + Dead Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expiry Analysis</CardTitle>
            <CardDescription className="text-xs">Batch expiry breakdown</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{expiryBuckets.expired}</p>
              <p className="text-[10px] text-red-600/80 font-medium">Expired</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50 p-3 text-center">
              <p className="text-2xl font-bold text-rose-600">{expiryBuckets.days30}</p>
              <p className="text-[10px] text-rose-600/80 font-medium">≤30 days</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900/50 p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{expiryBuckets.days60}</p>
              <p className="text-[10px] text-orange-600/80 font-medium">≤60 days</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{expiryBuckets.days90}</p>
              <p className="text-[10px] text-amber-600/80 font-medium">≤90 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fast Moving Items</CardTitle>
            <CardDescription className="text-xs">High turnover stock</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fastMoving} layout="vertical">
                <CartesianGrid className="stroke-border" opacity={0.2} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="qty" fill="#0d9488" radius={[0, 4, 4, 0]} name="Quantity Moved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" /> Dead Stock
            </CardTitle>
            <CardDescription className="text-xs">No movement for 90+ days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
            {deadStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No dead stock</p>
            ) : deadStock.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium truncate">{d.name}</span>
                <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200">{d.days}d</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Location summary + Low stock + Recent movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-600" /> Location Summary
            </CardTitle>
            <CardDescription className="text-xs">Multi-warehouse stock</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {locationSummary.map((loc, i) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{loc.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{loc.code} · {loc.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatRs(loc.stockValue)}</p>
                  <p className="text-[10px] text-muted-foreground">{loc.itemCount} items</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock Alerts
            </CardTitle>
            <CardDescription className="text-xs">Items at/below reorder level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All stock levels healthy</p>
            ) : lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.category}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[10px] shrink-0">
                  {item.stockQty}/{item.reorderLevel}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" /> Recent Movements
            </CardTitle>
            <CardDescription className="text-xs">Stock IN/OUT activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
            {recentMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/30 transition-colors">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  m.direction === "in" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                }`}>
                  {m.direction === "in" ? "+" : "−"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.itemName}</p>
                  <p className="text-[10px] text-muted-foreground">{m.type} · {m.department || "—"}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">{m.direction === "in" ? "+" : "−"}{m.quantity}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending transfers */}
      {pendingTransfersList.length > 0 && (
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <ArrowDownUp className="w-4 h-4 text-teal-600" /> Pending Stock Transfers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTransfersList.map((t) => (
              <div key={t.transferNo} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{t.transferNo}</span>
                  <span className="text-sm text-muted-foreground">{t.from} → {t.to}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t.items} items</span>
                  <Badge className={`text-[10px] ${t.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"}`}>
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
