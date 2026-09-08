import { NextRequest, NextResponse } from "next/server";
import { rawDb } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

function makeId(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}

export async function POST(req: NextRequest) {
  const rateLimited = rateLimitResponse(req, RATE_LIMITS.login, "login");
  if (rateLimited) return rateLimited;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
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
      if (!staffRecord) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
      isStaff = true;
    }

    // Verify password
    const targetUser = user || staffRecord;
    const valid = await verifyPassword(password, targetUser.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (targetUser.status !== "active") {
      return NextResponse.json(
        { error: "Account disabled" },
        { status: 403 }
      );
    }

    // Resolve tenantId and generate response based on User vs Staff
    if (isStaff && staffRecord) {
      // Staff login — simpler path, no auto-provisioning
      const tenantId = staffRecord.branch?.tenantId || staffRecord.tenantId || null;

      const token = signToken({
        userId: staffRecord.id,
        email: staffRecord.email,
        role: staffRecord.role || "Staff",
        type: "staff",
        tenantId: tenantId || undefined,
      });

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
          ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      const response = NextResponse.json({
        token,
        user: {
          id: staffRecord.id,
          name: staffRecord.name,
          email: staffRecord.email,
          role: staffRecord.role || "Staff",
          branchId: staffRecord.branchId,
          tenantId,
          clinicName: null,
          logoUrl: null,
          primaryColor: null,
          permissions: [],
        },
      });

      response.cookies.set("carelim_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // User login — full path with auto-provisioning
    let tenantId = user!.branch?.tenantId || user!.tenantId || null;
    if (!tenantId) {
      // Organization IS in TENANT_MODELS, but no tenant context → filtering skipped
      const org = await rawDb.organization.findFirst({
        where: { adminUserId: user!.id },
        select: { tenantId: true, id: true, name: true },
      });
      tenantId = org?.tenantId || null;

      // Auto-provision tenant if user has an org but no tenant
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

      // If still no tenant (no org either), create one from scratch
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

    // Generate JWT with tenant context
    const token = signToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role?.name || "Administrator",
      type: "user",
      tenantId: tenantId || undefined,
    });

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
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    // Re-fetch user to get updated branchId
    const updatedUser = await rawDb.user.findUnique({
      where: { id: user!.id },
      select: { branchId: true },
    });

    // Fetch branch clinicType if user has a branch
    let branchClinicType: string | null = null;
    const resolvedBranchId = updatedUser?.branchId || user!.branchId;
    if (resolvedBranchId) {
      const branchRec = await rawDb.branch.findUnique({ where: { id: resolvedBranchId }, select: { clinicType: true } });
      branchClinicType = branchRec?.clinicType || "General";
    }

    // Fetch tenant branding (clinic name, logo, colors)
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

    const response = NextResponse.json({
      token,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
        role: user!.role?.name || "Administrator",
        roleId: user!.roleId,
        branchId: updatedUser?.branchId || user!.branchId,
        branchClinicType,
        tenantId: tenantId || null,
        clinicName,
        logoUrl,
        primaryColor,
        permissions:
          user!.role?.permissions.map(
            (rp) => `${rp.permission.module}.${rp.permission.action}`
          ) || [],
      },
    });

    response.cookies.set("carelim_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login route error:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    if (error?.name === "PrismaClientValidationError") {
      return NextResponse.json(
        { error: "Invalid request", detail: error?.message },
        { status: 400 }
      );
    }

    if (error?.name === "PrismaClientKnownRequestError") {
      const prismaCode = error?.code;
      if (prismaCode === "P2025") {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }
      if (prismaCode === "P2002") {
        return NextResponse.json(
          { error: "Duplicate record", detail: error?.meta?.target?.join(", ") },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Database error", code: prismaCode },
        { status: 500 }
      );
    }

    if (error?.name === "PrismaClientUnknownRequestError") {
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
