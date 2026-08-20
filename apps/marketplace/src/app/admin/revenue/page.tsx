"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@carelim/ui";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

export default function RevenuePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track marketplace revenue and financial metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Total Revenue", value: "$0", icon: DollarSign },
          { title: "This Month", value: "$0", icon: TrendingUp },
          { title: "Pending Payouts", value: "$0", icon: CreditCard },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No revenue data available.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
