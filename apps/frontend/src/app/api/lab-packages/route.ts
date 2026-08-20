import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const pkgs = await db.labPackage.findMany({ include: { tests: { include: { test: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(pkgs);
}
