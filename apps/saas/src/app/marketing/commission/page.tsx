"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Plus, DollarSign, TrendingUp, Clock } from "lucide-react";

export default function CommissionPage() {
  const [data, setData] = useState<any[]>([]);
  const [kpi, setKpi] = useState<{ totalSettled: number; totalPending: number }>({
    totalSettled: 0,
    totalPending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms-commission")
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setData(d);
        } else if (d && typeof d === "object") {
          setKpi({
            totalSettled: d.totalSettled ?? 0,
            totalPending: d.totalPending ?? 0,
          });
          setData(Array.isArray(d.items) ? d.items : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Referral commission tracking and settlements
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add New
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Settled</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : `$${kpi.totalSettled.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950/40">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : `$${kpi.totalPending.toLocaleString()}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No commission records yet</p>
              <p className="text-sm mt-1">
                Commission records will appear here as referrals are settled
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {item.name || item.title || "Commission"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.description || item.status || ""}
                    </p>
                  </div>
                  <Badge variant="secondary">{item.status || "active"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
