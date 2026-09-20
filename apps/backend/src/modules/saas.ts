/**
 * SaaS super-admin module — port of the remaining frontend /api routes:
 *   admin-users (+[id]), admin-impersonate, admin/backup-branch,
 *   admin/import-csv, admin/move-to-general, tenant-actions,
 *   saas-audit, saas-dashboard, saas-invoices, saas-modules (+[id]),
 *   saas-settings, add-ons (+[id]), plans, support-tickets (+[id]),
 *   tenants/[id]/branches (+[branchId]), tenants/[id]/settings.
 * Every router here is mounted behind requireSuperAdmin, so handlers do
 * NOT re-check admin access. Response shapes / status codes / error
 * strings / audit entries are identical to the originals.
 *
 * rawDb is used for platform models (the originals imported rawDb as db);
 * the tenant-filtered `db` client is kept for the three admin/* routes that
 * originally used withTenant + db (admin context passes through unfiltered).
 */
import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db, rawDb } from "../lib/prisma";
import { createPatientWithSerialCode } from "../lib/patient-code";
import { fail, wrap } from "../lib/http";
import { hashPassword, signToken } from "../lib/auth";
import { getCurrentUserEmail } from "../lib/tenant-context";

// ─── Inlined nanoid (backend has no nanoid dependency) — same default alphabet ──
const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
function nanoid(size: number): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin-users — port of frontend /api/admin-users and /api/admin-users/[id]
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_ALLOWED_ROLES = ["super_admin", "admin"];

function toPublicAdmin(u: Record<string, unknown>) {
  const { password: _password, ...rest } = u;
  return rest;
}

async function listAdminUsers(_req: Request, res: Response) {
  try {
    const users = await rawDb.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    console.error("[GET /api/admin-users]", error);
    fail(res, 500, "Internal server error");
  }
}

async function createAdminUser(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" && ADMIN_ALLOWED_ROLES.includes(body.role) ? body.role : "admin";
    if (!name || !email || !password) {
      return fail(res, 400, "name, email and password are required");
    }
    const hashed = await hashPassword(password);
    const u = await rawDb.adminUser.create({
      data: { name, email, password: hashed, role, isActive: body?.isActive !== false },
    });
    return res.status(201).json(toPublicAdmin(u as Record<string, unknown>));
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return fail(res, 409, "An admin user with this email already exists");
    }
    console.error("[POST /api/admin-users]", error);
    return fail(res, 500, "Internal server error");
  }
}

async function updateAdminUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.email === "string" && body.email.trim()) data.email = body.email.trim().toLowerCase();
    if (typeof body?.password === "string" && body.password) data.password = await hashPassword(body.password);
    if (typeof body?.role === "string" && ADMIN_ALLOWED_ROLES.includes(body.role)) data.role = body.role;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return fail(res, 400, "No valid fields to update");
    }
    const u = await rawDb.adminUser.update({ where: { id }, data: data as never });
    const { password: _password, ...publicUser } = u as Record<string, unknown>;
    return res.json(publicUser);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Admin user not found");
    }
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return fail(res, 409, "An admin user with this email already exists");
    }
    console.error("[PATCH /api/admin-users/[id]]", error);
    return fail(res, 500, "Internal server error");
  }
}

async function deleteAdminUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await rawDb.adminUser.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      return fail(res, 404, "Admin user not found");
    }
    console.error("[DELETE /api/admin-users/[id]]", error);
    return fail(res, 500, "Internal server error");
  }
}

export function adminUsersRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAdminUsers));
  r.post("/", wrap(createAdminUser));
  r.patch("/:id", wrap(updateAdminUser));
  r.delete("/:id", wrap(deleteAdminUser));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin-impersonate — port of frontend /api/admin-impersonate
