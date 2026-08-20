import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const depts = await db.labDepartment.findMany({ include: { _count: { select: { tests: true, equipment: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(depts);
}
