/**
 * Organization module — port of frontend /api/staff, /api/roles,
 * /api/departments, /api/branches, /api/settings, /api/notifications,
 * /api/notification-templates, /api/audit-logs, /api/debug-tenant,
 * /api/tenant/* (tenant self-service), /api/staff-auth/login and
 * /api/doctor-auth.
 *
 * Tenant isolation is enforced by lib/prisma.ts (auditLog, setting, branch,
 * clinicSettings, user, tenantModule, department, staff, doctor are all in
 * TENANT_MODELS); the auth context comes from AsyncLocalStorage, so
 * getAuthEmail/getAuthTenantId become getCurrentUserEmail/getCurrentTenantId.
 * staff-auth/doctor-auth look up staff/doctor cross-tenant via rawDb, exactly
 * like the originals.
 */
import { Router, Request, Response } from "express";
import { db, rawDb } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken } from "../lib/auth";
import { fail, wrap } from "../lib/http";
import { requirePermission } from "../middleware/permissions";
import { getCurrentTenantId, getCurrentUserEmail as _getCurrentUserEmail } from "../lib/tenant-context";
import { checkRateLimit, rateLimitByIp, RATE_LIMITS } from "../lib/rate-limit";

/** AuditLog.user is non-nullable — fall back like the frontend's getAuthEmail(). */
const getCurrentUserEmail = (): string => _getCurrentUserEmail() || "system@carelim.health";

// ─── Rate limiting (same 429 body + headers as frontend rateLimitResponse) ──

async function rateLimitResponse(
  req: Request,
  res: Response,
  config: { windowMs: number; max: number },
  keyPrefix: string
): Promise<boolean> {
  const { allowed, resetAt } = await checkRateLimit(`${keyPrefix}:${rateLimitByIp(req)}`, config);
  if (!allowed) {
    res.set({
      "X-RateLimit-Limit": String(config.max),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
    });
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return true;
  }
  return false;
}

// ─── Staff (/api/staff, /api/staff/[id]) ─────────────────────────────────────

