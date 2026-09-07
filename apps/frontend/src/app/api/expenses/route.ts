import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { nanoid } from "nanoid";

export const GET = withTenant(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  const expenses = await db.expense.findMany({ where, orderBy: { date: "desc" } });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  return NextResponse.json({ expenses, total, byCategory });
});

export const POST = withTenant(async (req: NextRequest) => {
  const body = await req.json();
  const count = await db.expense.count();
  const expense = await db.expense.create({
    data: { ...body, code: `EXP-${nanoid(8).toUpperCase()}`, date: new Date(body.date || new Date()) },
  });
  await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Expense", detail: `Recorded expense ${expense.code}` } });
  return NextResponse.json(expense, { status: 201 });
});
