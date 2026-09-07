import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async () => {
  const audits = await db.stockAudit.findMany({
    include: { location: true, items: true },
    orderBy: { auditDate: "desc" },
  });
  return NextResponse.json(audits);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const { locationId, items, performedBy, notes } = body;
  const count = await db.stockAudit.count();
  const audit = await db.stockAudit.create({
    data: {
      auditNo: `AUD-${nanoid(8).toUpperCase()}`,
      locationId,
      status: "completed",
      performedBy,
      notes,
      items: { create: items },
    },
    include: { items: true },
  });
  await db.auditLog.create({ data: { user: performedBy || "system", action: "CREATE", module: "StockAudit", detail: `Audit ${audit.auditNo} completed` } });
  return NextResponse.json(audit, { status: 201 });
});