async function listStaff(req: Request, res: Response) {
  const branchId = req.query.branchId as string | undefined;
  const branchFilter = branchId ? { branchId } : {};
  const [staff, departments, prescriptions] = await Promise.all([
    db.staff.findMany({
      where: branchFilter,
      select: {
        id: true, tenantId: true, branchId: true, name: true, email: true,
        phone: true, role: true, department: true, designation: true,
        salary: true, joinDate: true, status: true, lastLogin: true,
        staffBranches: { select: { branchId: true, branch: { select: { id: true, name: true } } } },
        attendance: { orderBy: { date: "desc" }, take: 7 },
        leaveRequests: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({ where: branchFilter, include: { _count: { select: { doctors: true } } } }),
    db.prescription.findMany({
      where: branchFilter,
      include: { patient: true, doctor: { include: { department: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  res.json({ staff, departments, prescriptions });
}

async function createStaff(req: Request, res: Response) {
  try {
    const body = req.body || {};
    if (!body.name || !body.email) {
      return fail(res, 400, "Name and email are required");
    }
    if (!body.password || body.password.length < 8) {
      return fail(res, 400, "Password must be at least 8 characters");
    }
    const hashedPassword = await hashPassword(body.password);
    // Clean empty strings to null for nullable fields
    const branchIds: string[] = body.branchIds || (body.branchId ? [body.branchId] : []);
    const primaryBranchId = branchIds[0] || body.branchId || null;

    // Create staff member (without nested creates to allow branchId scalar)
    const staff = await db.staff.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || "",
        role: body.role || "receptionist",
        department: body.department || null,
        designation: body.designation || null,
        branchId: primaryBranchId,
        password: hashedPassword,
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      },
    });

    // Create multi-branch assignments separately
    if (branchIds.length > 0) {
      await db.staffBranch.createMany({
        data: branchIds.map((bid: string) => ({ staffId: staff.id, branchId: bid })),
      });
    }

    // Fetch with branches for response
    const staffWithBranches = await db.staff.findUnique({
      where: { id: staff.id },
      include: { staffBranches: { select: { branchId: true, branch: { select: { id: true, name: true } } } } },
    });
    await db.auditLog.create({
      data: { user: getCurrentUserEmail(), action: "CREATE", module: "Staff", detail: `Added employee ${staff.name}` },
    });
    // Don't return password in response
    const { password: _pw, ...staffWithoutPassword } = staffWithBranches as unknown as Record<string, unknown>;
    return res.status(201).json(staffWithoutPassword);
  } catch (error) {
    const e = error as { name?: string; message?: string; code?: string; meta?: { target?: string[] } };
    console.error("Staff create error:", e?.name, e?.message, e?.code);
    if (e?.code === "P2002") {
      const field = e?.meta?.target?.[0] || "field";
      return fail(res, 409, `A staff member with this ${field} already exists`);
    }
    return fail(res, 500, e?.message || "Failed to create staff");
  }
}

const STAFF_UPDATABLE = new Set([
  "name", "email", "phone", "gender", "role", "department", "specialization",
  "qualification", "experience", "licenseNumber", "consultationFee", "commissionPct",
  "dateOfBirth", "joinDate", "address", "city", "state", "country", "zipCode",
  "emergencyContact", "emergencyPhone", "avatar", "signature", "status",
  "bankName", "bankAccount", "taxId", "notes",
]);

async function updateStaff(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    for (const key of STAFF_UPDATABLE) {
      if (key in body) data[key] = body[key];
    }
    if (body.joinDate) data.joinDate = new Date(body.joinDate);
    // Hash password if being updated
    if (body.password) {
      if (body.password.length < 8) {
        return fail(res, 400, "Password must be at least 8 characters");
      }
      data.password = await hashPassword(body.password);
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    // Handle multi-branch assignment
    const branchIds: string[] | undefined = body.branchIds;
    if (branchIds !== undefined) {
      const primaryBranchId = branchIds[0] || null;
      data.branchId = primaryBranchId;
      delete data.branchIds;
      // Delete existing and recreate
      await db.staffBranch.deleteMany({ where: { staffId: id } });
      if (branchIds.length > 0) {
        await db.staffBranch.createMany({
          data: branchIds.map((bid: string) => ({ staffId: id, branchId: bid })),
        });
      }
    } else {
      delete data.branchIds;
    }
    const staff = await db.staff.update({
      where: { id },
      data: data as never,
      include: { staffBranches: { select: { branchId: true, branch: { select: { id: true, name: true } } } } },
    });
    // Don't return password in response
    const { password: _pw, ...staffWithoutPassword } = staff as unknown as Record<string, unknown>;
    return res.json(staffWithoutPassword);
  } catch (error) {
    console.error("Error updating staff:", error);
    return fail(res, 500, "Failed to update staff");
  }
}

async function deleteStaff(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.staff.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: getCurrentUserEmail(), action: "DELETE", module: "Staff", detail: "Removed employee" },
  });
  res.json({ ok: true });
}

export function staffRouter(): Router {
  const r = Router();
  r.get("/", wrap(listStaff));
  r.post("/", wrap(createStaff));
  r.put("/:id", wrap(updateStaff));
  r.delete("/:id", wrap(deleteStaff));
  return r;
}

// ─── Roles (/api/roles, /api/roles/[id], /api/roles/[id]/permissions) ────────

async function listRoles(_req: Request, res: Response) {
  try {
    const roles = await db.role.findMany({
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { name: "asc" },
    });
    const permissions = await db.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    res.json({ roles, permissions });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return fail(res, 500, "Failed to fetch roles");
  }
}

async function createRole(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const { name, description, permissions: permIds } = body;
    if (!name) {
      return fail(res, 400, "Role name is required");
    }
    const role = await db.role.create({
      data: {
        name,
        description,
        permissions: { create: (permIds || []).map((id: string) => ({ permissionId: id })) },
      },
    });
    await db.auditLog.create({
      data: { user: getCurrentUserEmail(), action: "CREATE", module: "Role", detail: `Created role ${name}` },
    });
    return res.status(201).json(role);
  } catch (error) {
    console.error("Error creating role:", error);
    return fail(res, 500, "Failed to create role");
  }
}

async function deleteRole(req: Request, res: Response) {
  const id = req.params.id as string;

  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) {
    return fail(res, 404, "Role not found");
  }
  if (role._count.users > 0) {
    return fail(res, 400, `Cannot delete role "${role.name}" — ${role._count.users} user(s) are assigned to it. Reassign them first.`);
  }

  // Delete role permissions first, then the role
  await db.rolePermission.deleteMany({ where: { roleId: id } });
  await db.role.delete({ where: { id } });

  await db.auditLog.create({
    data: { user: getCurrentUserEmail(), action: "DELETE", module: "Role", detail: `Deleted role ${role.name}` },
  });
  res.json({ ok: true });
}

async function updateRolePermissions(req: Request, res: Response) {
  const id = req.params.id as string;
  const { module: mod, action, granted } = req.body || {};

  // Find the permission
  const permission = await db.permission.findFirst({ where: { module: mod, action } });
  if (!permission) {
    return fail(res, 404, "Permission not found");
  }

  if (granted) {
    // Add permission to role
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: id, permissionId: permission.id } },
      create: { roleId: id, permissionId: permission.id },
      update: {},
    });
  } else {
    // Remove permission from role
    await db.rolePermission.deleteMany({ where: { roleId: id, permissionId: permission.id } });
  }

  res.json({ ok: true });
}

