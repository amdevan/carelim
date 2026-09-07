import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const depts = await db.labDepartment.findMany({ include: { _count: { select: { tests: true, equipment: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(depts);
});
