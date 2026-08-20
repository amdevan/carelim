import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const source = searchParams.get("source");
  const contactId = searchParams.get("contactId");
  const assignedTo = searchParams.get("assignedTo");
  const priority = searchParams.get("priority");

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (contactId) where.contactId = contactId;
  if (assignedTo) where.assignedTo = assignedTo;
  if (priority) where.priority = priority;

  const deals = await db.cRMDeal.findMany({
    where,
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.cRMDeal.count();
  const deal = await db.cRMDeal.create({
    data: { ...body, dealNo: `DEAL-${String(count + 1).padStart(5, "0")}` },
  });
  await db.auditLog.create({
    data: { user: "system", action: "CREATE", module: "CRM", detail: `Created deal ${deal.dealNo} - ${deal.title}` },
  });
  await db.cRMActivity.create({
    data: {
      dealId: deal.id,
      type: "note",
      description: `Deal created: ${deal.title}`,
      performedBy: body.assignedTo || "system",
    },
  });
  return NextResponse.json(deal, { status: 201 });
}
