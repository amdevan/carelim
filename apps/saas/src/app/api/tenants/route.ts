import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("tenants error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Generate domain from name
    const baseDomain = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 30);
    const domain = baseDomain ? `${baseDomain}.carelim.com` : null;

    // Calculate trial end date
    const trialDays = body.trialDays || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        ownerName: body.ownerName,
        ownerEmail: body.ownerEmail,
        ownerPhone: body.ownerPhone,
        address: body.address || null,
        city: body.city || null,
        country: body.country || "Nepal",
        registrationNo: body.registrationNo || null,
        domain,
        planId: body.planId || null,
        status: body.status || "trial",
        trialEndsAt: body.status === "trial" ? trialEndsAt : null,
      },
    });

    // Create default clinic settings
    await db.clinicSettings.create({
      data: {
        tenantId: tenant.id,
        clinicName: body.name,
        clinicEmail: body.ownerEmail,
        clinicPhone: body.ownerPhone,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
