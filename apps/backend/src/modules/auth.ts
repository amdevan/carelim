/**
 * Auth module — full port of frontend /api/auth/login and /api/auth/refresh.
 * Responses (shape + cookies) are identical to what the Next routes returned,
 * so existing clients work unmodified.
 */
import { Router, Request, Response } from "express";
import { rawDb } from "../lib/prisma";
import { verifyPassword, signToken, signRefreshToken, verifyRefreshToken, TokenPayload } from "../lib/auth";
import { fail, clientIp, wrap } from "../lib/http";
import { checkRateLimit, rateLimitByIp, RATE_LIMITS } from "../lib/rate-limit";

// Role-to-permissions mapping for staff members
function getStaffPermissions(role: string | null): string[] {
  const r = (role || "").toLowerCase();

  const all = [
    "Dashboard.view", "Patient.view", "Patient.create", "Patient.edit",
    "Doctor.view", "Doctor.create", "Appointment.view", "Appointment.create",
    "Prescription.view", "Prescription.create", "EMR.view", "EMR.create",
    "Pharmacy.view", "Pharmacy.create", "Laboratory.view", "Laboratory.create",
    "Radiology.view", "Radiology.create", "Billing.view", "Billing.create",
    "Inventory.view", "Inventory.create", "Reports.view", "HR.view", "HR.create",
    "Settings.view", "Settings.create", "Settings.edit", "Audit.view",
  ];

  switch (r) {
    case "admin":
    case "manager":
      return all;
    case "doctor":
      return [
        "Dashboard.view", "Patient.view", "Patient.create", "Patient.edit",
        "Doctor.view", "Appointment.view", "Appointment.create",
        "Prescription.view", "Prescription.create",
        "EMR.view", "EMR.create",
        "Laboratory.view", "Radiology.view",
        "Billing.view", "Reports.view",
      ];
    case "nurse":
      return [
        "Dashboard.view", "Patient.view", "Patient.create", "Patient.edit",
        "Doctor.view", "Appointment.view", "Appointment.create",
        "Prescription.view", "EMR.view", "EMR.create",
        "Laboratory.view", "Radiology.view",
      ];
    case "receptionist":
      return [
        "Dashboard.view", "Patient.view", "Patient.create", "Patient.edit",
        "Doctor.view", "Appointment.view", "Appointment.create",
        "Billing.view", "Billing.create",
        "Prescription.view",
      ];
    case "pharmacist":
      return [
        "Dashboard.view", "Patient.view", "Doctor.view",
        "Pharmacy.view", "Pharmacy.create",
        "Inventory.view", "Inventory.create",
        "Billing.view", "Billing.create",
        "Prescription.view",
      ];
    case "accountant":
      return [
        "Dashboard.view",
        "Billing.view", "Billing.create",
        "Inventory.view",
        "Reports.view",
      ];
    case "lab":
      return [
        "Dashboard.view", "Patient.view", "Doctor.view",
        "Laboratory.view", "Laboratory.create",
        "Radiology.view", "Radiology.create",
        "EMR.view",
      ];
    default:
      return ["Dashboard.view"];
  }
}

function makeId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

function setAuthCookies(res: Response, token: string, refreshToken: string) {
  res.append(
    "Set-Cookie",
    `carelim_token=${token}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax${isProd() ? "; Secure" : ""}`
  );
  res.append(
    "Set-Cookie",
    `carelim_refresh=${refreshToken}; HttpOnly; Path=/api/auth/refresh; Max-Age=604800; SameSite=Lax${isProd() ? "; Secure" : ""}`
  );
}

