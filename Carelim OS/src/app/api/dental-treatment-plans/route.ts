import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const where = patientId ? { patientId } : {};
  const plans = await db.dentalTreatmentPlan.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.dentalTreatmentPlan.count();
  const plan = await db.dentalTreatmentPlan.create({
    data: {
      ...body,
      planNo: `DTP-${String(count + 1).padStart(5, "0")}`,
      consentDate: body.consentDate ? new Date(body.consentDate) : null,
    },
  });
  await db.auditLog.create({ data: { user: body.doctorId || "system", action: "CREATE", module: "Dental", detail: `Created treatment plan ${plan.planNo}` } });
  return NextResponse.json(plan, { status: 201 });
}