// ─────────────────────────────────────────────────────────────────────────────
async function impersonateTenant(req: Request, res: Response) {
  try {
    const { tenantId } = req.body || {};
    if (!tenantId) {
      return fail(res, 400, "tenantId is required");
    }

    const tenant = await rawDb.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        tenantModules: { include: { module: true } },
      },
    });
    if (!tenant) {
      return fail(res, 404, "Tenant not found");
    }

    // Build a lookup map from module names to nav keys
    const MODULE_KEY_MAP: Record<string, string> = {
      "dashboard": "dashboard",
      "patient": "patients",
      "appointment": "appointments",
      "doctor": "doctors",
      "department": "doctors",
      "emr": "emr",
      "prescription": "emr",
      "clinical note": "clinical-notes",
      "laboratory": "laboratory",
      "lims": "laboratory",
      "radiology": "radiology",
      "ris": "radiology",
      "pharmacy": "pharmacy",
      "inventory": "inventory",
      "aims": "inventory",
      "billing": "billing",
      "invoice": "billing",
      "accounting": "accounting",
      "report": "reports",
      "insurance": "insurance",
      "claim": "insurance",
      "human": "hr",
      "hr": "hr",
      "staff": "staff",
      "leave": "leave",
      "audit": "audit",
      "setting": "settings",
      "dental": "dental",
      "ivf": "ivf",
      "fertility": "ivf",
      "telemedicine": "telemedicine",
      "telehealth": "telemedicine",
      "video": "telemedicine",
      "public": "public-booking",
      "booking": "public-booking",
      "notification": "notifications",
      "email": "notifications",
      "sms": "notifications",
      "branch": "branches",
      "branches": "branches",
    };

    // Get enabled module keys
    const enabledModules = tenant.tenantModules
      .filter((tm) => tm.enabled)
      .map((tm) => {
        const name = tm.module.name.toLowerCase();
        // Find the first matching key in the map
        for (const [keyword, navKey] of Object.entries(MODULE_KEY_MAP)) {
          if (name.includes(keyword)) return navKey;
        }
        // Fallback: convert display name to kebab-case nav key
        return tm.module.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      });

    // Log the impersonation using the authenticated admin email
    const adminEmail = getCurrentUserEmail() || "unknown";
    await rawDb.saaSAuditLog.create({
      data: {
        adminEmail,
        tenantId,
        action: "IMPERSONATE",
        module: "Tenants",
        detail: `Impersonated tenant: ${tenant.name}`,
      },
    });

    // Mint an impersonation session token — a tenant-scoped user session for
    // the clinic panel. The admin panel client reads data.token and sets it as
    // the carelim_token cookie; the same cookie is set here with the exact
    // attributes used by admin-auth (HttpOnly, Path, Max-Age, SameSite, Secure
    // only when NODE_ENV === "production").
    const owner = await rawDb.user.findFirst({
      where: { tenantId: tenant.id, email: tenant.ownerEmail },
      include: { role: true },
    });
    const token = signToken({
      userId: owner?.id || tenant.id,
      email: owner?.email || tenant.ownerEmail,
      role: owner?.role?.name || "Administrator",
      type: "user",
      tenantId: tenant.id,
    });

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `carelim_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`
    );

    return res.json({
      success: true,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.ownerEmail,
        plan: tenant.plan?.name || "trial",
        status: tenant.status,
        enabledModules,
      },
    });
  } catch {
    return fail(res, 500, "Failed to impersonate tenant");
  }
}

