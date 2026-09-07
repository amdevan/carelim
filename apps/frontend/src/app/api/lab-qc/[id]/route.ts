import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const DELETE = withTenant(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await db.labQualityControl.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
