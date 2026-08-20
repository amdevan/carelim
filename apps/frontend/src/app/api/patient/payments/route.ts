import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Get patient's payments
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await db.patientUser.findUnique({ where: { id: userId } });
  if (!user || !user.patientId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const patient = await db.patient.findUnique({ where: { id: user.patientId } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const payments = await db.patientPayment.findMany({
    where: { patientId: user.patientId },
    orderBy: { date: "desc" },
  });

  const invoices = await db.invoice.findMany({
    where: { patientId: user.patientId },
    orderBy: { date: "desc" },
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.due, 0);

  return NextResponse.json({ payments, invoices, totalPaid, totalDue });
}
