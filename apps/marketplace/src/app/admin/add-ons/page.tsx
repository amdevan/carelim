"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@carelim/ui";
import { Puzzle, Plus } from "lucide-react";

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  tenantCount: number;
}

export default function AddOnsPage() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/add-ons")
      .then((res) => res.json())
      .then((data) => {
        setAddOns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add-ons</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage available add-ons and extensions
          </p>
        </div>
        <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Add-on
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Add-ons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : addOns.length === 0 ? (
            <div className="text-center py-8">
              <Puzzle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No add-ons available yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Name</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Description</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Price</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Status</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Tenants</th>
                  </tr>
                </thead>
                <tbody>
                  {addOns.map((addon) => (
                    <tr key={addon.id} className="border-b border-border table-row-hover">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-foreground">{addon.name}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-muted-foreground line-clamp-1">{addon.description}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {addon.price === 0 ? "Free" : `$${addon.price}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          className={addon.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                          }
                        >
                          {addon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm text-muted-foreground tabular-nums">{addon.tenantCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
