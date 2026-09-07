import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(campaigns);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const campaign = await db.campaign.create({ data: body });
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Carelim MS", detail: `Created campaign ${campaign.name}` } });
  return NextResponse.json(campaign, { status: 201 });
});
