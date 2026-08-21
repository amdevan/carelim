"use client";

import { useEffect, useState } from "react";
import { CreditCard, Users, Check, Star, Zap } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxDoctors: number;
  maxPatients: number;
  isActive: boolean;
  tenantCount: number;
  features: string[];
}

function SkeletonPlanCard() {
  return (
    <div className="bg-white rounded-xl border border-teal-200 p-6 animate-pulse">
      <div className="h-5 w-24 bg-gray-100 rounded mb-3" />
      <div className="h-8 w-20 bg-gray-100 rounded mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-full bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((json) => setPlans(Array.isArray(json) ? json : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <p className="text-sm text-gray-500 mt-1">Manage subscription plans available to tenants</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonPlanCard key={i} />)
          : plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border p-6 relative overflow-hidden transition-shadow hover:shadow-md ${
                  plan.isActive ? "border-teal-200" : "border-gray-200 opacity-75"
                }`}
              >
                {i === 1 && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold">
                      <Star className="w-3 h-3" /> Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.priceMonthly)}
                  </span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  {formatPrice(plan.priceYearly)}/year (billed annually)
                </p>

                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Up to {plan.maxDoctors} doctors</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Up to {plan.maxPatients.toLocaleString()} patients</span>
                  </div>
                  {(plan.features || []).slice(0, 3).map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{plan.tenantCount} tenants</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      plan.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
        {!loading && plans.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400">
            <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No plans configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
