import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

/** Resolve tenantId from a booking link slug */
async function resolveTenantFromSlug(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  try {
    const link = await db.bookingLink.findUnique({
      where: { slug },
      select: { tenantId: true, config: { select: { tenantId: true } } },
    });
    if (link?.tenantId) return link.tenantId;
    if (link?.config?.tenantId) return link.config.tenantId;
  } catch {
    // BookingLink table might not exist
  }
  return null;
}

/** Parse a date string (YYYY-MM-DD) as a local date, not UTC */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// GET — fetch booking config + doctors + departments for the booking page
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || getAuthTenantId(req);
    const slug = searchParams.get("slug");

    // Try resolving tenant from slug if no tenantId provided
    const effectiveTenantId = tenantId || await resolveTenantFromSlug(slug);

    let config = null;
    try {
      config = effectiveTenantId
        ? await db.bookingConfig.findUnique({ where: { tenantId: effectiveTenantId } })
        : await db.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail if table has issues
    }

    const showDoctors = config ? config.showDoctors : true;
    const showDepartments = config ? config.showDepartments : true;

    // Build where clauses scoped to tenant
    const doctorWhere: any = { status: "active" };
    const departmentWhere: any = {};

    // If we have a tenant, scope queries
    if (effectiveTenantId) {
      doctorWhere.tenantId = effectiveTenantId;
      departmentWhere.tenantId = effectiveTenantId;
    }

    // Fetch doctors and departments for the booking form
    const [doctors, departments] = await Promise.all([
      showDoctors
        ? db.doctor.findMany({
            where: doctorWhere,
            select: { id: true, name: true, specialization: true, consultationFee: true, workingDays: true, startTime: true, endTime: true },
            orderBy: { name: "asc" },
          })
        : [],
      showDepartments
        ? db.department.findMany({
            where: departmentWhere,
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : [],
    ]);

    return NextResponse.json({
      id: config?.id || null,
      tenantId: config?.tenantId || effectiveTenantId || null,
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
      const tenantId = getAuthTenantId(req) || await resolveTenantFromSlug(body.linkSlug || null);

      const doctor = body.doctorId ? await db.doctor.findUnique({ where: { id: body.doctorId }, select: { name: true } }) : null;
      const department = body.departmentId ? await db.department.findUnique({ where: { id: body.departmentId }, select: { name: true } }) : null;

      // Store the time as-is (keep original format from frontend)
      const timeStr = body.time || "";

      // Create PublicBooking - handle missing tenantId column on production
      const bookingData: any = {
        patientName: body.patientName,
        phone: body.patientPhone || "",
        email: body.patientEmail || null,
        doctorName: doctor?.name || body.doctorName || "Any",
        department: department?.name || body.department || null,
        date: body.date ? parseLocalDate(body.date) : new Date(),
        time: timeStr,
        status: "pending",
        notes: body.reason || null,
      };

      // Try setting tenantId; if column doesn't exist on production, skip it
      if (tenantId) {
        try {
          bookingData.tenantId = tenantId;
          const booking = await db.publicBooking.create({
            data: bookingData,
          });
          return NextResponse.json(booking, { status: 201 });
        } catch (createError: any) {
          if (createError?.message?.includes("tenantId")) {
            delete bookingData.tenantId;
            const booking = await db.publicBooking.create({
              data: bookingData,
            });
            return NextResponse.json(booking, { status: 201 });
          }
          throw createError;
        }
      } else {
        const booking = await db.publicBooking.create({
          data: bookingData,
        });
        return NextResponse.json(booking, { status: 201 });
      }
    }

    // Config save
    const tenantId = getAuthTenantId(req);
    const configTenantId = tenantId || null;

    let existing = null;
    try {
      existing = configTenantId
        ? await db.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
        : await db.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail
    }

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

    let existing = null;
    try {
      existing = configTenantId
        ? await db.bookingConfig.findUnique({ where: { tenantId: configTenantId } })
        : await db.bookingConfig.findFirst({ where: { tenantId: null } });
    } catch {
      // Config lookup might fail
    }

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
