/**
 * Tenant Context via AsyncLocalStorage
 *
 * This module provides request-scoped tenant context using Node.js AsyncLocalStorage.
 * The Next.js middleware sets the tenant ID before the request is processed,
 * and Prisma middleware reads it to automatically filter all queries by tenantId.
 *
 * Flow:
 * 1. Next.js middleware extracts tenantId from JWT → sets AsyncLocalStorage context
 * 2. Prisma middleware reads tenantId from AsyncLocalStorage → injects into query where clause
 * 3. All database queries are automatically scoped to the current tenant
 */
import { AsyncLocalStorage } from "async_hooks";

interface TenantStore {
  tenantId: string | null;
  userId: string | null;
  userType: string | null;
  branchId: string | null;
  branchIds: string[];
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Get the current request's tenant ID.
 * Called inside Prisma middleware to read the tenant context.
 */
export function getCurrentTenantId(): string | null {
  const store = tenantStorage.getStore();
  return store?.tenantId ?? null;
}

/**
 * Get the current request's user ID.
 */
export function getCurrentUserId(): string | null {
  const store = tenantStorage.getStore();
  return store?.userId ?? null;
}

/**
 * Get the current request's user type.
 */
export function getCurrentUserType(): string | null {
  const store = tenantStorage.getStore();
  return store?.userType ?? null;
}

/**
 * Check if the current user is a super admin (no tenant filtering needed).
 */
export function isSuperAdmin(): boolean {
  return getCurrentUserType() === "admin";
}

/**
 * Get the current request's branch ID (for staff branch isolation).
 */
export function getCurrentBranchId(): string | null {
  const store = tenantStorage.getStore();
  return store?.branchId ?? null;
}

/**
 * Get all branch IDs for the current staff member (multi-branch support).
 */
export function getCurrentBranchIds(): string[] {
  const store = tenantStorage.getStore();
  return store?.branchIds ?? [];
}
