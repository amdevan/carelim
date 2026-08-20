"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View purchase history and transaction details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Module</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Buyer</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Date</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Amount</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No purchases recorded yet.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
