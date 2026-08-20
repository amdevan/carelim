import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const where = q ? {
    OR: [{ name: { contains: q } }, { genericName: { contains: q } }, { batchNo: { contains: q } }, { barcode: { contains: q } }]
  } : {};
  const medicines = await db.medicine.findMany({ where, include: { supplier: true }, orderBy: { name: "asc" } });
  return NextResponse.json(medicines);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const med = await db.medicine.create({ data: { ...body, expiryDate: new Date(body.expiryDate) } });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Medicine", detail: `Added medicine ${med.name}` } });
  return NextResponse.json(med, { status: 201 });
}
