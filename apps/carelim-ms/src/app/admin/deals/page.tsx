"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import { Handshake, Plus } from "lucide-react";

interface Deal {
  id: string;
  dealNo: string;
  title: string;
  stage: string;
  value: number;
  currency: string;
  probability: number;
  priority: string;
  contact: { name: string } | null;
  createdAt: string;
}

const STAGES = [
  { key: "qualification", label: "Qualification", color: "bg-teal-500" },
  { key: "needs_analysis", label: "Needs Analysis", color: "bg-blue-500" },
  { key: "proposal", label: "Proposal", color: "bg-violet-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-amber-500" },
  { key: "closed_won", label: "Closed Won", color: "bg-emerald-500" },
  { key: "closed_lost", label: "Closed Lost", color: "bg-red-500" },
];

const stageColor: Record<string, string> = {
  qualification: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  needs_analysis: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  proposal: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  negotiation: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  closed_won: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed_lost: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm-deals")
      .then((res) => res.json())
      .then((d) => {
        setDeals(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track deals through your sales pipeline
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {deals.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                No deals found. Create your first deal to get started.
              </CardContent>
            </Card>
          ) : (
            deals.map((deal) => (
              <Card key={deal.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{deal.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{deal.dealNo}</p>
                    </div>
                    <Badge className={stageColor[deal.stage] || ""}>
                      {deal.stage.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Value</span>
                      <span className="text-sm font-bold tabular-nums">
                        {deal.currency} {deal.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Contact</span>
                      <span className="text-sm">{deal.contact?.name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Probability</span>
                      <span className="text-sm tabular-nums">{deal.probability}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
