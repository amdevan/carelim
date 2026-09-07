import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (q) {
    where.OR = [{ name: { contains: q } }, { genericName: { contains: q } }, { batchNo: { contains: q } }, { barcode: { contains: q } }];
  }
  const medicines = await db.medicine.findMany({ where, include: { supplier: true }, orderBy: { name: "asc" } });
  return NextResponse.json(medicines);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const med = await db.medicine.create({ data: { ...body, expiryDate: new Date(body.expiryDate) } });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Medicine", detail: `Added medicine ${med.name}` } });
  return NextResponse.json(med, { status: 201 });
});
