/**
 * Plan Enforcement Utilities
 *
 * Checks tenant plan limits before allowing operations.
 * Used by API routes to enforce subscription constraints.
 */
import { db } from "@/lib/db";
import { Prisma } from "../../generated/prisma/client";

/** Resource types that are counted against plan limits */
type Resource = "doctors" | "users" | "branches" | "patients";

/** Prisma model names corresponding to each resource */
const RESOURCE_MODEL: Record<Resource, string> = {
  doctors: "Doctor",
  users: "Staff",
  branches: "Branch",
  patients: "Patient",
};

/** Map from resource name to the corresponding plan limit field */
const PLAN_LIMIT_FIELD: Record<Resource, string> = {
  doctors: "maxDoctors",
  users: "maxUsers",
  branches: "maxBranches",
  patients: "maxStorage",
};

// ---------------------------------------------------------------------------
// canAddResource
// ---------------------------------------------------------------------------

/**
 * Check whether the tenant can add more of a given resource type.
 * Returns the current count, the plan limit, and a message explaining the result.
 */
export async function canAddResource(
  tenantId: string,
  resource: Resource
): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  if (!tenant || !tenant.plan) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      message: "No active plan found for this tenant.",
    };
  }

  const plan = tenant.plan;
  const limitKey = PLAN_LIMIT_FIELD[resource] as keyof typeof plan;
  const limit = (plan as Record<string, unknown>)[limitKey] as number;

  const tableName = RESOURCE_MODEL[resource];

  // Use $queryRaw with parameterised tenantId for SQL-injection safety
  const result = (await db.$queryRaw(
    Prisma.sql`SELECT COUNT(*)::int AS count FROM ${Prisma.raw(`"${tableName}"`)} WHERE "tenantId" = ${tenantId}`
  )) as Array<{ count: number }>;

  const current = result[0]?.count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      message: `Plan limit reached: ${resource} (${current}/${limit}). Please upgrade your plan.`,
    };
  }

  return { allowed: true, current, limit };
}

// ---------------------------------------------------------------------------
// isModuleIncluded
// ---------------------------------------------------------------------------

/**
 * Check whether a platform module is enabled for the tenant.
 * Modules are stored in TenantModule and linked to PlatformModule.
 */
export async function isModuleIncluded(
  tenantId: string,
  moduleName: string
): Promise<boolean> {
  const module = await db.platformModule.findUnique({
    where: { name: moduleName },
  });

  if (!module) return false;

  const tenantModule = await db.tenantModule.findFirst({
    where: {
      tenantId,
      moduleId: module.id,
      enabled: true,
    },
  });

  return !!tenantModule;
}

// ---------------------------------------------------------------------------
// getPlanInfo
// ---------------------------------------------------------------------------

/**
 * Retrieve the full plan information for a tenant, including current usage counts.
 */
export async function getPlanInfo(tenantId: string): Promise<{
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
} | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  if (!tenant?.plan) return null;

  const plan = tenant.plan;

  // Count current resources for the tenant using raw queries to bypass middleware
  const [doctorCount, userCount, branchCount] = await Promise.all([
    db.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int AS count FROM "Doctor" WHERE "tenantId" = ${tenantId}`
    ),
    db.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int AS count FROM "Staff" WHERE "tenantId" = ${tenantId}`
    ),
    db.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int AS count FROM "Branch" WHERE "tenantId" = ${tenantId}`
    ),
  ]);

  return {
    planName: plan.name,
    maxDoctors: plan.maxDoctors,
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    maxStorage: plan.maxStorage,
    hasApi: plan.hasApi,
    hasWhiteLabel: plan.hasWhiteLabel,
    hasTelemedicine: plan.hasTelemedicine,
    hasAI: plan.hasAI,
    currentDoctors: (doctorCount as Array<{ count: number }>)[0]?.count ?? 0,
    currentUsers: (userCount as Array<{ count: number }>)[0]?.count ?? 0,
    currentBranches: (branchCount as Array<{ count: number }>)[0]?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// requirePlanFeature
// ---------------------------------------------------------------------------

/**
 * Middleware-style check for API routes.
 *
 * Returns a function that checks whether the given tenant has the specified
 * boolean feature on their plan.
 *
 * Usage:
 *   const check = requirePlanFeature("hasTelemedicine");
 *   const allowed = await check(tenantId);
 *   if (!allowed) return NextResponse.json({ error: "Feature not available" }, { status: 403 });
 */
export function requirePlanFeature(feature: string) {
  return async (tenantId: string): Promise<boolean> => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });

    if (!tenant?.plan) return false;

    const planRecord = tenant.plan as Record<string, unknown>;
    return planRecord[feature] === true;
  };
}
