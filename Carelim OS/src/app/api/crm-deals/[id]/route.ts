import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await db.cRMDeal.findUnique({
    where: { id },
    include: { contact: true, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(deal);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const existing = await db.cRMDeal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...body };

  if (body.stage && body.stage !== existing.stage) {
    await db.cRMActivity.create({
      data: {
        dealId: id,
        type: "stage_change",
        fromStage: existing.stage,
        toStage: body.stage,
        description: `Stage changed from ${existing.stage} to ${body.stage}`,
        performedBy: body.assignedTo || "system",
      },
    });
  }

  if (body.stage === "closed_won" || body.stage === "closed_lost") {
    data.closedAt = new Date();
  }

  const deal = await db.cRMDeal.update({ where: { id }, data });
  await db.auditLog.create({
    data: { user: "system", action: "UPDATE", module: "CRM", detail: `Updated deal ${deal.dealNo} - ${deal.title}` },
  });
  return NextResponse.json(deal);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await db.cRMDeal.delete({ where: { id } });
  await db.auditLog.create({
    data: { user: "system", action: "DELETE", module: "CRM", detail: `Deleted deal ${deal.dealNo} - ${deal.title}` },
  });
  return NextResponse.json({ ok: true });
}