export function rolesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listRoles));
  r.post("/", requirePermission("Settings", "create"), wrap(createRole));
  r.delete("/:id", requirePermission("Settings", "delete"), wrap(deleteRole));
  r.put("/:id/permissions", requirePermission("Settings", "edit"), wrap(updateRolePermissions));
  return r;
}

// ─── Departments (/api/departments) ──────────────────────────────────────────

function makeCode(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, "").substring(0, 6).toUpperCase() || "DEPT";
}

async function listDepartments(req: Request, res: Response) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const where = branchId ? { branchId } : {};
    const departments = await db.department.findMany({ where, orderBy: { name: "asc" } });
    res.json(departments);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return fail(res, 500, "Failed to fetch departments");
  }
}

async function createDepartment(req: Request, res: Response) {
  try {
    const { branchId, ...body } = req.body || {};
    // Auto-generate code if not provided
    if (!body.code) {
      const count = await db.department.count();
      body.code = `${makeCode(body.name || "DEPT")}-${String(count + 1).padStart(3, "0")}`;
    }
    const department = await db.department.create({ data: { ...body, branchId } });
    return res.status(201).json(department);
  } catch (error) {
    console.error("Failed to create department:", error);
    return fail(res, 500, "Failed to create department");
  }
}

export function departmentsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listDepartments));
  r.post("/", wrap(createDepartment));
  return r;
}

// ─── Branches (/api/branches, /api/branches/[id]) ────────────────────────────

async function listBranches(_req: Request, res: Response) {
  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });
  res.json(branches);
}

async function createBranch(req: Request, res: Response) {
  const body = req.body || {};
  const { name, code, clinicType, address, city, state, country, zipCode, phone, email, website, timezone, manager } = body;
  if (!name || !code) {
    return fail(res, 400, "Branch name and code are required");
  }
  const branch = await db.branch.create({
    data: {
      name, code,
      clinicType: clinicType || "General",
      address: address || null, city: city || null, state: state || null,
      country: country || "Nepal", zipCode: zipCode || null,
      phone: phone || null, email: email || null, website: website || null,
      timezone: timezone || "Asia/Kathmandu", manager: manager || null,
    },
  });
  await db.auditLog.create({
    data: { user: getCurrentUserEmail(), action: "CREATE", module: "Settings", detail: `Added branch ${branch.name}` },
  });
  res.status(201).json(branch);
}

