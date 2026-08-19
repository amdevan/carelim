import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  return NextResponse.json({ expenses, total, byCategory });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await db.expense.count();
  const expense = await db.expense.create({
    data: { ...body, code: `EXP-${String(count + 1).padStart(5, "0")}`, date: new Date(body.date || new Date()) },
  });
  await db.auditLog.create({ data: { user: "system@medcore.health", action: "CREATE", module: "Expense", detail: `Recorded expense ${expense.code}` } });
  return NextResponse.json(expense, { status: 201 });
}
