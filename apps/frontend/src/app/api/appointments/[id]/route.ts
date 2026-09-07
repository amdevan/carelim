import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const appt = await db.appointment.findUnique({ where: { id }, include: { patient: true, doctor: true } });
    if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const appt = await db.appointment.update({ where: { id }, data: body });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "UPDATE", module: "Appointment", detail: `Updated appointment status to ${body.status || ""}` } });
    return NextResponse.json(appt);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await db.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
});
