import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;
  const leads = await db.mSLead.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(leads);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.mSLead.count();
  const lead = await db.mSLead.create({
    data: { ...body, leadNo: `LEAD-${nanoid(8).toUpperCase()}` },
  });
  await db.auditLog.create({ data: { user: body.assignedTo || "system", action: "CREATE", module: "Carelim MS", detail: `Created lead ${lead.leadNo} from ${body.source}` } });
  return NextResponse.json(lead, { status: 201 });
});
