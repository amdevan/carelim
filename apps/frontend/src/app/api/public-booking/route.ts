import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

// GET — fetch booking config + doctors + departments for the booking page
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || getAuthTenantId(req);

    const config = tenantId
      ? await db.bookingConfig.findUnique({ where: { tenantId } })
      : null;

    const showDoctors = config ? config.showDoctors : true;
    const showDepartments = config ? config.showDepartments : true;

    // Always fetch doctors and departments for the booking form
    const [doctors, departments] = await Promise.all([
      showDoctors
        ? db.doctor.findMany({
            where: { status: "active" },
            select: { id: true, name: true, specialization: true, consultationFee: true },
            orderBy: { name: "asc" },
          })
        : [],
      showDepartments
        ? db.department.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : [],
    ]);

    return NextResponse.json({
      id: config?.id || null,
      tenantId: config?.tenantId || tenantId || null,
      enabled: config?.enabled ?? true,
      requireLogin: config?.requireLogin ?? false,
      showDepartments,
      showDoctors,
      allowedTimeSlots: config?.allowedTimeSlots || "30",
      doctors,
      departments,
    });
  } catch (error) {
    console.error("Failed to fetch booking config:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// POST — handle both config saves and booking submissions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Booking submission (has patientName)
    if (body.patientName) {
      const doctor = body.doctorId ? await db.doctor.findUnique({ where: { id: body.doctorId }, select: { name: true } }) : null;
      const department = body.departmentId ? await db.department.findUnique({ where: { id: body.departmentId }, select: { name: true } }) : null;

      const booking = await db.publicBooking.create({
        data: {
          patientName: body.patientName,
          phone: body.patientPhone || "",
          email: body.patientEmail || null,
          doctorName: doctor?.name || body.doctorName || "Any",
          department: department?.name || body.department || null,
          date: body.date ? new Date(body.date) : new Date(),
          time: body.time || "",
          status: "pending",
          notes: body.reason || null,
        },
      });
      return NextResponse.json(booking, { status: 201 });
    }

    // Config save
    const tenantId = getAuthTenantId(req);
    const configTenantId = tenantId || null;

    const existing = configTenantId
      ? await db.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
      : await db.bookingConfig.findFirst({ where: { tenantId: null } });
    if (existing) {
      const updated = await db.bookingConfig.update({
        where: { id: existing.id },
        data: {
          enabled: body.enabled ?? existing.enabled,
          requireLogin: body.requireLogin ?? existing.requireLogin,
          showDepartments: body.showDepartments ?? existing.showDepartments,
          showDoctors: body.showDoctors ?? existing.showDoctors,
          allowedTimeSlots: body.allowedTimeSlots ?? existing.allowedTimeSlots,
        },
      });
      return NextResponse.json(updated);
    }

    const config = await db.bookingConfig.create({
      data: {
        tenantId: configTenantId,
        enabled: body.enabled ?? true,
        requireLogin: body.requireLogin ?? false,
        showDepartments: body.showDepartments ?? true,
        showDoctors: body.showDoctors ?? true,
        allowedTimeSlots: body.allowedTimeSlots ?? "30",
      },
    });
    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Failed to process request:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// PUT — update booking config (also used by admin without tenant context)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = getAuthTenantId(req);

    // For admins without a tenant, store config with null tenantId
    const configTenantId = tenantId || null;

    const existing = configTenantId
      ? await db.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
      : await db.bookingConfig.findFirst({ where: { tenantId: null } });

    if (existing) {
      const updated = await db.bookingConfig.update({
        where: { id: existing.id },
        data: body,
      });
      return NextResponse.json(updated);
    }

    const config = await db.bookingConfig.create({
      data: { tenantId: configTenantId, ...body },
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to update booking config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
