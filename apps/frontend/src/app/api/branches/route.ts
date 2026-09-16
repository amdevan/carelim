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
  const { name, code, clinicType, address, city, state, country, zipCode, phone, email, website, timezone, manager } = body;
  if (!name || !code) {
    return NextResponse.json({ error: "Branch name and code are required" }, { status: 400 });
  }
  const branch = await db.branch.create({ data: { name, code, clinicType: clinicType || "General", address: address || null, city: city || null, state: state || null, country: country || "Nepal", zipCode: zipCode || null, phone: phone || null, email: email || null, website: website || null, timezone: timezone || "Asia/Kathmandu", manager: manager || null } });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Settings", detail: `Added branch ${branch.name}` } });
  return NextResponse.json(branch, { status: 201 });
});