async function login(req: Request, res: Response) {
  const rl = await checkRateLimit(`login:${rateLimitByIp(req)}`, RATE_LIMITS.login);
  if (!rl.allowed) return fail(res, 429, "Too many attempts. Try again later.");

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, 400, "Email and password are required");
    }

    // User model is NOT in TENANT_MODELS, so this query is unfiltered
    let user = await rawDb.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        branch: { select: { tenantId: true } },
      },
    });

    // If not found as a User, try Staff table
    let isStaff = false;
    let staffRecord: any = null;
    if (!user) {
      staffRecord = await rawDb.staff.findUnique({
        where: { email },
        include: { branch: { select: { tenantId: true } } },
      });
      if (!staffRecord) return fail(res, 401, "Invalid credentials");
      isStaff = true;
    }

    const targetUser = user || staffRecord;
    const valid = await verifyPassword(password, targetUser.password);
    if (!valid) return fail(res, 401, "Invalid credentials");

    if (targetUser.status !== "active") return fail(res, 403, "Account disabled");

    if (isStaff && staffRecord) {
      const tenantId = staffRecord.branch?.tenantId || staffRecord.tenantId || null;

      const staffBranches = await rawDb.staffBranch.findMany({
        where: { staffId: staffRecord.id },
        select: { branchId: true },
      });
      const branchIds: string[] = staffBranches.map((sb: { branchId: string }) => sb.branchId);
      if (branchIds.length === 0 && staffRecord.branchId) branchIds.push(staffRecord.branchId);

      const tokenPayload: TokenPayload = {
        userId: staffRecord.id,
        email: staffRecord.email,
        role: staffRecord.role || "Staff",
        type: "staff",
        tenantId: tenantId || undefined,
        branchId: staffRecord.branchId || undefined,
        branchIds,
      };
      const token = signToken(tokenPayload);
      const refreshToken = signRefreshToken(tokenPayload);

      await rawDb.staff.update({
        where: { id: staffRecord.id },
        data: { lastLogin: new Date() },
      });

      await rawDb.auditLog.create({
        data: {
          user: staffRecord.email,
          action: "LOGIN",
          module: "Auth",
          detail: `Staff member ${staffRecord.name} logged in`,
          ip: clientIp(req),
        },
      });

      const permissions = getStaffPermissions(staffRecord.role);
      setAuthCookies(res, token, refreshToken);
      return res.json({
        token,
        refreshToken,
        user: {
          id: staffRecord.id,
          name: staffRecord.name,
          email: staffRecord.email,
          role: staffRecord.role || "Staff",
          type: "staff",
          branchId: staffRecord.branchId,
          tenantId,
          clinicName: null,
          logoUrl: null,
          primaryColor: null,
          permissions,
        },
      });
    }

    // User login — full path with auto-provisioning
    let tenantId = user!.branch?.tenantId || user!.tenantId || null;
    if (!tenantId) {
      const org = await rawDb.organization.findFirst({
        where: { adminUserId: user!.id },
        select: { tenantId: true, id: true, name: true },
      });
      tenantId = org?.tenantId || null;

      if (!tenantId && org) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const tenant = await rawDb.tenant.create({
          data: {
            name: org.name,
            ownerName: user!.name,
            ownerEmail: user!.email,
            ownerPhone: user!.phone || "N/A",
            status: "trial",
            trialEndsAt,
          },
        });

        await rawDb.organization.update({
          where: { id: org.id },
          data: { tenantId: tenant.id },
        });

        const branch = await rawDb.branch.create({
          data: {
            name: "Main Branch",
            code: `MAIN-${makeId(6).toUpperCase()}`,
            tenantId: tenant.id,
            phone: null,
            email: user!.email,
          },
        });

        await rawDb.user.update({
          where: { id: user!.id },
          data: { branchId: branch.id },
        });

        tenantId = tenant.id;
      }

      if (!tenantId) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const tenant = await rawDb.tenant.create({
          data: {
            name: user!.name + "'s Clinic",
            ownerName: user!.name,
            ownerEmail: user!.email,
            ownerPhone: user!.phone || "N/A",
            status: "trial",
            trialEndsAt,
          },
        });

        const orgId = `CLINIC-${makeId(8).toUpperCase()}`;
        const org = await rawDb.organization.create({
          data: {
            name: user!.name + "'s Clinic",
            clinicType: "General",
            clinicId: orgId,
            subdomain: orgId.toLowerCase(),
            tenantId: tenant.id,
            adminUserId: user!.id,
          },
        });

        const branch = await rawDb.branch.create({
          data: {
            name: "Main Branch",
            code: `MAIN-${makeId(6).toUpperCase()}`,
            tenantId: tenant.id,
            email: user!.email,
          },
        });

        await rawDb.user.update({
          where: { id: user!.id },
          data: { branchId: branch.id },
        });

        tenantId = tenant.id;
      }
    }

    const adminPayload: TokenPayload = {
      userId: user!.id,
      email: user!.email,
      role: user!.role?.name || "Administrator",
      type: "user",
      tenantId: tenantId || undefined,
    };
    const token = signToken(adminPayload);
    const refreshToken = signRefreshToken(adminPayload);

    await rawDb.user.update({
      where: { id: user!.id },
      data: { lastLogin: new Date() },
    });

    await rawDb.auditLog.create({
      data: {
        user: user!.email,
        action: "LOGIN",
        module: "Auth",
        detail: "User logged in",
        ip: clientIp(req),
      },
    });

    const updatedUser = await rawDb.user.findUnique({
      where: { id: user!.id },
      select: { branchId: true },
    });

    let branchClinicType: string | null = null;
    const resolvedBranchId = updatedUser?.branchId || user!.branchId;
    if (resolvedBranchId) {
      const branchRec = await rawDb.branch.findUnique({
        where: { id: resolvedBranchId },
        select: { clinicType: true },
      });
      branchClinicType = branchRec?.clinicType || "General";
    }

    let clinicName: string | null = null;
    let logoUrl: string | null = null;
    let primaryColor: string | null = null;
    if (tenantId) {
      const cs = await rawDb.clinicSettings.findUnique({
        where: { tenantId },
        select: { clinicName: true, clinicLogo: true, logo: true, primaryColor: true },
      });
      if (cs) {
        clinicName = cs.clinicName || null;
        logoUrl = cs.clinicLogo || cs.logo || null;
        primaryColor = cs.primaryColor || null;
      }
    }

    setAuthCookies(res, token, refreshToken);
    return res.json({
      token,
      refreshToken,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role?.name || "Administrator",
        type: "user",
        roleId: user!.roleId,
        branchId: updatedUser?.branchId || user!.branchId,
        branchClinicType,
        tenantId: tenantId || null,
        clinicName,
        logoUrl,
        primaryColor,
        permissions:
          user!.role?.permissions.map(
            (rp: { permission: { module: string; action: string } }) =>
              `${rp.permission.module}.${rp.permission.action}`
          ) || [],
      },
    });
  } catch (error: any) {
    console.error("Login error:", { name: error?.name, message: error?.message, code: error?.code });
    if (error?.name === "PrismaClientValidationError") return fail(res, 400, "Invalid request");
    if (error?.name === "PrismaClientKnownRequestError") {
      if (error?.code === "P2025") return fail(res, 404, "Record not found");
      return fail(res, 500, "Database error");
    }
    if (error?.name === "PrismaClientUnknownRequestError") return fail(res, 503, "Database connection error");
    return fail(res, 500, "Authentication failed");
  }
}

async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.headers["cookie"]
      ?.toString()
      .match(/(?:^|;\s*)carelim_refresh=([^;]+)/)?.[1];

    if (!refreshToken) return fail(res, 401, "Refresh token required");

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return fail(res, 401, "Invalid or expired refresh token");

    const newAccessToken = signToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      branchIds: (payload as { branchIds?: string[] }).branchIds,
    });

    const secure = isProd() ? "; Secure" : "";
    res.append(
      "Set-Cookie",
      `carelim_token=${newAccessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Lax${secure}`
    );
    return res.json({ token: newAccessToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    return fail(res, 500, "Token refresh failed");
  }
}

export function authRouter(): Router {
  const r = Router();
  r.post("/login", wrap(login));
  r.post("/refresh", wrap(refresh));
  return r;
}
