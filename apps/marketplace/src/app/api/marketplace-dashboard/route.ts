import { NextResponse } from "next/server";
import { prisma } from "@carelim/database";

export async function GET() {
  try {
    const [totalModules, activeAddOns, totalTenants] = await Promise.all([
      prisma.platformModule.count(),
      prisma.addOn.count({ where: { isActive: true } }),
      prisma.tenant.count(),
    ]);
    return NextResponse.json({ totalModules, activeAddOns, totalTenants });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