const BRANCH_UPDATABLE_FIELDS = [
  "name", "code", "clinicType", "address", "city", "state", "country",
  "zipCode", "phone", "email", "website", "timezone", "manager", "status",
] as const;

async function updateBranch(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = {};
  for (const key of BRANCH_UPDATABLE_FIELDS) {
    if (key in body) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) {
    return fail(res, 400, "No valid fields to update");
  }
  const branch = await db.branch.update({ where: { id }, data: data as never });
  res.json(branch);
}

async function deleteBranch(req: Request, res: Response) {
  const id = req.params.id as string;
  await db.branch.delete({ where: { id } });
  res.json({ ok: true });
}

export function branchesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listBranches));
  r.post("/", wrap(createBranch));
  r.put("/:id", wrap(updateBranch));
  r.patch("/:id", wrap(updateBranch)); // PATCH = PUT
  r.delete("/:id", wrap(deleteBranch));
  return r;
}

// ─── Settings (/api/settings) ────────────────────────────────────────────────

async function getSettings(_req: Request, res: Response) {
  try {
    const settings = await db.setting.findMany();
    const obj: Record<string, string> = {};
    settings.forEach((s) => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return fail(res, 500, "Failed to fetch settings");
  }
}

async function updateSettings(req: Request, res: Response) {
  try {
    const body = req.body || {};
    for (const [key, value] of Object.entries(body)) {
      await db.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    await db.auditLog.create({
      data: { user: getCurrentUserEmail(), action: "UPDATE", module: "Settings", detail: "Updated clinic settings" },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return fail(res, 500, "Failed to update settings");
  }
}

export function settingsRouter(): Router {
  const r = Router();
  r.get("/", wrap(getSettings));
  r.put("/", wrap(updateSettings));
  return r;
}

// ─── Notifications (/api/notifications) ──────────────────────────────────────

async function listNotifications(_req: Request, res: Response) {
  // Notifications are not yet implemented in the database
  res.json([]);
}

async function sendNotification(req: Request, res: Response) {
  try {
    const body = req.body || {};
    // Store notification as audit log for now
    return res.status(201).json({ success: true, message: body.message || "Notification sent" });
  } catch (error) {
    return fail(res, 500, "Failed to send notification");
  }
}

export function notificationsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listNotifications));
  r.post("/", wrap(sendNotification));
  return r;
}

// ─── Notification templates (/api/notification-templates) ────────────────────

async function listNotificationTemplates(_req: Request, res: Response) {
  // Notification templates are not yet implemented in the database
  res.json([]);
}

async function createNotificationTemplate(req: Request, res: Response) {
  try {
    const body = req.body || {};
    return res.status(201).json({ id: "template-1", ...body, createdAt: new Date().toISOString() });
  } catch (error) {
    return fail(res, 500, "Failed to create template");
  }
}

export function notificationTemplatesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listNotificationTemplates));
  r.post("/", wrap(createNotificationTemplate));
  return r;
}

// ─── Audit logs (/api/audit-logs) ────────────────────────────────────────────

async function listAuditLogs(_req: Request, res: Response) {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json(logs);
}

export function auditLogsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAuditLogs));
  return r;
}

// ─── Tenant self-service (/api/tenant/*) ─────────────────────────────────────

async function tenantAuditLogs(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(logs);
  } catch (error) {
    console.error("Get tenant audit logs error:", error);
    return fail(res, 500, "Failed to fetch audit logs");
  }
}

// Field whitelist — prevents mass assignment of ids/relations/timestamps
function pickBranchFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "code", "clinicType", "address", "city", "state", "country", "zipCode", "phone", "email", "website", "timezone", "manager", "capacity", "operatingHours", "logo", "status"]) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (typeof body.capacity === "number") data.capacity = body.capacity;
  return data;
}

