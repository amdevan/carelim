import { NextRequest, NextResponse } from "next/server";
import { rawDb as db } from "@/lib/db";
import { getAuthTenantId } from "@/lib/auth";

// PATCH — toggle link active status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tenantId = getAuthTenantId(req);

    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const link = await db.bookingLink.findFirst({ where });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const updated = await db.bookingLink.update({
      where: { id },
      data: { active: body.active ?? !link.active },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update link:", error);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

// DELETE — delete a booking link
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantId = getAuthTenantId(_req);

    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;

    const link = await db.bookingLink.findFirst({ where });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await db.bookingLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete link:", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
