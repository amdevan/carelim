/**
 * React hook for checking plan limits in the frontend.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface PlanInfo {
  planName: string;
  maxDoctors: number;
  maxUsers: number;
  maxBranches: number;
  maxStorage: number;
  hasApi: boolean;
  hasWhiteLabel: boolean;
  hasTelemedicine: boolean;
  hasAI: boolean;
  currentDoctors: number;
  currentUsers: number;
  currentBranches: number;
}

export interface PlanLimits {
  doctors: { current: number; max: number };
  users: { current: number; max: number };
  branches: { current: number; max: number };
  storage: { max: number };
}

export function usePlan() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch plan information");
      }
      const data = await res.json();
      setPlan(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const limits: PlanLimits | null = plan
    ? {
        doctors: { current: plan.currentDoctors, max: plan.maxDoctors },
        users: { current: plan.currentUsers, max: plan.maxUsers },
        branches: { current: plan.currentBranches, max: plan.maxBranches },
        storage: { max: plan.maxStorage },
      }
    : null;

  const usage = plan
    ? {
        doctors: plan.currentDoctors,
        users: plan.currentUsers,
        branches: plan.currentBranches,
      }
    : null;

  /**
   * Check whether the tenant can add more of a given resource.
   */
  const canAdd = useCallback(
    (resource: "doctors" | "users" | "branches"): boolean => {
      if (!limits) return false;
      const entry = limits[resource];
      if (!entry) return false;
      return entry.current < entry.max;
    },
    [limits]
  );

  /**
   * Check whether a plan-level boolean feature is enabled.
   */
  const isModuleEnabled = useCallback(
    (moduleName: string): boolean => {
      if (!plan) return false;
      const key = moduleName as keyof PlanInfo;
      return plan[key] === true;
    },
    [plan]
  );

  return { plan, limits, usage, canAdd, isModuleEnabled, loading, error };
}
