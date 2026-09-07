import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";
export const GET = withTenant(async () => {
  const claims = await db.insuranceClaim.findMany({ orderBy: { submittedAt: "desc" } });
  return NextResponse.json(claims);
});
export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.insuranceClaim.count();
  const claim = await db.insuranceClaim.create({
    data: { ...body, claimNo: `CLM-${nanoid(8).toUpperCase()}` },
  });
  return NextResponse.json(claim, { status: 201 });
});