async function tenantListBranches(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const branches = await db.branch.findMany({
      orderBy: { name: "asc" },
    });
    res.json(branches);
  } catch (error) {
    console.error("Get tenant branches error:", error);
    return fail(res, 500, "Failed to fetch branches");
  }
}

async function tenantCreateBranch(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const body = req.body || {};
    const data = pickBranchFields(body);
    if (!data.name || !data.code) {
      return fail(res, 400, "name and code are required");
    }
    const branch = await db.branch.create({ data: data as never });

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "CREATE",
        module: "Branches",
        detail: `Added branch ${branch.name}`,
      },
    });

    return res.status(201).json(branch);
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return fail(res, 409, "A branch with this code already exists");
    }
    console.error("Create tenant branch error:", error);
    return fail(res, 500, "Failed to create branch");
  }
}

async function tenantGetBranch(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch) {
      return fail(res, 404, "Branch not found");
    }
    return res.json(branch);
  } catch (error) {
    console.error("Get tenant branch error:", error);
    return fail(res, 500, "Failed to fetch branch");
  }
}

async function tenantUpdateBranch(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    const body = req.body || {};
    const branchUpdatable = new Set(["name", "code", "clinicType", "address", "city", "state", "country", "zipCode", "phone", "email", "website", "timezone", "manager", "status"]);
    const data: Record<string, unknown> = {};
    for (const key of branchUpdatable) {
      if (key in body) data[key] = body[key];
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const branch = await db.branch.update({ where: { id }, data: data as never });
    return res.json(branch);
  } catch (error) {
    console.error("Update tenant branch error:", error);
    return fail(res, 500, "Failed to update branch");
  }
}

async function tenantDeleteBranch(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    await db.branch.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "DELETE",
        module: "Branches",
        detail: "Deleted branch",
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant branch error:", error);
    return fail(res, 500, "Failed to delete branch");
  }
}

async function tenantListModules(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const modules = await db.tenantModule.findMany({
      include: { module: true },
    });
    res.json(modules);
  } catch (error) {
    console.error("Get tenant modules error:", error);
    return fail(res, 500, "Failed to fetch modules");
  }
}

async function tenantUpdateModules(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const body = req.body || {};
    const { moduleId, enabled } = body;

    if (!moduleId || typeof enabled !== "boolean") {
      return fail(res, 400, "moduleId and enabled (boolean) are required");
    }

    const existing = await db.tenantModule.findFirst({
      where: { moduleId },
    });

    if (existing) {
      await db.tenantModule.update({
        where: { id: existing.id },
        data: { enabled },
      });
    } else {
      await db.tenantModule.create({
        data: { tenantId, moduleId, enabled },
      });
    }

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: enabled ? "ENABLE" : "DISABLE",
        module: "Modules",
        detail: `Module ${moduleId} ${enabled ? "enabled" : "disabled"}`,
      },
    });

    const modules = await db.tenantModule.findMany({
      include: { module: true },
    });
    return res.json(modules);
  } catch (error) {
    console.error("Update tenant modules error:", error);
    return fail(res, 500, "Failed to update modules");
  }
}

async function tenantGetSettings(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      // No tenant context (e.g., super admin) — return defaults
      return res.json({
        clinicName: "",
        clinicEmail: "info@carelim.health",
        clinicPhone: "",
        address: "",
        city: "",
        country: "Nepal",
        timezone: "Asia/Kathmandu",
        locale: "en",
      });
    }

    let settings = await db.clinicSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await db.clinicSettings.create({
        data: { tenantId },
      });
    }
    return res.json({ ...settings, logoUrl: settings.logo ?? null });
  } catch (error) {
    console.error("Get tenant settings error:", error);
    return fail(res, 500, "Failed to fetch tenant settings");
  }
}

