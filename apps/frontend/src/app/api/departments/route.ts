import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/with-tenant";

function makeCode(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, "").substring(0, 6).toUpperCase() || "DEPT";
}

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const where = branchId ? { branchId } : {};
    const departments = await db.department.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json(departments);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
}
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const { branchId, ...body } = await req.json();
    // Auto-generate code if not provided
    if (!body.code) {
      const count = await db.department.count();
      body.code = `${makeCode(body.name || "DEPT")}-${String(count + 1).padStart(3, "0")}`;
    }
    const department = await db.department.create({ data: { ...body, branchId } });
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Failed to create department:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
}
});
