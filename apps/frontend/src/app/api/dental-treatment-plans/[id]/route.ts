import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const plan = await db.dentalTreatmentPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
});

export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = { ...body };
  if (body.consentDate) data.consentDate = new Date(body.consentDate);
  const plan = await db.dentalTreatmentPlan.update({ where: { id }, data });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "UPDATE", module: "Dental", detail: `Updated treatment plan ${plan.planNo} → ${body.status || ""}` } });
  return NextResponse.json(plan);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.dentalTreatmentPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
