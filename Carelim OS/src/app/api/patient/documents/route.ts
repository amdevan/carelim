import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's documents
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const documents = await db.patientDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(documents);
}

// POST - Upload a document
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, name, type, size, fileData } = body;
  if (!userId || !name) return NextResponse.json({ error: "userId and name required" }, { status: 400 });

  const doc = await db.patientDocument.create({
    data: { userId, name, type: type || "other", size: size || "0 KB", fileData: fileData || null },
  });
  return NextResponse.json(doc, { status: 201 });
}

// DELETE - Delete a document
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.patientDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
