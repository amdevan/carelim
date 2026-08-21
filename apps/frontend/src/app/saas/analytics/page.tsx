"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3, TrendingUp, DollarSign, Users } from "lucide-react";

interface AnalyticsData {
  revenueTrend: Array<{ month: string; subscription: number; addOn: number }>;
  tenantGrowth: Array<{ month: string; count: number }>;
  planDistribution: Array<{ name: string; value: number }>;
}

function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl border border-teal-200 p-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-100 rounded mb-4" />
      <div style={{ height }} className="bg-gray-50 rounded-lg" />
    </div>
  );
}

const CHART_COLORS = ["#0d9488", "#10b981", "#14b8a6", "#2dd4bf", "#5eead4"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas-dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData({
          revenueTrend: json?.revenueTrend || [],
          tenantGrowth: json?.tenantGrowth || [],
          planDistribution: (json?.plans || []).map(
            (p: { name: string; tenantCount: number }) => ({
              name: p.name,
              value: p.tenantCount,
            })
          ),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Revenue trends, tenant growth, and plan distribution insights
        </p>
      </div>

      {loading ? (
        <div className="space-y-5">
          <SkeletonChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SkeletonChart height={280} />
            <SkeletonChart height={280} />
          </div>
        </div>
      ) : (
        <>
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl border border-teal-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.revenueTrend || []}>
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAddon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="subscription"
                    stroke="#0d9488"
                    fill="url(#colorSub)"
                    name="Subscription"
                  />
                  <Area
                    type="monotone"
                    dataKey="addOn"
                    stroke="#10b981"
                    fill="url(#colorAddon)"
                    name="Add-on"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tenant Growth */}
            <div className="bg-white rounded-xl border border-teal-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">Tenant Growth</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.tenantGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Tenants" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-white rounded-xl border border-teal-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">Plan Distribution</h2>
              </div>
              <div className="h-64">
                {(data?.planDistribution || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.planDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(data?.planDistribution || []).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No plan data available
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {(data?.planDistribution || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {item.name} ({item.value})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
