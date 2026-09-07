import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const plans = await db.dentalTreatmentPlan.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(plans);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.dentalTreatmentPlan.count();
  const plan = await db.dentalTreatmentPlan.create({
    data: {
      ...body,
      planNo: `DTP-${nanoid(8).toUpperCase()}`,
      consentDate: body.consentDate ? new Date(body.consentDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created treatment plan ${plan.planNo}` } });
  return NextResponse.json(plan, { status: 201 });
});
