import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's lab reports
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const labOrders = await db.labOrder.findMany({
    where: { patientId: user.patientId },
    include: {
      items: { include: { test: true } },
      results: { include: { parameters: { include: { parameter: true } } } },
    },
    orderBy: { orderedAt: "desc" },
  });

  // Also get simple lab tests
  const labTests = await db.labTest.findMany({
    where: { patientId: user.patientId },
    orderBy: { orderedAt: "desc" },
  });

  return NextResponse.json({ orders: labOrders, tests: labTests });
}
