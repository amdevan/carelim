import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const modality = searchParams.get("modality");
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (status) where.status = status;
  if (modality) where.modalityId = modality;
  const studies = await db.radiologyStudy.findMany({
    where,
    include: { patient: true, modality: true, images: true, report: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(studies);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.radiologyStudy.count();
  const study = await db.radiologyStudy.create({
    data: {
      studyUid: `1.2.840.${Date.now()}.${count}`,
      patientId: body.patientId,
      modalityId: body.modalityId,
      bodyPart: body.bodyPart,
      status: "scheduled",
      priority: body.priority || "normal",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      clinicalHistory: body.clinicalHistory || null,
      contrastUsed: body.contrastUsed || false,
    },
    include: { patient: true, modality: true },
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Radiology", detail: `Created study ${study.studyUid}` } });
  return NextResponse.json(study, { status: 201 });
});