export function adminImpersonateRouter(): Router {
  const r = Router();
  r.post("/", wrap(impersonateTenant));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin — port of frontend /api/admin/backup-branch, /api/admin/import-csv
// and /api/admin/move-to-general (originally withTenant + filtered db).
// ─────────────────────────────────────────────────────────────────────────────
async function backupBranch(req: Request, res: Response) {
  const { sourceBranchId, targetBranchId } = req.body || {};

  if (!sourceBranchId || !targetBranchId) {
    return fail(res, 400, "sourceBranchId and targetBranchId are required");
  }

  if (sourceBranchId === targetBranchId) {
    return fail(res, 400, "Source and target branches must be different");
  }

  // Verify both branches exist
  const [sourceBranch, targetBranch] = await Promise.all([
    db.branch.findUnique({ where: { id: sourceBranchId } }),
    db.branch.findUnique({ where: { id: targetBranchId } }),
  ]);

  if (!sourceBranch || !targetBranch) {
    return fail(res, 404, "Branch not found");
  }

  const results: Record<string, number> = {};

  // Tables with branchId that can be backed up
  const tablesWithBranchId = [
    { model: "patient", fields: ["name", "patientCode", "phone", "email", "gender", "dob", "age", "bloodGroup", "address", "city", "status"] },
    { model: "doctor", fields: ["name", "specialization", "phone", "email", "qualification", "experience", "consultationFee", "status"] },
    { model: "staff", fields: ["name", "role", "department", "phone", "email", "salary", "status"] },
    { model: "department", fields: ["name", "code", "description", "status"] },
    { model: "medicine", fields: ["name", "genericName", "category", "strength", "form", "manufacturer", "buyPrice", "salePrice", "stock", "status"] },
  ];

  for (const table of tablesWithBranchId) {
    try {
      // Get all records from source branch
      const sourceRecords = await (db as any)[table.model].findMany({
        where: { branchId: sourceBranchId },
        select: { id: true, ...Object.fromEntries(table.fields.map((f) => [f, true])) },
      });

      if (sourceRecords.length === 0) {
        results[table.model] = 0;
        continue;
      }

      // Create copies in target branch with new IDs
      let count = 0;
      for (const record of sourceRecords) {
        const { id: _oldId, ...data } = record;
        await (db as any)[table.model].create({
          data: {
            ...data,
            branchId: targetBranchId,
          },
        });
        count++;
      }
      results[table.model] = count;
    } catch {
      results[table.model] = -1;
    }
  }

  res.json({
    success: true,
    source: { id: sourceBranch.id, name: sourceBranch.name },
    target: { id: targetBranch.id, name: targetBranch.name },
    backedUp: results,
  });
}

async function importCsv(req: Request, res: Response) {
  const { type, branchId, csvData } = req.body || {};

  if (!type || !branchId || !csvData) {
    return fail(res, 400, "type, branchId, and csvData are required");
  }

  // Verify branch exists
  const branch = await db.branch.findUnique({ where: { id: branchId } });
  if (!branch) {
    return fail(res, 404, "Branch not found");
  }

  // Parse CSV
  const lines: string[] = csvData.trim().split("\n");
  if (lines.length < 2) {
    return fail(res, 400, "CSV must have headers and at least one data row");
  }

  const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const rows = lines.slice(1).map((line: string) => {
    const values = line.split(",").map((v: string) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h: string, i: number) => { obj[h] = values[i] || ""; });
    return obj;
  });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // For doctor imports, ensure a default department exists
  let defaultDepartmentId: string | null = null;
  if (type === "doctors") {
    const dept = await db.department.findFirst({ where: { branchId } });
    if (dept) {
      defaultDepartmentId = dept.id;
    } else {
      const created = await db.department.create({
        data: { name: "General", code: "GEN", branchId },
      });
      defaultDepartmentId = created.id;
    }
  }

  for (const row of rows) {
    try {
      switch (type) {
        case "patients": {
          const name = row.name || row.patientname || row.patient_name || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";
          const gender = row.gender || row.sex || "";
          const bloodGroup = row.bloodgroup || row.blood_group || row.blood || "";
          const address = row.address || row.location || "";

          if (!name) { skipped++; continue; }

          await createPatientWithSerialCode(db, {
            name,
            phone,
            email: email || null,
            gender: (gender || null) as never,
            bloodGroup: bloodGroup || null,
            address: address || null,
            branchId,
            status: "active",
          });
          imported++;
          break;
        }
        case "doctors": {
          const name = row.name || row.doctorname || row.doctor_name || "";
          const specialization = row.specialization || row.specialty || row.department || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";
          const qualification = row.qualification || row.degree || row.education || "";

          if (!name) { skipped++; continue; }

          await db.doctor.create({
            data: {
              name,
              email: email || `import-${Date.now()}@placeholder.local`,
              password: "changeme",
              phone: phone || "0000000000",
              specialization: specialization || "General",
              qualification: qualification || "MBBS",
              departmentId: defaultDepartmentId!,
              licenseNumber: `IMPORT-${Date.now()}`,
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        case "staff": {
          const name = row.name || row.staffname || row.staff_name || "";
          const role = row.role || row.position || row.designation || "";
          const department = row.department || row.dept || "";
          const phone = row.phone || row.mobile || row.contact || "";
          const email = row.email || "";

          if (!name) { skipped++; continue; }

          await db.staff.create({
            data: {
              name,
              role: role || "receptionist",
              department: department || null,
              phone: phone || "0000000000",
              email: email || `import-staff-${Date.now()}@placeholder.local`,
              password: "changeme",
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        case "medicines": {
          const name = row.name || row.medicinename || row.medicine_name || row.drug || "";
          const genericName = row.genericname || row.generic_name || row.generic || "";
          const category = row.category || row.type || "";
          const strength = row.strength || row.dosage || "";
          const dosageForm = row.form || row.formtype || row.dosageform || "";
          const manufacturer = row.manufacturer || row.brand || row.company || "";
          const salePrice = parseFloat(row.saleprice || row.sale_price || row.price || row.mrp || "0") || 0;
          const buyPrice = parseFloat(row.buyprice || row.buy_price || row.cost || "0") || 0;
          const stockQty = parseInt(row.stock || row.quantity || row.qty || "0") || 0;

          if (!name) { skipped++; continue; }

          await db.medicine.create({
            data: {
              name,
              genericName: genericName || null,
              category: category || "General",
              strength: strength || null,
              dosageForm: dosageForm || null,
              manufacturer: manufacturer || null,
              salePrice,
              purchasePrice: buyPrice,
              stockQty,
              batchNo: `IMPORT-${Date.now()}`,
              expiryDate: new Date("2027-12-31"),
              branchId,
              status: "active",
            },
          });
          imported++;
          break;
        }
        default:
          skipped++;
      }
    } catch (err) {
      errors.push(`Row ${imported + skipped + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      skipped++;
    }
  }

  res.json({
    success: true,
    type,
    branch: { id: branch.id, name: branch.name },
    imported,
    skipped,
    errors: errors.slice(0, 10), // Return first 10 errors
  });
}

async function moveToGeneral(_req: Request, res: Response) {
  // 1. Find or create the General branch
  let generalBranch = await db.branch.findFirst({
    where: { clinicType: "General" },
  });

  if (!generalBranch) {
    generalBranch = await db.branch.create({
      data: {
        name: "General",
        code: "GEN-001",
        clinicType: "General",
        status: "active",
        capacity: 100,
        operatingHours: "09:00-17:00",
      },
    });
  }

  const branchId = generalBranch.id;
  const results: Record<string, number> = {};

  // 2. Update all tables with branchId
  const tablesToUpdate = [
    "patient",
    "doctor",
    "staff",
    "appointment",
    "prescription",
    "medicine",
    "pharmacySale",
    "invoice",
    "labTest",
    "radiologyTest",
    "expense",
    "patientPayment",
    "clinicalNote",
    "department",
    "user",
  ];

  for (const table of tablesToUpdate) {
    try {
      // Update records where branchId is null or different from generalBranch
      const result = await (db as any)[table].updateMany({
        where: {
          OR: [
            { branchId: null },
            { branchId: { not: branchId } },
          ],
        },
        data: { branchId },
      });
      results[table] = result.count;
    } catch {
      results[table] = -1; // Error
    }
  }

  // 3. Update CRM/MS tables that use clinicId instead of branchId
  const crmTables = [
    "patientSource",
    "referral",
    "mSLead",
    "cRMDeal",
    "commissionSettlement",
  ];

  for (const table of crmTables) {
    try {
      const result = await (db as any)[table].updateMany({
        where: {
          OR: [
            { clinicId: null },
            { clinicId: { not: branchId } },
          ],
        },
        data: { clinicId: branchId },
      });
      results[table] = result.count;
    } catch {
      results[table] = -1; // Error
    }
  }

  res.json({
    success: true,
    generalBranch: {
      id: generalBranch.id,
      name: generalBranch.name,
      code: generalBranch.code,
    },
    updated: results,
  });
}

export function adminExtrasRouter(): Router {
  const r = Router();
  r.post("/backup-branch", wrap(backupBranch));
  r.post("/import-csv", wrap(importCsv));
  r.post("/move-to-general", wrap(moveToGeneral));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /tenant-actions — port of frontend /api/tenant-actions
// ─────────────────────────────────────────────────────────────────────────────
async function tenantAction(req: Request, res: Response) {
  try {
    const { action, tenantId } = req.body || {};

    if (!tenantId || !action) {
      return fail(res, 400, "tenantId and action are required");
    }

    const tenant = await rawDb.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return fail(res, 404, "Tenant not found");
    }

    switch (action) {
      case "reset_password": {
        // In production, generate a token and send email with reset link
        await rawDb.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "RESET_PASSWORD",
            module: "Tenants",
            detail: `Password reset requested for tenant: ${tenant.name}`,
          },
        });
        return res.json({
          success: true,
          message: "Password reset email sent",
        });
      }
      case "send_welcome": {
        await rawDb.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "SEND_WELCOME",
            module: "Tenants",
            detail: `Welcome email sent to: ${tenant.name}`,
          },
        });
        return res.json({
          success: true,
          message: "Welcome email sent",
        });
      }
      case "export_data": {
        await rawDb.saaSAuditLog.create({
          data: {
            adminEmail: "admin@carelim.com",
            tenantId,
            action: "EXPORT_DATA",
            module: "Tenants",
            detail: `Data export initiated for: ${tenant.name}`,
          },
        });
        return res.json({
          success: true,
          message: "Data export initiated",
        });
      }
      default:
        return fail(res, 400, "Unknown action");
    }
  } catch {
    return fail(res, 500, "Failed to execute tenant action");
  }
}

export function tenantActionsRouter(): Router {
  const r = Router();
  r.post("/", wrap(tenantAction));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /saas-audit — port of frontend /api/saas-audit
// ─────────────────────────────────────────────────────────────────────────────
async function listAuditLogs(_req: Request, res: Response) {
  const logs = await rawDb.saaSAuditLog.findMany({
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(logs);
}

export function saasAuditRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAuditLogs));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /saas-dashboard — port of frontend /api/saas-dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function saasDashboard(_req: Request, res: Response) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const tenants = await rawDb.tenant.findMany({ include: { plan: true, usageRecords: { take: 1, orderBy: { date: "desc" } } } });
  const invoices = await rawDb.saaSInvoice.findMany();
  const monthInvoices = invoices.filter((i) => i.date >= startOfMonth && i.status === "paid");
  const plans = await rawDb.plan.findMany({ include: { _count: { select: { tenants: true } } } });
  const tickets = await rawDb.supportTicket.findMany();
  const leads = await rawDb.lead.findMany();
  const auditLogs = await rawDb.saaSAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  const monthlyRevenue = monthInvoices.reduce((s, i) => s + i.total, 0);
  const mrr = tenants.filter((t) => t.status === "active").reduce((s, t) => s + (t.plan?.priceMonthly || 0), 0);
  const totalDoctors = tenants.reduce((s, t) => s + (t.usageRecords[0]?.doctorCount || 0), 0);
  const totalPatients = tenants.reduce((s, t) => s + (t.usageRecords[0]?.patientCount || 0), 0);
  const tenantGrowth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const c = await rawDb.tenant.count({ where: { createdAt: { gte: d, lt: dn } } });
    tenantGrowth.push({ month: d.toLocaleDateString("en-US", { month: "short" }), count: c });
  }
  const revenueTrend: { month: string; subscription: number; addOn: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dn = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const mi = await rawDb.saaSInvoice.findMany({ where: { date: { gte: d, lt: dn }, status: "paid" } });
    const sub = mi.reduce((s, inv) => s + inv.amount, 0);
    revenueTrend.push({ month: d.toLocaleDateString("en-US", { month: "short" }), subscription: sub, addOn: Math.round(sub * 0.15), commission: Math.round(sub * 0.05) });
  }
  res.json({
    kpis: {
      totalClinics: tenants.length,
      activeTenants: tenants.filter((t) => t.status === "active").length,
      trialTenants: tenants.filter((t) => t.status === "trial").length,
      suspendedTenants: tenants.filter((t) => t.status === "suspended").length,
      totalDoctors,
      totalPatients,
      totalAppointments: tenants.reduce((s, t) => s + (t.usageRecords[0]?.appointmentCount || 0), 0),
      mrr,
      annualRevenue: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
      monthlyRevenue,
      churnRate: tenants.length > 0 ? Math.round((tenants.filter((t) => t.status === "suspended").length / tenants.length) * 100) : 0,
      subscriptionGrowth: tenantGrowth[5]?.count || 0,
    },
    plans: plans.map((p) => ({ ...p, tenantCount: p._count.tenants })),
    revenueTrend,
    tenantGrowth,
    tickets: {
      open: tickets.filter((t) => t.status === "open").length,
      assigned: tickets.filter((t) => t.status === "assigned").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      total: tickets.length,
    },
    leads: {
      total: leads.length,
      converted: leads.filter((l) => l.status === "converted").length,
      trial: leads.filter((l) => l.status === "trial").length,
      demo: leads.filter((l) => l.status === "demo").length,
    },
    recentActivity: auditLogs.map((a) => ({ adminEmail: a.adminEmail, action: a.action, module: a.module, detail: a.detail, createdAt: a.createdAt })),
    tenants: tenants.slice(0, 5).map((t) => ({ id: t.id, name: t.name, plan: t.plan?.name, status: t.status, ownerEmail: t.ownerEmail, city: t.city, createdAt: t.createdAt, lastLoginAt: t.lastLoginAt })),
  });
}

export function saasDashboardRouter(): Router {
  const r = Router();
  r.get("/", wrap(saasDashboard));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /saas-invoices — port of frontend /api/saas-invoices
// ─────────────────────────────────────────────────────────────────────────────
async function listInvoices(_req: Request, res: Response) {
  const invoices = await rawDb.saaSInvoice.findMany({ include: { tenant: true }, orderBy: { date: "desc" } });
  res.json(invoices);
}

export function saasInvoicesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listInvoices));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /saas-modules — port of frontend /api/saas-modules and /api/saas-modules/[id]
// ─────────────────────────────────────────────────────────────────────────────
async function listModules(_req: Request, res: Response) {
  const m = await rawDb.platformModule.findMany({ include: { _count: { select: { tenants: true } } } });
  res.json(m);
}

async function saveModule(req: Request, res: Response) {
  const body = req.body || {};
  if (body.id) {
    const u = await rawDb.platformModule.update({ where: { id: body.id }, data: { isActive: body.isActive } });
    return res.json(u);
  }
  const m = await rawDb.platformModule.create({ data: body });
  return res.status(201).json(m);
}

async function getModule(req: Request, res: Response) {
  const id = req.params.id as string;
  const m = await rawDb.platformModule.findUnique({ where: { id } });
  if (!m) return fail(res, 404, "Not found");
  return res.json(m);
}

async function updateModule(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const m = await rawDb.platformModule.update({ where: { id }, data: body });
  return res.json(m);
}

async function deleteModule(req: Request, res: Response) {
  const id = req.params.id as string;
  await rawDb.platformModule.delete({ where: { id } });
  return res.json({ ok: true });
}

export function saasModulesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listModules));
  r.post("/", wrap(saveModule));
  r.get("/:id", wrap(getModule));
  r.patch("/:id", wrap(updateModule));
  r.delete("/:id", wrap(deleteModule));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /saas-settings — port of frontend /api/saas-settings
// ─────────────────────────────────────────────────────────────────────────────
async function getSaasSettings(_req: Request, res: Response) {
  const s = await rawDb.setting.findMany({ where: { key: { startsWith: "carelim_" } } });
  const o: Record<string, string> = {};
  s.forEach((x) => (o[x.key] = x.value));
  return res.json(o);
}

async function updateSaasSettings(req: Request, res: Response) {
  const body = req.body || {};
  for (const [k, v] of Object.entries(body)) {
    await rawDb.setting.upsert({
      where: { key: k },
      update: { value: String(v) },
      create: { key: k, value: String(v) },
    });
  }
  return res.json({ ok: true });
}

export function saasSettingsRouter(): Router {
  const r = Router();
  r.get("/", wrap(getSaasSettings));
  r.put("/", wrap(updateSaasSettings));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /add-ons — port of frontend /api/add-ons and /api/add-ons/[id]
// ─────────────────────────────────────────────────────────────────────────────
async function listAddOns(_req: Request, res: Response) {
  const a = await rawDb.addOn.findMany();
  return res.json(a);
}

async function saveAddOn(req: Request, res: Response) {
  const body = req.body || {};
  if (body.id) {
    const u = await rawDb.addOn.update({ where: { id: body.id }, data: { isActive: body.isActive } });
    return res.json(u);
  }
  const a = await rawDb.addOn.create({ data: body });
  return res.status(201).json(a);
}

async function getAddOn(req: Request, res: Response) {
  const id = req.params.id as string;
  const a = await rawDb.addOn.findUnique({ where: { id } });
  if (!a) return fail(res, 404, "Not found");
  return res.json(a);
}

async function updateAddOn(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const a = await rawDb.addOn.update({ where: { id }, data: body });
  return res.json(a);
}

async function deleteAddOn(req: Request, res: Response) {
  const id = req.params.id as string;
  await rawDb.addOn.delete({ where: { id } });
  return res.json({ ok: true });
}

export function addOnsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listAddOns));
  r.post("/", wrap(saveAddOn));
  r.get("/:id", wrap(getAddOn));
  r.patch("/:id", wrap(updateAddOn));
  r.delete("/:id", wrap(deleteAddOn));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /plans — port of frontend /api/plans (note: its `export const dynamic =
// "force-dynamic"` is a Next.js directive and has no Express equivalent).
// The original swallowed DB errors and returned 200 with [].
// ─────────────────────────────────────────────────────────────────────────────
async function listPlans(_req: Request, res: Response) {
  try {
    const plans = await rawDb.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
    return res.json(plans);
  } catch (error) {
    console.error("plans error:", error);
    return res.json([]);
  }
}

export function plansRouter(): Router {
  const r = Router();
  r.get("/", wrap(listPlans));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /support-tickets — port of frontend /api/support-tickets and
// /api/support-tickets/[id]
// ─────────────────────────────────────────────────────────────────────────────
async function listTickets(_req: Request, res: Response) {
  const t = await rawDb.supportTicket.findMany({ include: { tenant: true }, orderBy: { createdAt: "desc" } });
  return res.json(t);
}

async function createTicket(req: Request, res: Response) {
  const body = req.body || {};
  const ticket = await rawDb.supportTicket.create({
    data: { ...body, ticketNo: `TKT-${nanoid(8).toUpperCase()}` },
  });
  return res.status(201).json(ticket);
}

async function updateTicket(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const data: Record<string, unknown> = { ...body };
  if (body.status === "resolved" || body.status === "closed") data.resolvedAt = new Date();
  const t = await rawDb.supportTicket.update({ where: { id }, data: data as never });
  return res.json(t);
}

export function supportTicketsRouter(): Router {
  const r = Router();
  r.get("/", wrap(listTickets));
  r.post("/", wrap(createTicket));
  r.patch("/:id", wrap(updateTicket));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /tenants/:id/branches — port of frontend /api/tenants/[id]/branches and
// /api/tenants/[id]/branches/[branchId] (mounted with :id in the mount path).
// ─────────────────────────────────────────────────────────────────────────────
async function listBranches(req: Request, res: Response) {
  const id = req.params.id as string;
  const branches = await rawDb.branch.findMany({ where: { tenantId: id }, orderBy: { name: "asc" } });
  return res.json(branches);
}

async function createBranch(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  const branch = await rawDb.branch.create({ data: { ...body, tenantId: id } });
  await rawDb.saaSAuditLog.create({
    data: { adminEmail: "admin@carelim.com", tenantId: id, action: "CREATE", module: "Branches", detail: `Added branch: ${branch.name}` },
  });
  return res.status(201).json(branch);
}

async function updateBranch(req: Request, res: Response) {
  const branchId = req.params.branchId as string;
  const body = req.body || {};
  const branch = await rawDb.branch.update({ where: { id: branchId }, data: body });
  return res.json(branch);
}

async function deleteBranch(req: Request, res: Response) {
  const id = req.params.id as string;
  const branchId = req.params.branchId as string;
  const branch = await rawDb.branch.findUnique({ where: { id: branchId } });
  await rawDb.branch.delete({ where: { id: branchId } });
  await rawDb.saaSAuditLog.create({
    data: { adminEmail: "admin@carelim.com", tenantId: id, action: "DELETE", module: "Branches", detail: `Deleted branch: ${branch?.name || branchId}` },
  });
  return res.json({ ok: true });
}

export function tenantBranchesRouter(): Router {
  const r = Router();
  r.get("/", wrap(listBranches));
  r.post("/", wrap(createBranch));
  r.put("/:branchId", wrap(updateBranch));
  r.delete("/:branchId", wrap(deleteBranch));
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// /tenants/:id/settings — port of frontend /api/tenants/[id]/settings
// (mounted with :id in the mount path).
// ─────────────────────────────────────────────────────────────────────────────
async function getTenantSettings(req: Request, res: Response) {
  const id = req.params.id as string;
  let settings = await rawDb.clinicSettings.findUnique({ where: { tenantId: id } });
  if (!settings) {
    settings = await rawDb.clinicSettings.create({ data: { tenantId: id } });
  }
  return res.json(settings);
}

async function updateTenantSettings(req: Request, res: Response) {
  const id = req.params.id as string;
  const body = req.body || {};
  let settings = await rawDb.clinicSettings.findUnique({ where: { tenantId: id } });
  if (!settings) {
    settings = await rawDb.clinicSettings.create({ data: { tenantId: id, ...body } });
  } else {
    settings = await rawDb.clinicSettings.update({ where: { tenantId: id }, data: body });
  }
  return res.json(settings);
}

export function tenantSettingsRouter(): Router {
  const r = Router();
  r.get("/", wrap(getTenantSettings));
  r.patch("/", wrap(updateTenantSettings));
  return r;
}
