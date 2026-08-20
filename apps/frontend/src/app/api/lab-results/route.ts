import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  const results = await db.labResult.findMany({
    where,
    include: {
      order: { include: { patient: true } },
      parameters: { include: { parameter: { include: { referenceRanges: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(results);
}
