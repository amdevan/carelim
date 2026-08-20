import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = db as any;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let settings = await prisma.clinicSettings.findUnique({ where: { tenantId: id } });
  if (!settings) {
    settings = await prisma.clinicSettings.create({ data: { tenantId: id } });
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  let settings = await prisma.clinicSettings.findUnique({ where: { tenantId: id } });
  if (!settings) {
    settings = await prisma.clinicSettings.create({ data: { tenantId: id, ...body } });
  } else {
    settings = await prisma.clinicSettings.update({ where: { tenantId: id }, data: body });
  }
  return NextResponse.json(settings);
}
