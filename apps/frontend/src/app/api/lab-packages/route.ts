import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const pkgs = await db.labPackage.findMany({ include: { tests: { include: { test: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(pkgs);
});
