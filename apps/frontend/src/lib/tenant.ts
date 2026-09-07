/**
 * Tenant Context Utilities
 *
 * Provides helpers for multi-tenant data isolation.
 * tenantId is extracted from the JWT token (set during login) and passed
 * through middleware as the x-tenant-id header.
 */
import { getAuthTenantId } from "./auth";
import { db } from "./db";

export interface TenantContext {
  tenantId: string | null;
  isAdmin: boolean;
}

/**
 * Extract tenant context from a request.
 * - Super admins (type "admin") get null tenantId (they can access all tenants)
 * - Regular users, doctors, patients get their tenantId from the JWT
 */
export function getTenantContext(request: Request): TenantContext {
  const userType = request.headers.get("x-user-type") || "user";
  const tenantId = getAuthTenantId(request);

  // Super admins can access all tenants
  const isAdmin = userType === "admin";

  return {
    tenantId: isAdmin ? null : tenantId,
    isAdmin,
  };
}

/**
 * Build a Prisma where clause that filters by tenantId.
 * Returns an empty object if no tenant filtering is needed (super admin).
 */
export function tenantWhere(
  ctx: TenantContext,
  extraWhere?: Record<string, unknown>
): Record<string, unknown> {
  const where: Record<string, unknown> = { ...extraWhere };

  if (ctx.tenantId) {
    where.tenantId = ctx.tenantId;
  }

  return where;
}

/**
 * Build a Prisma create data object that includes tenantId.
 * Returns the data unchanged if no tenant context (super admin creating global data).
 */
export function tenantData<T extends Record<string, unknown>>(
  ctx: TenantContext,
  data: T
): T {
  if (ctx.tenantId) {
    return { ...data, tenantId: ctx.tenantId };
  }
  return data;
}

/**
 * Verify that a record belongs to the current tenant.
 * Returns true if the record is accessible, false otherwise.
 */
export function isOwnedByTenant(
  ctx: TenantContext,
  record: { tenantId?: string | null }
): boolean {
  // Super admins can access all records
  if (ctx.isAdmin) return true;
  // If no tenant context, deny access
  if (!ctx.tenantId) return false;
  // If record has no tenantId set (legacy data), allow access
  if (!record.tenantId) return true;
  // Check ownership
  return record.tenantId === ctx.tenantId;
}

/**
 * Get the tenant's enabled modules.
 */
export async function getTenantModules(tenantId: string): Promise<string[]> {
  const modules = await db.tenantModule.findMany({
    where: { tenantId, enabled: true },
    include: { module: true },
  });
  return modules.map((m) => m.module.name);
}

/**
 * Check if a tenant has a specific module enabled.
 */
export async function isModuleEnabled(
  tenantId: string,
  moduleName: string
): Promise<boolean> {
  const module = await db.tenantModule.findFirst({
    where: {
      tenantId,
      enabled: true,
      module: { name: moduleName },
    },
  });
  return !!module;
}

/**
 * Get tenant plan limits.
 */
export async function getTenantPlanLimits(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  if (!tenant?.plan) {
    return null;
  }

  return {
    planName: tenant.plan.name,
    maxDoctors: tenant.plan.maxDoctors,
    maxUsers: tenant.plan.maxUsers,
    maxStorage: tenant.plan.maxStorage,
    maxBranches: tenant.plan.maxBranches,
    hasApi: tenant.plan.hasApi,
    hasWhiteLabel: tenant.plan.hasWhiteLabel,
    hasTelemedicine: tenant.plan.hasTelemedicine,
    hasAI: tenant.plan.hasAI,
  };
}

/**
 * Check if a tenant is within their plan limits for a specific resource.
 */
export async function isWithinPlanLimits(
  tenantId: string,
  resource: "doctors" | "users" | "branches",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = await getTenantPlanLimits(tenantId);
  if (!limits) return { allowed: true, limit: Infinity, current: currentCount };

  const limitMap = {
    doctors: limits.maxDoctors,
    users: limits.maxUsers,
    branches: limits.maxBranches,
  };

  const limit = limitMap[resource];
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  };
}
