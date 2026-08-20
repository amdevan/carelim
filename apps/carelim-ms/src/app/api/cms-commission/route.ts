import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const [totalSettled, totalPending, settlements] = await Promise.all([
      prisma.commissionSettlement.aggregate({
        where: { status: "paid" },
        _sum: { amount: true },
      }),
      prisma.commissionSettlement.aggregate({
        where: { status: "pending" },
        _sum: { amount: true },
      }),
      prisma.commissionSettlement.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return NextResponse.json({
      totalSettled: totalSettled._sum.amount || 0,
      totalPending: totalPending._sum.amount || 0,
      settlements,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch commission data" }, { status: 500 });
  }
}
