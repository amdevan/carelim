import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const medicineId = searchParams.get("medicineId");
  const where: Record<string, unknown> = {};
  if (medicineId) where.medicineId = medicineId;
  const batches = await db.medicineBatch.findMany({
    where,
    include: { medicine: true },
    orderBy: { expiryDate: "asc" },
  });
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const batch = await db.medicineBatch.create({
    data: {
      ...body,
      expiryDate: new Date(body.expiryDate),
      manufactureDate: body.manufactureDate ? new Date(body.manufactureDate) : null,
    },
  });
  return NextResponse.json(batch, { status: 201 });
}
