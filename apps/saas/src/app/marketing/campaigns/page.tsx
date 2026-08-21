"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, Search, DollarSign, Users, TrendingUp } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/cms-campaigns")
      .then((res) => res.json())
      .then((d) => {
        setCampaigns(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    paused: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    completed: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your marketing campaigns
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-teal-600" />
            All Campaigns
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
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Platform</th>
                    <th className="text-left font-medium text-muted-foreground py-3 px-3">Status</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Budget</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Spent</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Leads</th>
                    <th className="text-right font-medium text-muted-foreground py-3 px-3">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No campaigns found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-border table-row-hover">
                        <td className="py-3 px-3 font-medium">{campaign.name}</td>
                        <td className="py-3 px-3 text-muted-foreground capitalize">{campaign.platform}</td>
                        <td className="py-3 px-3">
                          <Badge className={statusColor[campaign.status] || ""}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          Rs. {campaign.budget.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          Rs. {campaign.spent.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">{campaign.leads}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{campaign.conversions}</td>
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
