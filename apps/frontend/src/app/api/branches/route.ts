import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";

export const GET = withTenant(async () => {
  const branches = await db.branch.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(branches);
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const branch = await db.branch.create({ data: body });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Settings", detail: `Added branch ${branch.name}` } });
  return NextResponse.json(branch, { status: 201 });
});
