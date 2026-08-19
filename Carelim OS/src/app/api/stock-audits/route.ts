import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const audits = await db.stockAudit.findMany({
    include: { location: true, items: true },
    orderBy: { auditDate: "desc" },
  });
  return NextResponse.json(audits);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { locationId, items, performedBy, notes } = body;
  const count = await db.stockAudit.count();
  const audit = await db.stockAudit.create({
    data: {
      auditNo: `AUD-${String(count + 1).padStart(5, "0")}`,
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
}
