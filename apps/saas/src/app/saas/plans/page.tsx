"use client";

import { useState, useEffect } from "react";
import { CreditCard, Plus, Check, Stethoscope, Users, HardDrive } from "lucide-react";

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
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No plans created yet</p>
          <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border bg-card card-hover relative overflow-hidden">
              {!plan.isActive && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 text-xs font-medium">Inactive</span>
                </div>
              )}
              <div className="p-4 pb-3">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.tenantCount || 0} active tenants</p>
              </div>
              <div className="px-4 pb-4 space-y-4">
                {/* Pricing */}
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold tabular-nums">{formatRs(plan.priceMonthly)}</span>
                  <span className="text-sm text-muted-foreground mb-1">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRs(plan.priceYearly)}/year (save {plan.priceMonthly > 0 ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0}%)
                </p>

                {/* Limits */}
                <div className="space-y-2 pt-2 border-t border-border">
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
                  <div className="pt-2 border-t border-border space-y-1.5">
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
                  <button className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">Edit</button>
                  <button className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
