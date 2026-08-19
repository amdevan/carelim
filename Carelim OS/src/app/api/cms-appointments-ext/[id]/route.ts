import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await db.appointmentExtension.findUnique({ where: { id } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(e);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const e = await db.appointmentExtension.update({ where: { id }, data: body });
  // Log status transitions as activity
  if (body.status) {
    const activityMap: Record<string, string> = {
      confirmed: "appointment_confirmed",
      checked_in: "checked_in",
      consultation: "consultation",
      billing: "billing_completed",
      completed: "billing_completed",
    };
    if (activityMap[body.status]) {
      await db.patientActivityLog.create({ data: { appointmentId: e.appointmentId, patientId: "system", activity: activityMap[body.status], description: `Status → ${body.status}`, performedBy: "system" } }).catch(() => {});
    }
  }
  return NextResponse.json(e);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.appointmentExtension.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
