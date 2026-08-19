"use client";

import { useFetch } from "@/lib/use-fetch";
import { KpiCard } from "@/components/cms/kpi-card";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/cms/empty-state";
import { formatRs } from "@/lib/format";
import {
  CalendarClock, Users, Building2, Wallet, Percent, Clock,
  TrendingUp, Target, Phone, UserCheck, Megaphone, Activity,
  Sparkles, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

interface CMSDashboard {
  kpis: {
    todayAppointments: number;
    carelimPatients: number;
    clinicPatients: number;
    revenueToday: number;
    revenueMonth: number;
    commissionToday: number;
    pendingCommission: number;
    paidCommission: number;
    monthCommission: number;
    newLeads: number;
    followupDue: number;
    conversionRate: number;
    totalPatients: number;
    activeLeads: number;
    activeCampaigns: number;
    activeCoordinators: number;
  };
  sourceDist: Record<string, number>;
  leadStatusDist: Record<string, number>;
  trend: { month: string; patients: number; revenue: number; commission: number }[];
  topCampaigns: { name: string; platform: string; leads: number; conversions: number; budget: number; spent: number; roi: number }[];
  topClinics: { clinicId: string; clinicName: string; patients: number }[];
  topDoctors: { doctorId: string; doctorName: string; referrals: number; commission: number }[];
}

const SOURCE_COLORS: Record<string, string> = {
  website: "#0d9488", mobile_app: "#0891b2", call_center: "#8b5cf6", whatsapp: "#10b981",
  facebook: "#3b82f6", google: "#ef4444", landing_page: "#f59e0b", partner: "#ec4899",
  walk_in: "#64748b", reception: "#94a3b8", phone: "#a855f7", hospital_website: "#06b6d4", existing: "#84cc16",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website", mobile_app: "Mobile App", call_center: "Call Center", whatsapp: "WhatsApp",
  facebook: "Facebook", google: "Google Ads", landing_page: "Landing Page", partner: "Partner",
  walk_in: "Walk-in", reception: "Reception", phone: "Phone", hospital_website: "Hospital Website", existing: "Existing",
};

export function CMSDashboard() {
  const { data, loading } = useFetch<CMSDashboard>("/api/cms-dashboard");

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const { kpis, sourceDist, trend, topCampaigns, topClinics, topDoctors } = data;
  const sourceChart = Object.entries(sourceDist).map(([k, v]) => ({ name: SOURCE_LABELS[k] || k, value: v, fill: SOURCE_COLORS[k] || "#94a3b8" }));

  const kpis12 = [
    { label: "Today's Appointments", value: kpis.todayAppointments, icon: CalendarClock, accent: "from-teal-500 to-teal-600", subtitle: `${kpis.totalPatients} total patients` },
    { label: "Carelim Patients", value: kpis.carelimPatients, icon: Users, accent: "from-emerald-500 to-emerald-600", subtitle: "🟢 via Carelim channels" },
    { label: "Clinic Patients", value: kpis.clinicPatients, icon: Building2, accent: "from-cyan-500 to-cyan-600", subtitle: "🔵 direct walk-in" },
    { label: "Revenue (Month)", value: formatRs(kpis.revenueMonth), icon: Wallet, accent: "from-amber-500 to-orange-500", subtitle: `${formatRs(kpis.revenueToday)} today` },
    { label: "Commission (Month)", value: formatRs(kpis.monthCommission), icon: Percent, accent: "from-violet-500 to-violet-600", subtitle: `${formatRs(kpis.commissionToday)} today` },
    { label: "Pending Commission", value: formatRs(kpis.pendingCommission), icon: Clock, accent: "from-rose-500 to-rose-600", subtitle: `${formatRs(kpis.paidCommission)} paid` },
    { label: "New Leads", value: kpis.newLeads, icon: Megaphone, accent: "from-pink-500 to-pink-600", subtitle: `${kpis.activeLeads} active` },
    { label: "Conversion Rate", value: `${kpis.conversionRate}%`, icon: Target, accent: "from-fuchsia-500 to-fuchsia-600", subtitle: "Lead → Patient" },
    { label: "Follow-up Due", value: kpis.followupDue, icon: Phone, accent: "from-blue-500 to-blue-600", subtitle: "Next 3 days" },
    { label: "Active Campaigns", value: kpis.activeCampaigns, icon: TrendingUp, accent: "from-indigo-500 to-indigo-600", subtitle: "Marketing" },
    { label: "Active Coordinators", value: kpis.activeCoordinators, icon: UserCheck, accent: "from-teal-500 to-emerald-600", subtitle: "Care team" },
    { label: "Total Patients", value: kpis.totalPatients, icon: Activity, accent: "from-emerald-500 to-teal-600", subtitle: "All-time" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold leading-tight">Carelim MS Dashboard</h2>
          <p className="text-xs text-muted-foreground">Patient source, referral &amp; commission analytics across all clinics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</Badge>
          <Badge variant="outline" className="gap-1 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Users className="w-3 h-3" /> {kpis.carelimPatients} Carelim</Badge>
          <Badge variant="outline" className="gap-1 text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><Building2 className="w-3 h-3" /> {kpis.clinicPatients} Clinic</Badge>
        </div>
      </div>

      {/* 12 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {kpis12.map((k, i) => <KpiCard key={i} {...k} index={i} />)}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" /> Patients, Revenue &amp; Commission Trend</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="cmsP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} /><stop offset="100%" stopColor="#0d9488" stopOpacity={0} /></linearGradient>
                  <linearGradient id="cmsR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  <linearGradient id="cmsC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="patients" name="Patients" stroke="#0d9488" strokeWidth={2} fill="url(#cmsP)" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#cmsR)" />
                <Area yAxisId="right" type="monotone" dataKey="commission" name="Commission" stroke="#8b5cf6" strokeWidth={2} fill="url(#cmsC)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Patient Source Distribution</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {sourceChart.length === 0 ? <EmptyState icon={Users} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={sourceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2}>
                    {sourceChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top campaigns + clinics + doctors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-pink-500" /> Top Campaigns</CardTitle></CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {topCampaigns.length === 0 ? <EmptyState icon={Megaphone} title="No campaigns" className="py-6" /> : (
              <div className="space-y-2">
                {topCampaigns.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.platform} · {c.leads} leads · {c.conversions} conv.</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${c.roi >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>
                      {c.roi >= 0 ? "+" : ""}{c.roi}% ROI
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-500" /> Top Partner Clinics</CardTitle></CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {topClinics.length === 0 ? <EmptyState icon={Building2} title="No clinics" className="py-6" /> : (
              <div className="space-y-2">
                {topClinics.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0"><Building2 className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{c.clinicName}</p>
                      <p className="text-[10px] text-muted-foreground">{c.patients} patients</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">{c.patients}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4 text-violet-500" /> Top Doctors (by Referrals)</CardTitle></CardHeader>
          <CardContent className="pt-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {topDoctors.length === 0 ? <EmptyState icon={UserCheck} title="No data" className="py-6" /> : (
              <div className="space-y-2">
                {topDoctors.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0"><UserCheck className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{d.doctorName}</p>
                      <p className="text-[10px] text-muted-foreground">{d.referrals} referrals</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0 tabular-nums">{formatRs(d.commission)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