async function tenantUpdateSettings(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return res.status(200).json({ success: true });
    }

    const body = req.body || {};

    // Field whitelist + UI-key → model-field mapping.
    // The settings UI sends keys like email/phone/logoUrl/termsAndConditions,
    // which do not exist on ClinicSettings — passing the raw body to Prisma
    // failed with "Unknown argument" errors. Also prevents mass assignment.
    const data: Record<string, unknown> = {};
    const pick = (source: unknown, target: string) => {
      if (source !== undefined && source !== null) data[target] = source;
    };
    pick(body.clinicName, "clinicName");
    pick(body.address, "address");
    pick(body.city, "city");
    pick(body.state, "state");
    pick(body.country, "country");
    pick(body.zipCode, "zipCode");
    pick(body.timezone, "timezone");
    pick(body.currency, "currency");
    pick(body.currencySymbol, "currencySymbol");
    pick(body.locale, "locale");
    pick(body.dateFormat, "dateFormat");
    pick(body.timeFormat, "timeFormat");
    pick(body.fiscalYearStart, "fiscalYearStart");
    if (typeof body.taxRate === "number") pick(body.taxRate, "taxRate");
    if (typeof body.taxEnabled === "boolean") pick(body.taxEnabled, "taxEnabled");
    if (typeof body.appointmentSlot === "number") pick(body.appointmentSlot, "appointmentSlot");
    if (typeof body.maxAppointments === "number") pick(body.maxAppointments, "maxAppointments");
    if (typeof body.autoReminder === "boolean") pick(body.autoReminder, "autoReminder");
    if (typeof body.reminderHours === "number") pick(body.reminderHours, "reminderHours");
    if (typeof body.smsEnabled === "boolean") pick(body.smsEnabled, "smsEnabled");
    if (typeof body.emailEnabled === "boolean") pick(body.emailEnabled, "emailEnabled");
    if (typeof body.whatsappEnabled === "boolean") pick(body.whatsappEnabled, "whatsappEnabled");
    pick(body.primaryColor, "primaryColor");
    pick(body.secondaryColor, "secondaryColor");
    pick(body.footerText, "footerText");
    pick(body.privacyPolicy, "privacyPolicy");
    // UI aliases → model fields
    pick(body.email, "clinicEmail");
    pick(body.phone, "clinicPhone");
    pick(body.website, "clinicWebsite");
    pick(body.logoUrl, "logo");
    pick(body.termsAndConditions, "termsAndCond");
    // Model-native aliases
    pick(body.clinicEmail, "clinicEmail");
    pick(body.clinicPhone, "clinicPhone");
    pick(body.clinicWebsite, "clinicWebsite");
    pick(body.clinicLogo, "clinicLogo");
    pick(body.termsAndCond, "termsAndCond");

    let settings = await db.clinicSettings.findUnique({
      where: { tenantId },
    });
    if (!settings) {
      settings = await db.clinicSettings.create({
        data: { tenantId, ...data } as never,
      });
    } else {
      settings = await db.clinicSettings.update({
        where: { tenantId },
        data: data as never,
      });
    }

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "UPDATE",
        module: "Settings",
        detail: "Updated clinic settings",
      },
    });

    return res.json(settings);
  } catch (error) {
    console.error("Update tenant settings error:", error);
    return fail(res, 500, "Failed to update tenant settings");
  }
}

async function tenantSubscription(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        invoices: { orderBy: { date: "desc" }, take: 10 },
        tenantModules: { include: { module: true } },
        usageRecords: { orderBy: { date: "desc" }, take: 5 },
        supportTickets: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!tenant) {
      return fail(res, 404, "Tenant not found");
    }

    return res.json(tenant);
  } catch (error) {
    console.error("Get tenant subscription error:", error);
    return fail(res, 500, "Failed to fetch subscription info");
  }
}

