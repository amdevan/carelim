import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      include: { _count: { select: { tenants: true } } },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("plans error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const plan = await db.plan.create({ data: body });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
