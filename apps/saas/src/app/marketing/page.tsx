"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Users,
  DollarSign,
  Target,
  TrendingUp,
  Megaphone,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface DashboardData {
  totalLeads: number;
  activeCampaigns: number;
  totalPatients: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms-dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d.error ? null : d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const kpis = data
    ? [
        {
          title: "Total Leads",
          value: data.totalLeads.toLocaleString(),
          icon: Target,
          color: "text-teal-600",
          bg: "bg-teal-50 dark:bg-teal-950/40",
        },
        {
          title: "Active Campaigns",
          value: data.activeCampaigns.toLocaleString(),
          icon: Megaphone,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-950/40",
        },
        {
          title: "Total Patients",
          value: data.totalPatients.toLocaleString(),
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950/40",
        },
        {
          title: "Total Revenue",
          value: `Rs. ${data.totalRevenue.toLocaleString()}`,
          icon: DollarSign,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-950/40",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your marketing and CRM performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.title} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="text-2xl font-bold mt-1 tabular-nums">
                          {kpi.value}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                        <Icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { text: "New lead captured from Facebook campaign", time: "2 min ago" },
                  { text: "Referral commission settled for Dr. Sharma", time: "1 hour ago" },
                  { text: "Campaign 'Winter Health Camp' reached 500 leads", time: "3 hours ago" },
                  { text: "Patient converted from lead #MS-1234", time: "5 hours ago" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Conversion Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Lead to Contact", value: "68%", width: "68%" },
                  { label: "Contact to Appointment", value: "42%", width: "42%" },
                  { label: "Appointment to Treatment", value: "85%", width: "85%" },
                  { label: "Overall Conversion", value: "24%", width: "24%" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: item.width }}
                      />
                    </div>
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
