import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const medicineId = searchParams.get("medicineId");
  const type = searchParams.get("type");
  const where: Record<string, unknown> = {};
  if (medicineId) where.medicineId = medicineId;
  if (type) where.type = type;
  const movements = await db.stockMovement.findMany({
    where,
    include: { medicine: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(movements);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { medicineId, type, quantity, reference, notes, performedBy } = body;
  const med = await db.medicine.findUnique({ where: { id: medicineId } });
  if (!med) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
  const newBalance = Math.max(0, med.stockQty + quantity);
  const movement = await db.stockMovement.create({
    data: { medicineId, type, quantity, balanceAfter: newBalance, reference, notes, performedBy },
  });
  await db.medicine.update({ where: { id: medicineId }, data: { stockQty: newBalance } });
  await db.auditLog.create({ data: { user: performedBy || "system", action: "CREATE", module: "StockMovement", detail: `${type} ${quantity} of ${med.name}` } });
  return NextResponse.json(movement, { status: 201 });
}