async function tenantListUsers(_req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const users = await db.user.findMany({
      include: { role: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Get tenant users error:", error);
    return fail(res, 500, "Failed to fetch users");
  }
}

async function tenantCreateUser(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const body = req.body || {};
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: body.password || "medcore123",
        phone: body.phone,
        roleId: body.roleId,
        branchId: body.branchId,
        status: body.status || "active",
      },
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "CREATE",
        module: "Users",
        detail: `Added user ${user.name}`,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Create tenant user error:", error);
    return fail(res, 500, "Failed to create user");
  }
}

async function tenantGetUser(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    const user = await db.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) {
      return fail(res, 404, "User not found");
    }
    return res.json(user);
  } catch (error) {
    console.error("Get tenant user error:", error);
    return fail(res, 500, "Failed to fetch user");
  }
}

async function tenantUpdateUser(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    const body = req.body || {};
    const userUpdatable = new Set(["name", "email", "phone", "role", "status", "branchId"]);
    const data: Record<string, unknown> = {};
    for (const key of userUpdatable) {
      if (key in body) data[key] = body[key];
    }
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const user = await db.user.update({
      where: { id },
      data: data as never,
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "UPDATE",
        module: "Users",
        detail: `Updated user ${user.name}`,
      },
    });

    return res.json(user);
  } catch (error) {
    console.error("Update tenant user error:", error);
    return fail(res, 500, "Failed to update user");
  }
}

async function tenantDeleteUser(req: Request, res: Response) {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      return fail(res, 401, "Unauthorized");
    }

    const id = req.params.id as string;
    await db.user.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        user: getCurrentUserEmail(),
        action: "DELETE",
        module: "Users",
        detail: "Deleted user",
      },
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Delete tenant user error:", error);
    return fail(res, 500, "Failed to delete user");
  }
}

export function tenantSelfRouter(): Router {
  const r = Router();
  r.get("/audit", wrap(tenantAuditLogs));
  r.get("/branches", wrap(tenantListBranches));
  r.post("/branches", wrap(tenantCreateBranch));
  r.get("/branches/:id", wrap(tenantGetBranch));
  r.put("/branches/:id", wrap(tenantUpdateBranch));
  r.delete("/branches/:id", wrap(tenantDeleteBranch));
  r.get("/modules", wrap(tenantListModules));
  r.put("/modules", wrap(tenantUpdateModules));
  r.get("/settings", wrap(tenantGetSettings));
  r.put("/settings", wrap(tenantUpdateSettings));
  r.get("/subscription", wrap(tenantSubscription));
  r.get("/users", wrap(tenantListUsers));
  r.post("/users", wrap(tenantCreateUser));
  r.get("/users/:id", wrap(tenantGetUser));
  r.put("/users/:id", wrap(tenantUpdateUser));
  r.delete("/users/:id", wrap(tenantDeleteUser));
  return r;
}

// ─── Debug tenant (/api/debug-tenant) — diagnostic endpoint ──────────────────

async function debugTenant(_req: Request, res: Response) {
  // Diagnostic endpoint — never expose tenant internals in production
  if (process.env.NODE_ENV === "production") {
    return fail(res, 404, "Not found");
  }
  const tenantId = getCurrentTenantId();
  // Backend has no module-level tenant fallback; AsyncLocalStorage is the
  // only tenant source, so the module-level check reads the same value.
  const moduleTenantId = getCurrentTenantId();

  const filteredCount = await db.patient.count();
  const rawCount = await rawDb.patient.count();

  res.json({
    tenantId,
    moduleTenantId,
    filteredPatientCount: filteredCount,
    rawPatientCount: rawCount,
    filteringWorks: filteredCount < rawCount || (filteredCount === 0 && rawCount > 0),
  });
}

export function debugTenantRouter(): Router {
  const r = Router();
  r.get("/", wrap(debugTenant));
  return r;
}

// ─── Staff auth (/api/staff-auth/login) — public ─────────────────────────────

