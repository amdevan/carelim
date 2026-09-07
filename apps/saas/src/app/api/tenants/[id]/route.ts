import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        invoices: { orderBy: { date: "desc" }, take: 10 },
        tenantModules: { include: { module: true } },
        supportTickets: { orderBy: { createdAt: "desc" }, take: 5 },
        usageRecords: { orderBy: { date: "desc" }, take: 1 },
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tenant" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tenant = await db.tenant.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { toggleModule, addModules, ...data } = body;

    // Handle module toggle
    if (toggleModule) {
      const { moduleId, enabled } = toggleModule;
      const existing = await db.tenantModule.findFirst({
        where: { tenantId: id, moduleId },
      });
      if (existing) {
        await db.tenantModule.update({
          where: { id: existing.id },
          data: { enabled },
        });
      }
      return NextResponse.json({ success: true });
    }

    // Handle adding modules
    if (addModules && Array.isArray(addModules)) {
      for (const mod of addModules) {
        const platformModule = await db.platformModule.findFirst({
          where: { name: mod.name },
        });
        if (platformModule) {
          const exists = await db.tenantModule.findFirst({
            where: { tenantId: id, moduleId: platformModule.id },
          });
          if (!exists) {
            await db.tenantModule.create({
              data: { tenantId: id, moduleId: platformModule.id, enabled: true },
            });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Regular update
    const tenant = await db.tenant.update({
      where: { id },
      data,
    });
    return NextResponse.json(tenant);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.tenant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
