import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

function generateSlug(doctorName?: string, department?: string): string {
  const parts = [doctorName, department].filter(Boolean);
  const base = parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${Date.now().toString(36)}`;
}

// GET — list booking links
export async function GET(req: NextRequest) {
  try {
    const tenantId = getAuthTenantId(req);
    const where = tenantId ? { tenantId } : {};

    const links = await db.bookingLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch booking links:", error);
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}

// POST — create a booking link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = getAuthTenantId(req);

    // Verify tenant exists if provided
    let validTenantId: string | null = null;
    if (tenantId) {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      if (tenant) validTenantId = tenant.id;
    }

    const slug = generateSlug(body.doctorName, body.department);
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const url = `${origin}/book/${slug}`;

    // Get or create config (only if tenant exists)
    let configId: string | null = null;
    if (validTenantId) {
      let config = await db.bookingConfig.findUnique({ where: { tenantId: validTenantId } });
      if (!config) {
        config = await db.bookingConfig.create({ data: { tenantId: validTenantId } });
      }
      configId = config.id;
    }

    const link = await db.bookingLink.create({
      data: {
        tenantId: validTenantId,
        configId,
        doctorName: body.doctorName || null,
        department: body.department || null,
        url,
        slug,
        active: true,
      },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking link:", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