async function staffAuthLogin(req: Request, res: Response) {
  const rateLimited = await rateLimitResponse(req, res, RATE_LIMITS.login, "staff-login");
  if (rateLimited) return;

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return fail(res, 400, "Email and password are required");
    }

    // Staff model is NOT in TENANT_MODELS, so this query is unfiltered
    const staff = await rawDb.staff.findUnique({
      where: { email },
      include: {
        branch: { select: { id: true, name: true, tenantId: true, clinicType: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!staff) {
      return fail(res, 401, "Invalid credentials");
    }

    const valid = await verifyPassword(password, staff.password);
    if (!valid) {
      return fail(res, 401, "Invalid credentials");
    }

    if (staff.status !== "active") {
      return fail(res, 403, "Account disabled");
    }

    const tenantId = staff.tenantId || staff.branch?.tenantId || null;

    // Generate JWT with tenant context
    const token = signToken({
      userId: staff.id,
      email: staff.email,
      role: staff.role,
      type: "staff",
      tenantId: tenantId || undefined,
    });

    // Update lastLogin
    await rawDb.staff.update({
      where: { id: staff.id },
      data: { lastLogin: new Date() },
    });

    // Create audit log
    await rawDb.auditLog.create({
      data: {
        user: staff.email,
        action: "LOGIN",
        module: "StaffAuth",
        detail: `Staff member ${staff.name} logged in`,
        ip: (req.headers["x-forwarded-for"] as string) || "127.0.0.1",
      },
    });

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `carelim_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`
    );

    return res.json({
      token,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        branchId: staff.branchId,
        branchName: staff.branch?.name || null,
        branchClinicType: staff.branch?.clinicType || "General",
        tenantId,
        tenantName: staff.tenant?.name || null,
        department: staff.department,
        designation: staff.designation,
        type: "staff",
      },
    });
  } catch (error) {
    const e = error as { name?: string; message?: string; code?: string };
    console.error("Staff login error:", {
      name: e?.name,
      message: e?.message,
      code: e?.code,
    });

    if (e?.name === "PrismaClientValidationError") {
      return res.status(400).json({ error: "Invalid request", detail: e?.message });
    }

    if (e?.name === "PrismaClientKnownRequestError") {
      return res.status(500).json({ error: "Database error", code: e?.code });
    }

    if (e?.name === "PrismaClientUnknownRequestError") {
      return fail(res, 503, "Database connection error");
    }

    return fail(res, 500, "Authentication failed");
  }
}

export function staffAuthLoginHandler() {
  return wrap(staffAuthLogin);
}

// ─── Doctor auth (/api/doctor-auth) — public ─────────────────────────────────

async function doctorAuth(req: Request, res: Response) {
  // Rate limit login attempts
  const rateLimited = await rateLimitResponse(req, res, RATE_LIMITS.login, "doctor-login");
  if (rateLimited) return;

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return fail(res, 400, "Email and password are required");
    }

    const doctor = await rawDb.doctor.findFirst({
      where: { email },
    });

    if (!doctor) {
      return fail(res, 401, "Invalid credentials");
    }

    // Verify password with bcrypt
    const valid = await verifyPassword(password, doctor.password);
    if (!valid) {
      return fail(res, 401, "Invalid credentials");
    }

    // Generate JWT
    const token = signToken({
      userId: doctor.id,
      email: doctor.email,
      role: "doctor",
      type: "doctor",
      tenantId: doctor.tenantId || "",
    });

    // Set HTTP-only cookie
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `carelim_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`
    );

    return res.json({
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        departmentId: doctor.departmentId,
        licenseNumber: doctor.licenseNumber,
        status: doctor.status,
      },
    });
  } catch (error) {
    console.error("Doctor auth error:", error);
    return fail(res, 500, "Authentication failed");
  }
}

export function doctorAuthHandler() {
  return wrap(doctorAuth);
}