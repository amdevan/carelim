import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");
  const imageType = searchParams.get("imageType");
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (imageType) where.imageType = imageType;
  const imgs = await db.dentalImage.findMany({ where, orderBy: { takenAt: "desc" } });
  return NextResponse.json(imgs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const img = await db.dentalImage.create({
    data: {
      ...body,
      takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
      annotation: body.annotation ? (typeof body.annotation === "object" ? JSON.stringify(body.annotation) : body.annotation) : null,
    },
  });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Dental", detail: `Added dental image (${body.imageType}) for patient ${body.patientId}` } });
  return NextResponse.json(img, { status: 201 });
}
