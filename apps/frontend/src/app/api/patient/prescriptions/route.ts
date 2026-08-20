import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's prescriptions
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const prescriptions = await db.prescription.findMany({
    where: { patientId: user.patientId },
    include: { doctor: { include: { department: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(prescriptions);
}
