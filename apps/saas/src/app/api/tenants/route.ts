import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("tenants error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenant = await db.tenant.create({ data: body });
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
