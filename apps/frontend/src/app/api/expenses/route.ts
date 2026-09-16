import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthEmail } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";
import { generateNanoCode } from "@/lib/id-generator";

export const GET = withTenant(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;
    const expenses = await db.expense.findMany({ where, orderBy: { date: "desc" } });
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    return NextResponse.json({ expenses, total, byCategory });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
});

export const POST = withTenant(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { category, description, amount, date, paymentMode, branchId } = body;
    if (!category || !amount) {
      return NextResponse.json({ error: "Category and amount are required" }, { status: 400 });
    }
    const expense = await db.expense.create({
      data: { category, description: description || "", amount: Number(amount), date: date ? new Date(date) : new Date(), paymentMode: paymentMode || "cash", branchId: branchId || null, code: generateNanoCode("EXP-") },
    });
    await db.auditLog.create({ data: { user: getAuthEmail(req), action: "CREATE", module: "Expense", detail: `Recorded expense ${expense.code}` } });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
});
