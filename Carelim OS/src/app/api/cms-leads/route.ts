import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;
  const leads = await db.mSLead.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.mSLead.count();
  const lead = await db.mSLead.create({
    data: { ...body, leadNo: `LEAD-${String(count + 1).padStart(5, "0")}` },
  });
  await db.auditLog.create({ data: { user: body.assignedTo || "system", action: "CREATE", module: "Carelim MS", detail: `Created lead ${lead.leadNo} from ${body.source}` } });
  return NextResponse.json(lead, { status: 201 });
}
