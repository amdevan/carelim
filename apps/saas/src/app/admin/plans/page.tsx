"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
import {
  CreditCard,
  Plus,
  Check,
  X,
  Stethoscope,
  Users,
  HardDrive,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxDoctors: number;
  maxUsers: number;
  maxStorage: number;
  isActive: boolean;
  features: string[];
  tenantCount?: number;
}

function formatRs(amount: number): string {
  return `NPR ${amount.toLocaleString("en-NP")}`;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
        }
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Plans & Billing</h1>
          <p className="text-sm text-muted-foreground">{plans.length} subscription plans</p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No plans created yet</p>
            <Button size="sm" className="mt-4 bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              <Plus className="w-4 h-4" /> Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="card-hover relative overflow-hidden">
              {!plan.isActive && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription className="text-xs">
                  {plan.tenantCount || 0} active tenants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold tabular-nums">{formatRs(plan.priceMonthly)}</span>
                  <span className="text-sm text-muted-foreground mb-1">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRs(plan.priceYearly)}/year (save {plan.priceMonthly > 0 ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0}%)
                </p>

                {/* Limits */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    <span>{plan.maxDoctors} doctors</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{plan.maxUsers} users</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span>{plan.maxStorage} GB storage</span>
                  </div>
                </div>

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div className="pt-2 border-t space-y-1.5">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
