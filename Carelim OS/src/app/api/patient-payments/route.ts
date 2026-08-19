import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET() {
  const payments = await db.patientPayment.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(payments);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.patientPayment.count();
  const payment = await db.patientPayment.create({
    data: { ...body, receiptNo: `RCP-${String(count + 1).padStart(5, "0")}` },
  });
  // Auto journal entry
  const cashAcc = await db.account.findFirst({ where: { code: "1000" } });
  const revAcc = await db.account.findFirst({ where: { code: "4000" } });
  if (cashAcc && revAcc) {
    const jeCount = await db.journalEntry.count();
    await db.journalEntry.create({
      data: {
        entryNo: `JE-${String(jeCount + 1).padStart(5, "0")}`,
        description: `Payment received from ${body.patientName}`,
        reference: payment.receiptNo,
        module: "billing",
        totalDebit: body.amount, totalCredit: body.amount,
        status: "posted", createdBy: "system",
        items: {
          create: [
            { accountId: cashAcc.id, debit: body.amount, credit: 0 },
            { accountId: revAcc.id, debit: 0, credit: body.amount },
          ],
        },
      },
    });
  }
  await db.auditLog.create({ data: { user: "system", action: "CREATE", module: "Payment", detail: `Payment ${payment.receiptNo}` } });
  return NextResponse.json(payment, { status: 201 });
}
