/**
 * Tenant Context via AsyncLocalStorage — port of frontend lib/tenant-context.ts.
 * The auth middleware sets the context; Prisma middleware (lib/prisma.ts) reads it
 * to auto-filter every query by tenantId.
 */
import { AsyncLocalStorage } from "async_hooks";

export interface TenantStore {
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  userType: string | null;
  userRole: string | null;
  branchId: string | null;
  branchIds: string[];
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function getCurrentUserId(): string | null {
  return tenantStorage.getStore()?.userId ?? null;
}

export function getCurrentUserEmail(): string | null {
  return tenantStorage.getStore()?.userEmail ?? null;
}

export function getCurrentUserType(): string | null {
  return tenantStorage.getStore()?.userType ?? null;
}

export function getCurrentUserRole(): string | null {
  return tenantStorage.getStore()?.userRole ?? null;
}

export function isSuperAdmin(): boolean {
  return getCurrentUserType() === "admin";
}

export function getCurrentBranchId(): string | null {
  return tenantStorage.getStore()?.branchId ?? null;
}

export function getCurrentBranchIds(): string[] {
  return tenantStorage.getStore()?.branchIds ?? [];
}
