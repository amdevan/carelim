import { NextRequest, NextResponse } from "next/server";
import { rawDb } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimited = rateLimitResponse(req, RATE_LIMITS.login, "staff-login");
  if (rateLimited) return rateLimited;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, staff.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (staff.status !== "active") {
      return NextResponse.json(
        { error: "Account disabled" },
        { status: 403 }
      );
    }

    const tenantId = staff.tenantId || staff.branch?.tenantId || null;

    // Generate JWT with tenant context
    const token = signToken({
      userId: staff.id,
      email: staff.email,
      role: staff.role,
      type: "staff" as any,
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
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const response = NextResponse.json({
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

    response.cookies.set("carelim_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Staff login error:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
    });

    if (error?.name === "PrismaClientValidationError") {
      return NextResponse.json(
        { error: "Invalid request", detail: error?.message },
        { status: 400 }
      );
    }

    if (error?.name === "PrismaClientKnownRequestError") {
      return NextResponse.json(
        { error: "Database error", code: error?.code },
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
