import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const odo = await db.odontogram.findUnique({ where: { id }, include: { teeth: { orderBy: { toothNumber: "asc" } } } });
  if (!odo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(odo);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const odo = await db.odontogram.update({ where: { id }, data: { notes: body.notes, numberingSystem: body.numberingSystem }, include: { teeth: true } });
  return NextResponse.json(odo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.odontogram.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Upsert a single tooth within the odontogram (toothNumber is the key)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // body: { toothNumber, status, surfaces, conditions, notes, isPrimary }
  const existing = await db.tooth.findFirst({ where: { odontogramId: id, toothNumber: body.toothNumber } });
  let tooth;
  if (existing) {
    tooth = await db.tooth.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        surfaces: typeof body.surfaces === "object" ? JSON.stringify(body.surfaces) : body.surfaces,
        conditions: typeof body.conditions === "object" ? JSON.stringify(body.conditions) : body.conditions,
        notes: body.notes,
      },
    });
  } else {
    tooth = await db.tooth.create({
      data: {
        odontogramId: id,
        toothNumber: body.toothNumber,
        isPrimary: body.isPrimary || false,
        status: body.status || "sound",
        surfaces: typeof body.surfaces === "object" ? JSON.stringify(body.surfaces) : body.surfaces,
        conditions: typeof body.conditions === "object" ? JSON.stringify(body.conditions) : body.conditions,
        notes: body.notes,
      },
    });
  }
  await db.auditLog.create({ data: { user: "system", action: "UPDATE", module: "Dental", detail: `Updated tooth ${body.toothNumber} — ${body.status}` } });
  return NextResponse.json(tooth);
}
