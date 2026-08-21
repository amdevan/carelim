"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Search, DollarSign } from "lucide-react";

interface Referral {
  id: string;
  referralNo: string;
  patientId: string;
  referralSource: string;
  commissionRate: number;
  commissionAmount: number;
  billAmount: number;
  status: string;
  createdAt: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cms-referrals")
      .then((res) => res.json())
      .then((d) => {
        setReferrals(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = referrals.filter(
    (r) =>
      r.referralNo.toLowerCase().includes(search.toLowerCase()) ||
      r.patientId.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    earned: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    settled: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track patient referrals and commission
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search referrals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            All Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Referral #</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Patient</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Source</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Bill Amount</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Commission</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No referrals found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ref) => (
                      <tr key={ref.id} className="border-b border-border table-row-hover">
                        <td className="py-3 px-3 font-mono text-xs">{ref.referralNo}</td>
                        <td className="py-3 px-3 font-medium">{ref.patientId}</td>
                        <td className="py-3 px-3 capitalize text-muted-foreground">{ref.referralSource}</td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          Rs. {ref.billAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          <span className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-500" />
                            Rs. {ref.commissionAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={statusColor[ref.status] || ""}>
                            {ref.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
