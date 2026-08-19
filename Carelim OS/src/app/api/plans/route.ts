import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() { const plans = await db.plan.findMany({ include: { _count: { select: { tenants: true } } } }); return NextResponse.json(plans); }
export async function POST(req: NextRequest) { const body = await req.json(); const plan = await db.plan.create({ data: body }); return NextResponse.json(plan, { status: 201 }); }
