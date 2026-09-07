import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const r = await db.referral.findUnique({ where: { id } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r);
});

// Settle a referral — creates a CommissionSettlement record
export const PATCH = withTenant(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const r = await db.referral.update({ where: { id }, data: { ...body, settledAt: body.status === "settled" ? new Date() : null } });
  if (body.status === "settled") {
    const count = await db.commissionSettlement.count();
    await db.commissionSettlement.create({
      data: {
        settlementNo: `STL-${nanoid(8).toUpperCase()}`,
        referralId: id,
        clinicId: r.clinicId,
        doctorId: r.doctorId,
        amount: r.commissionAmount,
        status: "paid",
        paidAt: new Date(),
        month: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      },
    });
    await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Carelim MS", detail: `Settled referral ${r.referralNo} — Rs. ${r.commissionAmount}` } });
  }
  return NextResponse.json(r);
});

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.referral.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
